import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "A valid text string is required." },
        { status: 400 }
      );
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: "ELEVENLABS_API_KEY is missing from .env.local" },
        { status: 500 }
      );
    }

    const elevenRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${DEFAULT_VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          output_format: "mp3_44100_128",
        }),
        cache: "no-store",
      }
    );

    if (!elevenRes.ok) {
      const textError = await elevenRes.text();
      throw new Error(`ElevenLabs TTS error: ${textError}`);
    }

    const arrayBuffer = await elevenRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": 'inline; filename="lyris-audio.mp3"',
      },
    });
  } catch (error) {
    console.error("ElevenLabs TTS route error:", error);

    const message =
      error instanceof Error ? error.message : "Unknown ElevenLabs TTS error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}