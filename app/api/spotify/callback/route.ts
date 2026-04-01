import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.redirect("http://127.0.0.1:3000?spotifyAuth=success");
}