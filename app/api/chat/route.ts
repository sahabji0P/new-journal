import { getSystemPrompt } from "@/lib/ai/portfolio-rag"

// Simple streaming chat endpoint
// Uses fetch to call an AI API, or returns a helpful fallback
export async function POST(request: Request) {
  const { messages } = (await request.json()) as {
    messages: { role: string; content: string }[]
  }
  const systemPrompt = getSystemPrompt()

  // Check if an AI API key is available
  const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    // Fallback: simple keyword-based response using the portfolio context
    // This ensures the chat works even without an API key
    const lastMessage = messages[messages.length - 1]?.content || ""
    const response = generateFallbackResponse(lastMessage, systemPrompt)

    return new Response(JSON.stringify({ role: "assistant", content: response }), {
      headers: { "Content-Type": "application/json" },
    })
  }

  // If OpenAI key is available, use it for real AI responses
  if (process.env.OPENAI_API_KEY) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    })

    // Forward the stream
    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  }

  // Anthropic fallback
  if (process.env.ANTHROPIC_API_KEY) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 500,
        system: systemPrompt,
        messages: messages.map((m: { role: string; content: string }) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
        })),
      }),
    })

    const data = await response.json()
    const content =
      data.content?.[0]?.text || "I'm having trouble responding right now."

    return new Response(JSON.stringify({ role: "assistant", content }), {
      headers: { "Content-Type": "application/json" },
    })
  }

  return new Response(
    JSON.stringify({
      role: "assistant",
      content: "Chat is not configured yet. Please set up an AI API key.",
    }),
    { headers: { "Content-Type": "application/json" } }
  )
}

function generateFallbackResponse(query: string, context: string): string {
  const q = query.toLowerCase()

  if (q.includes("project") || q.includes("build") || q.includes("built")) {
    // Extract project names from context
    const projectMatches = context.match(/### (.*?)\n/g)?.slice(0, 5) || []
    const names = projectMatches
      .map((m) => m.replace("### ", "").trim())
      .filter((n) => n.length < 40)
    if (names.length > 0) {
      return `Shashwat has built several projects including: ${names.join(", ")}. Ask me about any specific one for more details!`
    }
  }

  if (q.includes("skill") || q.includes("tech") || q.includes("stack")) {
    return "Shashwat works with Python, PyTorch, FastAPI, React, Next.js, and TypeScript. His expertise spans AI/ML, backend systems, and full-stack development. Want to know more about a specific area?"
  }

  if (q.includes("experience") || q.includes("work") || q.includes("role")) {
    return "Shashwat has experience in AI/ML engineering and software development. Check the experience section for detailed roles and responsibilities!"
  }

  if (
    q.includes("research") ||
    q.includes("paper") ||
    q.includes("publication")
  ) {
    return "Shashwat has published research in areas like brain tumor classification, multimodal retrieval systems, and transformer attention efficiency. Ask about any specific paper!"
  }

  if (
    q.includes("contact") ||
    q.includes("hire") ||
    q.includes("email")
  ) {
    return "You can reach Shashwat through GitHub (@sahabji0P), Twitter (@itsshashwatj), or LinkedIn. He's open to collaborations!"
  }

  return "I'm Shashwat's portfolio assistant! I can tell you about his projects, skills, experience, and research. What would you like to know? (Note: For full AI responses, an API key needs to be configured.)"
}
