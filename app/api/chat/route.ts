import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { webSearch, formatSearchResults } from "@/lib/search";
import { rateLimit } from "@/lib/ratelimit";
import { isAdmin } from "@/lib/admin";

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

    let enhancedMessages = messages;

    if (settings?.webSearch) {
      const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === "user");
      if (lastUserMsg) {
        const results = await webSearch(lastUserMsg.content);
        const searchContext = formatSearchResults(results);
        if (searchContext) {
          enhancedMessages = [...messages];
          const lastIdx = enhancedMessages.length - 1;
          enhancedMessages[lastIdx] = {
            ...enhancedMessages[lastIdx],
            content: searchContext + "\n\nUser question: " + enhancedMessages[lastIdx].content,
          };
        }
      }
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: settings?.model || "big-pickle",
        messages: enhancedMessages,
        temperature: settings?.temperature ?? 0.7,
        max_tokens: settings?.maxTokens ?? 2048,
        stream: true,
      }),
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
      if (message.length > 300) message = message.substring(0, 300) + "...";
      return new Response(
        JSON.stringify({ error: message }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = "";

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
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              return true;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                );
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
