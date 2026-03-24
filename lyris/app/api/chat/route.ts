import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    console.log("KEY EXISTS:", !!process.env.ANTHROPIC_API_KEY);
    console.log("KEY START:", process.env.ANTHROPIC_API_KEY?.slice(0, 10));

    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Valid message is required." },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is missing from .env.local" },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      system:
        "You are Lyris, a chatbot that specializes in music and poetry. Help with lyrics, songwriting, poems, rhyme, themes, and creative writing.",
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    });

    const reply = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Claude API error:", error);
    return NextResponse.json(
      { error: "Failed to get response from Claude." },
      { status: 500 }
    );
  }
}