import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { webSearch, formatSearchResults } from "@/lib/search";
import { rateLimit } from "@/lib/ratelimit";
import { isAdmin } from "@/lib/admin";
import { SYSTEM_PROMPT } from "@/lib/constants";

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

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function friendlyError(rawMessage: string, status: number): string {
  const m = (rawMessage || "").toLowerCase();

  if (status === 401 || status === 403 || /unauthorized|forbidden|invalid.*key|api.?key/.test(m)) {
    return "API key issue — please check that MEOW_AI_API_KEY is set correctly on Render.";
  }

  if (status === 404 || /model.*(not found|unavailable|not supported)/i.test(m)) {
    const modelHint = rawMessage.length > 120 ? rawMessage.substring(0, 120) + "..." : rawMessage;
    return `Model error: ${modelHint}`;
  }

  if (status === 429 || /rate.?limit|too many request/.test(m)) {
    return "Rate limited by provider. Please wait a moment and try again.";
  }

  if (status >= 500) {
    return `Provider error (${status}): ${rawMessage.substring(0, 150)}`;
  }

  return rawMessage;
}

/**
 * Builds the upstream message array:
 * - Injects attachment contents ONLY for the newest user message;
 *   older attachments collapse to lightweight "[file attached earlier]" references.
 * - Windows history to CONTEXT_CHAR_BUDGET chars (newest-first), so long chats
 *   stop growing token cost quadratically.
 * - Prepends the system prompt.
 */
function buildApiMessages(messages: ApiMessage[]): {
  finalMessages: { role: string; content: string }[];
  inputChars: number;
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

  const finalMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...kept];
  const inputChars = finalMessages.reduce((sum, m) => sum + m.content.length, 0);
  return { finalMessages, inputChars };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const admin = await isAdmin(session.user.email);
    if (!admin && !rateLimit(`chat:${session.user.email.toLowerCase()}`)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please wait and try again later." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    const { messages, settings } = await request.json();

    const apiKey = process.env.MEOW_AI_API_KEY;
    const apiUrl = process.env.MEOW_AI_API_URL;
    if (!apiKey || apiKey === "your-api-key-here" || !apiUrl) {
      return new Response(
        JSON.stringify({ error: "Service is not configured yet. Please contact support." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    let workingMessages: ApiMessage[] = Array.isArray(messages) ? messages : [];

    if (settings?.webSearch) {
      const lastUserMsg = [...workingMessages].reverse().find((m: ApiMessage) => m.role === "user");
      if (lastUserMsg) {
        const results = await webSearch(lastUserMsg.content);
        const searchContext = formatSearchResults(results);
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

    const { finalMessages, inputChars } = buildApiMessages(workingMessages);

    const modelId = settings?.model || "big-pickle";
    const isMuseSpark = modelId === "muse-spark-1.2-contributor-free";

    let upstreamUrl = apiUrl;
    let upstreamBody: Record<string, unknown>;

    if (isMuseSpark) {
      upstreamUrl = apiUrl.replace("/chat/completions", "/responses");
      const systemMsg = finalMessages.find((m: ApiMessage) => m.role === "system");
      const userMsgs = finalMessages.filter((m: ApiMessage) => m.role === "user");
      const lastUserContent = userMsgs.length > 0 ? userMsgs[userMsgs.length - 1].content : "";
      upstreamBody = {
        model: modelId,
        instructions: systemMsg?.content || "",
        input: lastUserContent,
        stream: true,
      };
    } else {
      upstreamBody = {
        model: modelId,
        messages: finalMessages,
        temperature: settings?.temperature ?? 0.7,
        max_tokens: settings?.maxTokens ?? 2048,
        stream: true,
      };
    }

    const response = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(upstreamBody),
    });

    if (!response.ok) {
      let message = "Something went wrong. Please try again later.";
      try {
        const errBody = await response.json();
        if (errBody?.error?.message) message = errBody.error.message;
        else if (typeof errBody?.error === "string") message = errBody.error;
        else if (errBody?.message) message = errBody.message;
      } catch {
        // ignore unparsable error bodies
      }
      message = friendlyError(message, response.status);
      if (message.length > 300) message = message.substring(0, 300) + "...";
      return new Response(
        JSON.stringify({ error: message }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = "";
    let completionChars = 0;
    let upstreamUsage: { promptTokens?: number; completionTokens?: number } | null = null;

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

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
