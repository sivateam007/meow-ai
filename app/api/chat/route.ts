import { NextRequest } from "next/server";
import { getSessionUser, isUserRevoked } from "@/lib/auth";
import { webSearch, formatSearchResults } from "@/lib/search";
import { rateLimit } from "@/lib/ratelimit";
import { isAdmin } from "@/lib/admin";
import { SYSTEM_PROMPT } from "@/lib/constants";
import { AVAILABLE_MODELS, DEFAULT_SETTINGS, getModelById } from "@/lib/types";

interface ApiAttachment {
  name: string;
  type: string;
  content?: string;
}

interface ApiMessage {
  role: string;
  content: string;
  attachments?: ApiAttachment[];
}

// ~6k tokens of conversation context sent upstream per request.
const CONTEXT_CHAR_BUDGET = 24000;
const ATTACHMENT_CHAR_CAP = 8000;
const SEARCH_CONTEXT_CAP = 2000;
const MAX_FALLBACK_RETRIES = 4;
const FALLBACK_DELAY_MS = 300;

const DEFAULT_MODEL = DEFAULT_SETTINGS.model;

/**
 * The fallback chain mirrors the roster in `lib/types.ts` exactly.
 *
 * Deriving it rather than repeating the ids keeps the two in step: a model that
 * is removed from the roster is automatically removed from the fallback chain,
 * so a retired id can never consume a retry returning 404.
 */
const FALLBACK_MODELS = AVAILABLE_MODELS.map((m) => m.id);

/**
 * Models that speak the Responses API rather than Chat Completions.
 *
 * Empty while the provider is OpenRouter, whose free tier is uniformly
 * Chat Completions. Kept as a mechanism rather than deleted because every
 * other provider this app has used has mixed the two, and the stream parser
 * below is already written for both shapes.
 */
const RESPONSES_ENDPOINT_MODELS = new Set<string>();

const modelBlacklist = new Map<string, number>();

/**
 * The most recent upstream failure, kept across requests.
 *
 * Every candidate can be parked at once: a 403 blacklists a model for five
 * minutes, so a repeat message finds nothing left to try. Without remembering
 * why they were parked, that request would report the loop counter's untouched
 * default and tell the user "provider error", which is both wrong and a waste
 * of a debugging session.
 */
let lastKnownFailure: { error: string; status: number } | null = null;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function isModelBlacklisted(modelId: string): boolean {
  const until = modelBlacklist.get(modelId);
  if (!until) return false;
  if (Date.now() > until) {
    modelBlacklist.delete(modelId);
    return false;
  }
  return true;
}

function blacklistModel(modelId: string, seconds: number): void {
  const until = Date.now() + seconds * 1000;
  const existing = modelBlacklist.get(modelId);
  if (!existing || until > existing) {
    modelBlacklist.set(modelId, until);
  }
}

function friendlyError(rawMessage: string, status: number): string {
  // A 401 is an access-key problem, not a quota problem. Conflating the two
  // sends the operator hunting through billing pages when the actual fix is a
  // rotated, mistyped or still-unset key — which is exactly the mistake this
  // message caused when the provider was switched.
  if (status === 401) {
    return "The AI provider rejected our access key — it may have been rotated, revoked, or not set yet.";
  }

  if (status === 403) {
    return "The AI provider is refusing requests right now — its free quota may be used up. Please try again later.";
  }

  if (status === 402) {
    return "The AI provider requires payment for this model. Please try again later.";
  }

  const m = (rawMessage || "").toLowerCase();

  if (status === 429 || /rate.?limit|too many request/.test(m)) {
    return "Rate limited. Please try again in a moment.";
  }

  if (status >= 500) {
    return "Provider error. Please try again.";
  }

  return "An error occurred. Please try again.";
}

function isRetryable(status: number, message: string): boolean {
  if (status === 429) return true;
  if (status === 404) return true;
  // The provider refuses most free models at the account level; move on to the
  // next cat rather than failing the message outright.
  if (status === 403) return true;
  // Retired model id.
  if (status === 410) return true;
  if (status >= 500) return true;
  const m = (message || "").toLowerCase();
  if (/rate.?limit|unavailable|not found|not supported|too many/i.test(m)) return true;
  return false;
}

