import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

const BARK_VERSION = "b76242b40d67c76ab6742e987628a2a9ac019e11d56ab96c4e91ce03b79b2787";

async function formatLyricsForBark(text: string): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const res = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 150,
    system: `Extract only the singable lyric lines from a chatbot response that contains a poem or song.

Rules:
- Remove ALL markdown: no **, *, #, _, ~, backticks
- Remove section labels: (Verse 1), (Hook), (Chorus), (Bridge), (Outro), *(Hook repeats)*, etc.
- Remove the song title
- Remove any conversational text, questions, or commentary from the assistant (anything that isn't a lyric line)
- Keep ALL actual lyric lines in their original order with their original words
- Blank line between sections is fine
- Output only the lyric lines, nothing else`,
    messages: [
      { role: "user", content: `Extract only the lyric lines:\n\n${text.slice(0, 2000)}` },
    ],
  });

  const result = res.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  if (!result) {
    // Fallback: strip markdown and section labels manually
    return text
      .split("\n")
      .map((l) => l.replace(/\*+|\[.*?\]|\(.*?\)|#+|_+/g, "").trim())
      .filter((l) => l.length > 0 && l.length < 120)
      .join("\n");
  }
  return result;
}

// POST — create prediction, return ID immediately
export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text is required." }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return new Response(JSON.stringify({ error: "REPLICATE_API_TOKEN is missing." }), {
        status: 500, headers: { "Content-Type": "application/json" },
      });
    }

    const formattedLyrics = await formatLyricsForBark(text);

    const createRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: BARK_VERSION,
        input: {
          prompt: formattedLyrics,
          text_temp: 0.7,
          waveform_temp: 0.7,
          history_prompt: "en_speaker_9",
        },
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      return new Response(JSON.stringify({ error: `Replicate error: ${err}` }), {
        status: createRes.status, headers: { "Content-Type": "application/json" },
      });
    }

    const prediction = await createRes.json();
    return new Response(JSON.stringify({ predictionId: prediction.id }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}

// GET — poll prediction status, proxy audio when ready
export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return new Response(JSON.stringify({ error: "id is required." }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}` },
  });

  const prediction = await pollRes.json();

  if (prediction.status === "failed") {
    return new Response(JSON.stringify({ status: "failed", error: prediction.error }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  if (prediction.status !== "succeeded") {
    return new Response(JSON.stringify({ status: prediction.status }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }

  // Proxy the audio back
  const audioUrl: string =
    prediction.output?.audio_out ??
    (Array.isArray(prediction.output) ? prediction.output[0] : prediction.output);

  const audioRes = await fetch(audioUrl);
  const audioBuffer = await audioRes.arrayBuffer();
  const contentType = audioRes.headers.get("Content-Type") ?? "audio/wav";

  return new Response(audioBuffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(audioBuffer.byteLength),
    },
  });
}
