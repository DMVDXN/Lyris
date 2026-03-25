import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "A valid messages array is required." },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is missing from .env.local" },
        { status: 500 }
      );
    }

    const formattedMessages = messages
      .filter(
        (msg: ChatMessage) =>
          msg &&
          (msg.role === "user" || msg.role === "assistant") &&
          typeof msg.content === "string" &&
          msg.content.trim() !== ""
      )
      .map((msg: ChatMessage) => ({
        role: msg.role,
        content: msg.content,
      }));

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system:
        "You are Lyris, a chatbot that specializes in music and poetry. Remember the user's earlier messages in the current conversation and respond with continuity. Help with lyrics, songwriting, poems, rhyme, themes, creative writing, chord ideas, song structure, and music theory.",
      messages: formattedMessages,
    });

    const reply = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Claude API error:", error);

    const message =
      error instanceof Error ? error.message : "Unknown server error";

    return NextResponse.json(
      { error: `Failed to get response from Claude: ${message}` },
      { status: 500 }
    );
  }
}