"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type ChatImage = {
  title: string;
  link: string;
  source: string;
  imageUrl: string;
  thumbnail: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  images?: ChatImage[];
  imageQuery?: string;
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

type SpotifyApiArtist = {
  id: string;
  name: string;
  images?: { url: string }[];
};

type SpotifyApiTrack = {
  id: string;
  name: string;
  album?: { images?: { url: string }[] };
  artists?: { name: string }[];
};

export default function Home() {
  const [input, setInput] = useState("");
  const [spotifyQuery, setSpotifyQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [songLoading, setSongLoading] = useState(false);
  const [songUrl, setSongUrl] = useState<string | null>(null);
  const [songStatus, setSongStatus] = useState("");
  const [spotifyResults, setSpotifyResults] = useState<SpotifyResults | null>(null);
  const [topArtists, setTopArtists] = useState<SpotifyApiArtist[] | null>(null);
  const [topTracks, setTopTracks] = useState<SpotifyApiTrack[] | null>(null);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("spotifyAuth");
    if (auth === "success") {
      setSpotifyConnected(true);
      // clean up the URL
      const clean = window.location.pathname;
      window.history.replaceState({}, "", clean);
    } else if (auth === "denied" || auth === "error") {
      alert("Spotify connection failed. Please try again.");
      const clean = window.location.pathname;
      window.history.replaceState({}, "", clean);
    }
  }, []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Yo, I'm Lyris. Bring me a lyric, a poem, a half-finished hook, a shaky idea, or a question about music theory and I'll help you shape it into something sharper. What are you trying to make right now, and what do you want it to feel like?",
    },
  ]);

  const latestAssistantMessage = [...messages]
    .reverse()
    .find((msg) => msg.role === "assistant")?.content;

  function toggleListening() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Speech recognition is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (e: { results: { [key: number]: { [key: number]: { transcript: string } } }; resultIndex: number }) => {
      const transcript = e.results[e.resultIndex][0].transcript;
      setInput((prev) => {
        const updated = prev ? prev + " " + transcript : transcript;
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
          }
        }, 0);
        return updated;
      });
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.closest("form");
      if (form) form.requestSubmit();
    }
  }

  function resetTextarea() {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedInput = input.trim();
    if (!trimmedInput || loading) return;

    const userMessage: ChatMessage = { role: "user", content: trimmedInput };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    resetTextarea();
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
        {
          role: "assistant",
          content: data.reply || "No reply returned.",
          images: Array.isArray(data.images) ? data.images : [],
          imageQuery: typeof data.imageQuery === "string" ? data.imageQuery : "",
        },
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

  async function handleGenerateSong() {
    if (!latestAssistantMessage || songLoading) return;
    setSongLoading(true);
    setSongUrl(null);
    setSongStatus("Formatting lyrics...");
    try {
      // Step 1: create prediction
      const createRes = await fetch("/api/generate-song", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: latestAssistantMessage }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || "Failed to start generation.");

      const { predictionId } = createData;
      setSongStatus("Generating — this takes ~60s...");

      // Step 2: poll until done
      const start = Date.now();
      while (Date.now() - start < 600000) {
        await new Promise((r) => setTimeout(r, 3000));
        const pollRes = await fetch(`/api/generate-song?id=${predictionId}`);

        if (pollRes.headers.get("Content-Type")?.includes("audio")) {
          const blob = await pollRes.blob();
          setSongUrl(URL.createObjectURL(blob));
          setSongStatus("");
          return;
        }

        const pollData = await pollRes.json();
        if (pollData.status === "failed") throw new Error(pollData.error || "Generation failed.");
        setSongStatus(`${pollData.status === "processing" ? "Singing" : "Starting up"}...`);
      }

      throw new Error("Timed out waiting for song.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to generate song.");
      setSongStatus("");
    } finally {
      setSongLoading(false);
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

  return (
    <main className="page-shell">
      <div className="page-container">
        <section className="main-layout">
          <div className="chat-panel">
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

                  {msg.role === "assistant" &&
                    msg.imageQuery &&
                    msg.images &&
                    msg.images.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <p style={{ fontSize: "0.8rem", color: "#a1a1aa", marginBottom: 10 }}>
                          Visual search: {msg.imageQuery}
                        </p>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                            gap: 12,
                          }}
                        >
                          {msg.images.map((image, imageIndex) => (
                            <a
                              key={`${index}-${imageIndex}`}
                              href={image.link}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: "block",
                                textDecoration: "none",
                                background: "#111827",
                                border: "1px solid #27272a",
                                borderRadius: 16,
                                overflow: "hidden",
                              }}
                            >
                              <img
                                src={image.imageUrl || image.thumbnail}
                                alt={image.title}
                                style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }}
                              />
                              <div style={{ padding: 10 }}>
                                <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600, color: "#fafafa" }}>
                                  {image.title}
                                </p>
                                {image.source && (
                                  <p style={{ margin: "6px 0 0", fontSize: "0.8rem", color: "#a1a1aa" }}>
                                    {image.source}
                                  </p>
                                )}
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              ))}

              {loading && (
                <div className="chat-bubble assistant-bubble">
                  <p className="bubble-label">Lyris</p>
                  <p>Thinking...</p>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="chat-form">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder="Lyric, poem, hook, or question... (Shift+Enter for new line)"
                className="chat-input"
                rows={1}
              />
              <button
                type="button"
                onClick={toggleListening}
                className={`mic-button${isListening ? " mic-active" : ""}`}
                title={isListening ? "Stop listening" : "Speak"}
              >
                {isListening ? "⏹" : "🎤"}
              </button>
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
                {audioLoading ? "Generating..." : "Read aloud"}
              </button>
              <button
                type="button"
                className="quick-prompt suno-btn"
                onClick={handleGenerateSong}
                disabled={!latestAssistantMessage || songLoading}
              >
                {songLoading ? (songStatus || "Starting...") : "Generate song"}
              </button>
            </div>

            {audioUrl && (
              <div className="audio-player-wrap">
                <p className="audio-player-label">Voice</p>
                <audio controls src={audioUrl} style={{ width: "100%" }} />
              </div>
            )}

            {songUrl && (
              <div className="audio-player-wrap">
                <p className="audio-player-label">Generated song</p>
                <audio controls src={songUrl} style={{ width: "100%" }} />
              </div>
            )}
          </div>

        </section>

        <section className="spotify-section">
          <div className="spotify-controls">
            {spotifyConnected ? (
              <span className="sp-connected-badge">Spotify connected</span>
            ) : (
              <a href="/api/spotify/login" className="sp-ctrl-btn sp-connect-btn">
                Connect Spotify
              </a>
            )}
            <button type="button" className="sp-ctrl-btn" onClick={() => loadTopItems("artists")}>
              Top artists
            </button>
            <button type="button" className="sp-ctrl-btn" onClick={() => loadTopItems("tracks")}>
              Top tracks
            </button>
            <form onSubmit={handleSpotifySearch} className="sp-search-form">
              <input
                type="text"
                value={spotifyQuery}
                onChange={(e) => setSpotifyQuery(e.target.value)}
                placeholder="Search artist, song, or album..."
                className="sp-search-input"
              />
              <button type="submit" className="sp-search-btn" disabled={spotifyLoading}>
                {spotifyLoading ? "..." : "Search"}
              </button>
            </form>
            {spotifyResults?.tracks?.length ? (
              <button
                type="button"
                className="sp-ctrl-btn"
                onClick={createPlaylistFromResults}
                disabled={playlistLoading}
              >
                {playlistLoading ? "Creating..." : "Create playlist"}
              </button>
            ) : null}
          </div>

          {topArtists && (
            <div className="netflix-row">
              <div className="netflix-row-header">
                <p className="netflix-row-label">Top Artists</p>
                <button type="button" className="netflix-close" onClick={() => setTopArtists(null)} title="Close">✕</button>
              </div>
              <div className="netflix-scroll">
                  {topArtists.map((artist) => (
                    <div key={artist.id} className="netflix-card">
                      {artist.images?.[0]?.url ? (
                        <img src={artist.images[0].url} alt={artist.name} className="netflix-card-img" />
                      ) : (
                        <div className="netflix-card-placeholder" />
                      )}
                      <p className="netflix-card-title">{artist.name}</p>
                    </div>
                  ))}
                </div>
            </div>
          )}

          {topTracks && (
            <div className="netflix-row">
              <div className="netflix-row-header">
                <p className="netflix-row-label">Top Tracks</p>
                <button type="button" className="netflix-close" onClick={() => setTopTracks(null)} title="Close">✕</button>
              </div>
              <div className="netflix-scroll">
                {topTracks.map((track) => (
                  <div key={track.id} className="netflix-card">
                    {track.album?.images?.[0]?.url ? (
                      <img src={track.album.images[0].url} alt={track.name} className="netflix-card-img" />
                    ) : (
                      <div className="netflix-card-placeholder" />
                    )}
                    <p className="netflix-card-title">{track.name}</p>
                    <p className="netflix-card-sub">{track.artists?.map((a) => a.name).join(", ")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {spotifyResults && (
            <div className="netflix-row">
              <div className="netflix-row-header">
                <p className="netflix-row-label">Search Results</p>
                <button type="button" className="netflix-close" onClick={() => setSpotifyResults(null)} title="Close">✕</button>
              </div>
              <div className="netflix-scroll">
                  {spotifyResults.tracks.map((track) => (
                    <div key={track.id} className="netflix-card netflix-card-embed">
                      <iframe
                        title={`Spotify embed: ${track.name}`}
                        src={`https://open.spotify.com/embed/track/${track.id}?utm_source=generator&theme=0`}
                        width="100%"
                        height="152"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        className="netflix-embed"
                      />
                    </div>
                  ))}
                </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
