"use client";

import { FormEvent, useMemo, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type SpotifyArtistResult = {
  id: string;
  name: string;
  image: string | null;
  spotifyUrl: string | null;
};

type SpotifyAlbumResult = {
  id: string;
  name: string;
  image: string | null;
  spotifyUrl: string | null;
};

type SpotifyTrackResult = {
  id: string;
  name: string;
  artistNames: string;
  image: string | null;
  spotifyUrl: string | null;
  previewUrl: string | null;
};

type SpotifyResults = {
  artists: SpotifyArtistResult[];
  albums: SpotifyAlbumResult[];
  tracks: SpotifyTrackResult[];
};

type ExampleCard = {
  title: string;
  category: string;
  prompt: string;
  art: string;
};

function svgToDataUri(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export default function Home() {
  const [input, setInput] = useState("");
  const [spotifyQuery, setSpotifyQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [spotifyResults, setSpotifyResults] = useState<SpotifyResults | null>(
    null
  );
  const [topArtists, setTopArtists] = useState<any[] | null>(null);
  const [topTracks, setTopTracks] = useState<any[] | null>(null);
  const [playlistLoading, setPlaylistLoading] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Yo, I’m Lyris. Bring me a lyric, a poem, a half-finished hook, a shaky idea, or a question about music theory and I’ll help you shape it into something sharper. What are you trying to make right now, and what do you want it to feel like?",
    },
  ]);

  const latestAssistantMessage = [...messages]
    .reverse()
    .find((msg) => msg.role === "assistant")?.content;

  const heroArt = useMemo(
    () =>
      svgToDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" width="700" height="440" viewBox="0 0 700 440">
          <defs>
            <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#09090b"/>
              <stop offset="55%" stop-color="#18181b"/>
              <stop offset="100%" stop-color="#0f172a"/>
            </linearGradient>
            <linearGradient id="glow" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#22d3ee"/>
              <stop offset="50%" stop-color="#a855f7"/>
              <stop offset="100%" stop-color="#f43f5e"/>
            </linearGradient>
          </defs>
          <rect width="700" height="440" rx="36" fill="url(#bg)"/>
          <circle cx="145" cy="140" r="82" fill="url(#glow)" opacity="0.18"/>
          <circle cx="585" cy="120" r="64" fill="#22d3ee" opacity="0.12"/>
          <rect x="62" y="82" width="210" height="274" rx="30" fill="#111827" stroke="#27272a"/>
          <rect x="304" y="98" width="330" height="44" rx="22" fill="#fafafa" opacity="0.96"/>
          <rect x="304" y="166" width="265" height="24" rx="12" fill="#d4d4d8" opacity="0.92"/>
          <rect x="304" y="208" width="292" height="24" rx="12" fill="#a1a1aa" opacity="0.75"/>
          <rect x="304" y="250" width="220" height="24" rx="12" fill="#71717a" opacity="0.7"/>
          <rect x="304" y="310" width="226" height="48" rx="24" fill="url(#glow)" opacity="0.94"/>
          <path d="M128 136 L205 122 L205 247 Q205 282 169 292 Q135 298 120 274 Q106 251 128 234 Q141 224 161 226 L161 160 L128 168 Z" fill="#f8fafc"/>
        </svg>
      `),
    []
  );

  const examples: ExampleCard[] = useMemo(
    () => [
      {
        title: "Informational Task",
        category: "Explain a concept",
        prompt:
          "What is a chord progression in simple terms, and why does it matter in songwriting?",
        art: svgToDataUri(
          `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" rx="24" fill="#111827"/><rect x="26" y="28" width="180" height="22" rx="11" fill="#fafafa"/></svg>`
        ),
      },
      {
        title: "Advice Task",
        category: "Personalized guidance",
        prompt:
          "I want to start writing emotional R&B songs, but my hooks never feel memorable. What should I practice first?",
        art: svgToDataUri(
          `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" rx="24" fill="#18181b"/><circle cx="76" cy="74" r="32" fill="#22d3ee"/></svg>`
        ),
      },
      {
        title: "Multi-Turn Reasoning",
        category: "Memory + follow-up",
        prompt:
          "I like writing poetry, but I want to turn it into lyrics without losing the original feeling.",
        art: svgToDataUri(
          `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" rx="24" fill="#0f172a"/><rect x="24" y="34" width="114" height="34" rx="14" fill="#fafafa"/></svg>`
        ),
      },
      {
        title: "Edge Case",
        category: "Clarify vague input",
        prompt:
          "Help me. I want to write something, but I do not know if it should be a poem, a hook, or a full song.",
        art: svgToDataUri(
          `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" rx="24" fill="#09090b"/><circle cx="78" cy="86" r="38" fill="#fafafa"/></svg>`
        ),
      },
      {
        title: "Out of Scope",
        category: "Refuse properly",
        prompt: "Can you tell me which stocks I should buy this month?",
        art: svgToDataUri(
          `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" rx="24" fill="#111827"/><circle cx="78" cy="80" r="34" fill="#fafafa"/></svg>`
        ),
      },
    ],
    []
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedInput = input.trim();
    if (!trimmedInput || loading) return;

    const userMessage: ChatMessage = { role: "user", content: trimmedInput };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed.");

      setMessages([
        ...updatedMessages,
        { role: "assistant", content: data.reply || "No reply returned." },
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong.";

      setMessages([
        ...updatedMessages,
        { role: "assistant", content: `Error: ${errorMessage}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSpotifySearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = spotifyQuery.trim();
    if (!trimmed || spotifyLoading) return;

    setSpotifyLoading(true);

    try {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Spotify search failed.");
      setSpotifyResults(data);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Spotify search failed.");
    } finally {
      setSpotifyLoading(false);
    }
  }

  async function handleReadAloud() {
    if (!latestAssistantMessage || audioLoading) return;

    setAudioLoading(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: latestAssistantMessage }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate audio.");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to generate audio.");
    } finally {
      setAudioLoading(false);
    }
  }

  async function loadTopItems(type: "artists" | "tracks") {
    try {
      const res = await fetch(`/api/spotify/me/top-items?type=${type}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load top items");

      if (type === "artists") setTopArtists(data.items ?? []);
      if (type === "tracks") setTopTracks(data.items ?? []);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to load top items");
    }
  }

  async function createPlaylistFromResults() {
    if (!spotifyResults?.tracks?.length) return;

    setPlaylistLoading(true);
    try {
      const uris = spotifyResults.tracks
        .slice(0, 5)
        .map((track) => `spotify:track:${track.id}`);

      const res = await fetch("/api/spotify/me/create-playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Lyris Picks",
          description: "Created from Lyris conversation results",
          uris,
          isPublic: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create playlist");

      if (data.external_urls?.spotify) {
        window.open(data.external_urls.spotify, "_blank");
      } else {
        alert("Playlist created.");
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to create playlist");
    } finally {
      setPlaylistLoading(false);
    }
  }

  function loadPrompt(prompt: string) {
    setInput(prompt);
  }

  return (
    <main className="page-shell">
      <div className="page-container">
        <section className="hero-panel">
          <div className="hero-copy">
            <div className="badge-row">
              <span className="badge-pill">Music Critic Insight</span>
              <span className="badge-pill">Interviewer Curiosity</span>
              <span className="badge-pill">Creative Mentor Energy</span>
            </div>

            <h1 className="hero-title">Lyris</h1>
            <p className="hero-subtitle">
              A designed conversational AI for music and poetry with real taste,
              real curiosity, Spotify-powered discovery, and expressive audio output.
            </p>

            <div className="persona-grid">
              <div className="persona-card">
                <h3>Personality</h3>
                <p>Sharp, expressive, curious, and thoughtful.</p>
              </div>
              <div className="persona-card">
                <h3>Spotify Layer</h3>
                <p>Search, artwork, embeds, top items, and playlist creation.</p>
              </div>
              <div className="persona-card">
                <h3>Audio Layer</h3>
                <p>Turn Lyris responses into spoken poem or lyric audio.</p>
              </div>
            </div>
          </div>

          <div className="hero-visual-wrap">
            <img src={heroArt} alt="Lyris visual identity" className="hero-visual" />
          </div>
        </section>

        <section className="examples-section">
          <div className="section-header">
            <div>
              <p className="section-kicker">Required Test Categories</p>
              <h2>Demo prompts built into the interface</h2>
            </div>
            <p className="section-note">Click any card to load a prompt.</p>
          </div>

          <div className="example-grid">
            {examples.map((example) => (
              <button
                key={example.title}
                type="button"
                onClick={() => loadPrompt(example.prompt)}
                className="example-card"
              >
                <img src={example.art} alt={example.title} className="example-art" />
                <div className="example-body">
                  <p className="example-category">{example.category}</p>
                  <h3>{example.title}</h3>
                  <p>{example.prompt}</p>
                  <span className="example-action">Load prompt</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="main-layout">
          <div className="chat-panel">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">Live Conversation</p>
                <h2>Talk to Lyris</h2>
              </div>
              <p className="panel-note">
                The bot should guide, critique, clarify, and adapt across turns.
              </p>
            </div>

            <div className="chat-window">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`chat-bubble ${
                    msg.role === "user" ? "user-bubble" : "assistant-bubble"
                  }`}
                >
                  <p className="bubble-label">
                    {msg.role === "user" ? "You" : "Lyris"}
                  </p>
                  <p>{msg.content}</p>
                </div>
              ))}

              {loading && (
                <div className="chat-bubble assistant-bubble">
                  <p className="bubble-label">Lyris</p>
                  <p>Thinking through the angle, the feeling, and the craft...</p>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="chat-form">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Bring a lyric, poem, hook, concept, or music question..."
                className="chat-input"
              />
              <button type="submit" disabled={loading} className="send-button">
                Send
              </button>
            </form>

            <div className="inline-actions">
              <button
                type="button"
                className="quick-prompt"
                onClick={handleReadAloud}
                disabled={!latestAssistantMessage || audioLoading}
              >
                {audioLoading ? "Generating audio..." : "Read latest reply aloud"}
              </button>
            </div>

            {audioUrl && (
              <div className="audio-player-wrap">
                <audio controls src={audioUrl} style={{ width: "100%" }} />
              </div>
            )}
          </div>

          <aside className="sidebar-stack">
            <div className="side-card">
              <p className="section-kicker">Spotify Personalization</p>
              <h3>Use your connected Spotify account</h3>
              <div className="inline-actions">
                <button
                  type="button"
                  className="quick-prompt"
                  onClick={() => loadTopItems("artists")}
                >
                  Load top artists
                </button>
                <button
                  type="button"
                  className="quick-prompt"
                  onClick={() => loadTopItems("tracks")}
                >
                  Load top tracks
                </button>
              </div>
            </div>

            <div className="side-card">
              <p className="section-kicker">Spotify Discovery</p>
              <h3>Search artists, albums, and tracks</h3>

              <form onSubmit={handleSpotifySearch} className="chat-form" style={{ marginTop: 14 }}>
                <input
                  type="text"
                  value={spotifyQuery}
                  onChange={(e) => setSpotifyQuery(e.target.value)}
                  placeholder="Search Spotify by mood, artist, song, or album..."
                  className="chat-input"
                />
                <button type="submit" className="send-button" disabled={spotifyLoading}>
                  {spotifyLoading ? "Searching..." : "Search"}
                </button>
              </form>

              <div className="inline-actions">
                <button
                  type="button"
                  className="quick-prompt"
                  onClick={createPlaylistFromResults}
                  disabled={playlistLoading || !spotifyResults?.tracks?.length}
                >
                  {playlistLoading ? "Creating playlist..." : "Create playlist from results"}
                </button>
              </div>
            </div>

            {topArtists && (
              <div className="side-card">
                <p className="section-kicker">Your top artists</p>
                <div style={{ display: "grid", gap: 12 }}>
                  {topArtists.slice(0, 5).map((artist: any) => (
                    <div key={artist.id} className="spotify-result-card">
                      {artist.images?.[0]?.url && (
                        <img
                          src={artist.images[0].url}
                          alt={artist.name}
                          className="spotify-result-image"
                        />
                      )}
                      <strong>{artist.name}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {topTracks && (
              <div className="side-card">
                <p className="section-kicker">Your top tracks</p>
                <div style={{ display: "grid", gap: 12 }}>
                  {topTracks.slice(0, 5).map((track: any) => (
                    <div key={track.id} className="spotify-result-card">
                      {track.album?.images?.[0]?.url && (
                        <img
                          src={track.album.images[0].url}
                          alt={track.name}
                          className="spotify-result-image"
                        />
                      )}
                      <strong>{track.name}</strong>
                      <p style={{ color: "#a1a1aa" }}>
                        {track.artists?.map((a: any) => a.name).join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {spotifyResults && (
              <div className="side-card">
                <p className="section-kicker">Spotify Results</p>
                <h3>Artwork, links, and embeds</h3>

                <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
                  {spotifyResults.tracks.slice(0, 3).map((track) => (
                    <div key={track.id} className="spotify-result-card">
                      {track.image && (
                        <img
                          src={track.image}
                          alt={track.name}
                          className="spotify-result-image"
                        />
                      )}

                      <strong>{track.name}</strong>
                      <p style={{ margin: "6px 0 10px", color: "#a1a1aa" }}>
                        {track.artistNames}
                      </p>

                      {track.spotifyUrl && (
                        <a
                          href={track.spotifyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="spotify-link"
                        >
                          Open on Spotify
                        </a>
                      )}

                      <iframe
                        src={`https://open.spotify.com/embed/track/${track.id}?utm_source=generator`}
                        width="100%"
                        height="152"
                        frameBorder="0"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        style={{ marginTop: 12, borderRadius: 12 }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="side-card">
              <p className="section-kicker">Project identity</p>
              <h3>What this version adds</h3>
              <ul>
                <li>Designed chatbot personality and refusal behavior</li>
                <li>Multi-turn memory across the current session</li>
                <li>Spotify search, artwork, embeds, top items, and playlists</li>
                <li>Spoken audio for poem or lyric output</li>
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}