function buildApiMessages(messages: ApiMessage[], modelId: string): {
  finalMessages: { role: string; content: string }[];
} {
  const nonSystem = messages.filter((m) => m.role !== "system");

  let lastUserIdx = -1;
  for (let i = nonSystem.length - 1; i >= 0; i--) {
    if (nonSystem[i].role === "user") {
      lastUserIdx = i;
      break;
    }
  }

  const rendered = nonSystem.map((m, i) => {
    let content = m.content || "";
    const atts = m.attachments || [];
    if (atts.length > 0) {
      const parts = atts.map((a) => {
        if ((a.type || "").startsWith("image/")) {
          return `[Image attached: ${a.name}]`;
        }
        if (i === lastUserIdx && typeof a.content === "string" && a.content) {
          return `[File attached: ${a.name}]\n\`\`\`\n${a.content.substring(0, ATTACHMENT_CHAR_CAP)}\n\`\`\``;
        }
        return `[File attached earlier: ${a.name}]`;
      });
      content = `${content}\n\n${parts.join("\n\n")}`;
    }
    return { role: m.role, content };
  });

  const kept: { role: string; content: string }[] = [];
  let budget = CONTEXT_CHAR_BUDGET;
  for (let i = rendered.length - 1; i >= 0; i--) {
    const cost = rendered[i].content.length;
    if (i === rendered.length - 1 || cost <= budget) {
      kept.unshift(rendered[i]);
      budget -= cost;
    } else {
      break;
    }
  }

  const cat = getModelById(modelId);
  const personalityPrompt = `${SYSTEM_PROMPT}\n\nYOUR CAT PERSONA: You are ${cat.name} (${cat.personality}) — let this personality lightly influence your tone and style while always staying the helpful assistant "Meow AI" described above.`;

  const finalMessages = [{ role: "system", content: personalityPrompt }, ...kept];
  return { finalMessages };
}

function buildUpstreamBody(
  modelId: string,
  finalMessages: { role: string; content: string }[],
  temperature: number,
  maxTokens: number
): { url: string; body: Record<string, unknown> } {
  const isResponses = RESPONSES_ENDPOINT_MODELS.has(modelId);

  if (isResponses) {
    const systemMsg = finalMessages.find((m) => m.role === "system");
    const userMsgs = finalMessages.filter((m) => m.role === "user");
    const lastUserContent = userMsgs.length > 0 ? userMsgs[userMsgs.length - 1].content : "";
    return {
      url: process.env.MEOW_AI_API_URL!.replace("/chat/completions", "/responses"),
      body: {
        model: modelId,
        instructions: systemMsg?.content || "",
        input: lastUserContent,
        stream: true,
      },
    };
  }

  return {
    url: process.env.MEOW_AI_API_URL!,
    body: {
      model: modelId,
      messages: finalMessages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    },
  };
}

