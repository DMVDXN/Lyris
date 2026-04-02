import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const REPLICATE_API = "https://api.replicate.com/v1";

export async function POST(req: Request) {
  const { prompt } = await req.json();
  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt required" }, { status: 400 });
  }

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Replicate token not configured" }, { status: 500 });
  }

  const createRes = await fetch(
    `${REPLICATE_API}/models/black-forest-labs/flux-schnell/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Prefer": "wait=5",
      },
      body: JSON.stringify({
        input: {
          prompt: prompt.trim(),
          aspect_ratio: "1:1",
          output_format: "webp",
          num_outputs: 1,
          num_inference_steps: 4,
        },
      }),
    }
  );

  if (!createRes.ok) {
    console.error("Replicate image error:", await createRes.text());
    return NextResponse.json({ error: "Failed to start image generation" }, { status: createRes.status });
  }

  const prediction = await createRes.json();

  if (prediction.status === "succeeded") {
    const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    return NextResponse.json({ imageUrl });
  }

  return NextResponse.json({ predictionId: prediction.id });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const token = process.env.REPLICATE_API_TOKEN;
  const pollRes = await fetch(`${REPLICATE_API}/predictions/${id}`, {
    headers: { Authorization: `Bearer ${token ?? ""}` },
    cache: "no-store",
  });

  if (!pollRes.ok) {
    return NextResponse.json({ error: "Poll failed" }, { status: pollRes.status });
  }

  const data = await pollRes.json();

  if (data.status === "succeeded") {
    const imageUrl = Array.isArray(data.output) ? data.output[0] : data.output;
    return NextResponse.json({ status: "succeeded", imageUrl });
  }

  if (data.status === "failed") {
    return NextResponse.json({ status: "failed", error: data.error || "Generation failed" });
  }

  return NextResponse.json({ status: data.status });
}
