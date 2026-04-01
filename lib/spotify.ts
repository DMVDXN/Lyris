import { cookies } from "next/headers";

export const SPOTIFY_SCOPES = [
  "user-top-read",
  "playlist-modify-public",
  "playlist-modify-private",
  "playlist-read-private",
].join(" ");

export function getSpotifyBasicAuth() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Spotify credentials in .env.local");
  }

  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

export async function getSpotifyAppAccessToken() {
  const basic = getSpotifyBasicAuth();

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify app token error: ${text}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

export async function refreshSpotifyUserAccessToken() {
  const cookieStore = await cookies();

  const refreshToken =
    process.env.SPOTIFY_REFRESH_TOKEN ||
    cookieStore.get("spotify_refresh_token")?.value;

  if (!refreshToken) {
    throw new Error("No Spotify refresh token found");
  }

  const basic = getSpotifyBasicAuth();

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify refresh token error: ${text}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

export async function getSpotifyUserAccessToken() {
  return refreshSpotifyUserAccessToken();
}

export async function spotifyFetch(
  url: string,
  init?: RequestInit,
  userToken = false
) {
  const token = userToken
    ? await getSpotifyUserAccessToken()
    : await getSpotifyAppAccessToken();

  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}