async function tryFetchModel(
  modelId: string,
  apiKey: string,
  finalMessages: { role: string; content: string }[],
  temperature: number,
  maxTokens: number
): Promise<{ response: Response; modelId: string } | { error: string; status: number }> {
  const { url, body } = buildUpstreamBody(modelId, finalMessages, temperature, maxTokens);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = "Something went wrong.";
    try {
      const errBody = await response.json();
      if (errBody?.error?.message) message = errBody.error.message;
      else if (typeof errBody?.error === "string") message = errBody.error;
      else if (errBody?.message) message = errBody.message;
    } catch {
      // ignore
    }
    if (response.status === 429) blacklistModel(modelId, 60);
    else if (response.status >= 500 || /unavailable|not found/i.test(message)) blacklistModel(modelId, 30);
    // A refusal or a retired id is an account/catalog problem that will not fix
    // itself in seconds. Park the model so the next message goes straight to a
    // cat that works instead of re-testing the dead ones first.
    else if (response.status === 403 || response.status === 410) blacklistModel(modelId, 300);
    lastKnownFailure = { error: message, status: response.status };
    return { error: message, status: response.status };
  }

  return { response, modelId };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const revoked = await isUserRevoked(session.email);
    if (revoked) {
      return new Response(
        JSON.stringify({ error: "Access revoked" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const admin = await isAdmin(session.email);
    if (!admin && !rateLimit(`chat:${session.email.toLowerCase()}`)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please wait and try again later." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    const { messages, settings } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 100) {
      return new Response(
        JSON.stringify({ error: "Invalid messages" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = process.env.MEOW_AI_API_KEY;
    const apiUrl = process.env.MEOW_AI_API_URL;
    if (!apiKey || apiKey === "your-api-key-here" || !apiUrl) {
      return new Response(
        JSON.stringify({ error: "Service is not configured yet. Please contact support." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    let workingMessages: ApiMessage[] = messages;
    let usedSources: { title: string; url: string }[] = [];

    if (settings?.webSearch) {
      const lastUserMsg = [...workingMessages].reverse().find((m: ApiMessage) => m.role === "user");
      if (lastUserMsg) {
        const results = await webSearch(lastUserMsg.content);
        const searchContext = formatSearchResults(results);
        usedSources = results.map((r) => ({ title: r.title, url: r.url }));
        if (searchContext) {
          workingMessages = [...workingMessages];
          const lastIdx = workingMessages.length - 1;
          workingMessages[lastIdx] = {
            ...workingMessages[lastIdx],
            content:
              searchContext.substring(0, SEARCH_CONTEXT_CAP) +
              "\n\nUser question: " +
              workingMessages[lastIdx].content,
          };
        }
      }
    }

    const { finalMessages } = buildApiMessages(workingMessages, settings?.model || DEFAULT_MODEL);
    const temperature = Math.min(2, Math.max(0, settings?.temperature ?? 0.7));
    const maxTokens = Math.min(8192, Math.max(1, settings?.maxTokens ?? 2048));
    const requestedModel = settings?.model || DEFAULT_MODEL;

    const allowedModels = new Set(FALLBACK_MODELS);
    if (!allowedModels.has(requestedModel)) {
      return new Response(
        JSON.stringify({ error: "Invalid model" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const modelOrder = [
      requestedModel,
      ...FALLBACK_MODELS.filter((m) => m !== requestedModel),
    ];

    let lastError = "";
    let lastStatus = 500;
    let successResponse: Response | null = null;
    let usedModel = requestedModel;
    let attempted = 0;

    for (let attempt = 0; attempt < Math.min(modelOrder.length, MAX_FALLBACK_RETRIES + 1); attempt++) {
      const model = modelOrder[attempt];

      if (isModelBlacklisted(model)) continue;

      attempted++;
      usedModel = model;

      if (attempt > 0) await sleep(FALLBACK_DELAY_MS);

      const result = await tryFetchModel(model, apiKey, finalMessages, temperature, maxTokens);

      if ("response" in result) {
        successResponse = result.response;
        break;
      }

      lastError = result.error;
      lastStatus = result.status;

      if (!isRetryable(result.status, result.error)) {
        break;
      }
    }

    if (!successResponse) {
      // Nothing was tried because every cat is parked. Surface the real reason
      // they were parked rather than the untouched 500 default.
      if (attempted === 0 && lastKnownFailure) {
        lastError = lastKnownFailure.error;
        lastStatus = lastKnownFailure.status;
      }
      const msg = friendlyError(lastError, lastStatus);
      return new Response(
        JSON.stringify({ error: msg }),
        { status: lastStatus, headers: { "Content-Type": "application/json" } }
      );
    }

    const isMuseSpark = RESPONSES_ENDPOINT_MODELS.has(usedModel);
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = "";
    let completionChars = 0;
    let upstreamUsage: { promptTokens?: number; completionTokens?: number } | null = null;

    const stream = new ReadableStream({
      async start(controller) {
        const reader = successResponse!.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ model: usedModel })}\n\n`)
        );

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ sources: usedSources })}\n\n`)
        );

        const processEvent = (event: string) => {
          const lines = event.split("\n").filter((l) => l.trim() !== "");
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") {
              const promptTokens =
                upstreamUsage?.promptTokens ?? estimateTokens(
                  finalMessages.reduce((s, m) => s + m.content.length, "")
                );
              const completionTokens =
                upstreamUsage?.completionTokens ?? estimateTokens(
                  String(completionChars)
                );
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    usage: { promptTokens, completionTokens },
                  })}\n\n`
                )
              );
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              return true;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.usage) {
                upstreamUsage = {
                  promptTokens: parsed.usage.prompt_tokens ?? parsed.usage.promptTokens,
                  completionTokens:
                    parsed.usage.completion_tokens ?? parsed.usage.completionTokens,
                };
                continue;
              }
              if (isMuseSpark) {
                if (parsed.type === "response.output_text.delta" && parsed.delta) {
                  completionChars += parsed.delta.length;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content: parsed.delta })}\n\n`)
                  );
                }
                if (parsed.type === "response.completed" || parsed.type === "response.done") {
                  const promptTokens =
                    upstreamUsage?.promptTokens ?? estimateTokens(
                      finalMessages.reduce((s: string, m: ApiMessage) => s + m.content.length, "")
                    );
                  const completionTokens =
                    upstreamUsage?.completionTokens ?? estimateTokens(String(completionChars));
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ usage: { promptTokens, completionTokens } })}\n\n`
                    )
                  );
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  return true;
                }
              } else {
                const reasoning = parsed.choices?.[0]?.delta?.reasoning_content;
                if (reasoning) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ thinking: reasoning })}\n\n`)
                  );
                }
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  completionChars += content.length;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                  );
                }
              }
            } catch {
              // skip malformed chunks
            }
          }
          return false;
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            let boundary = buffer.indexOf("\n\n");
            while (boundary !== -1) {
              const event = buffer.slice(0, boundary);
              buffer = buffer.slice(boundary + 2);
              if (processEvent(event)) break;
              boundary = buffer.indexOf("\n\n");
            }
          }
          buffer += decoder.decode();
          if (buffer.trim() !== "") processEvent(buffer);
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
