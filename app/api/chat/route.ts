import { NextRequest } from "next/server";
import { webSearch, formatSearchResults } from "@/lib/search";

export async function POST(request: NextRequest) {
  try {
    const { messages, settings } = await request.json();

    const apiKey = process.env.OPENCODE_API_KEY;
    if (!apiKey || apiKey === "your-api-key-here") {
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
            content: searchContext + "\n\nUser question: " + enhancedMessages[lastIdx].content + "\n\nBased on the web search results above, please answer the user's question.",
          };
        }
      }
    }

    const response = await fetch("https://opencode.ai/zen/v1/chat/completions", {
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
      return new Response(
        JSON.stringify({ error: "Something went wrong. Please try again later." }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n").filter((line) => line.trim() !== "");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  break;
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
            }
          }
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
