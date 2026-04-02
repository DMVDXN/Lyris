"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

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
  generatedImage?: string;
  timestamp?: string;
};

type SpotifyArtistResult = {
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
  albums: { id: string; name: string; image: string | null }[];
  tracks: SpotifyTrackResult[];
};


function detectImageRequest(text: string): string | null {
  const t = text.trim();
  const patterns = [
    /^generate (?:an? )?(?:image|picture|photo|art|artwork|illustration|drawing|visual)(?: of)? (.+)/i,
    /^create (?:an? )?(?:image|picture|photo|art|artwork|illustration|drawing|visual)(?: of)? (.+)/i,
    /^make (?:me )?(?:an? )?(?:image|picture|photo|art|artwork|illustration|drawing|visual)(?: of)? (.+)/i,
    /^draw(?: me)? (.+)/i,
    /^paint(?: me)? (.+)/i,
    /^imagine (.+)/i,
  ];
  for (const p of patterns) {
    const m = t.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

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
  const [imageLoading, setImageLoading] = useState(false);
  const [spotifyResults, setSpotifyResults] = useState<SpotifyResults | null>(null);
  const [writingFor, setWritingFor] = useState<string | null>(null);

  // User identity
  const [userName, setUserName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [showNameModal, setShowNameModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Lyrics
  const [lyricsQuery, setLyricsQuery] = useState("");
  const [lyricsSearchLoading, setLyricsSearchLoading] = useState(false);
  type LyricsResult = { id: number; title: string; artist: string; thumbnail: string };
  type ActiveLyrics = { title: string; artist: string; lyrics: string };
  const [lyricsResults, setLyricsResults] = useState<LyricsResult[] | null>(null);
  const [activeLyrics, setActiveLyrics] = useState<ActiveLyrics | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  // Init: load user from localStorage or show name modal
  useEffect(() => {
    const storedName = localStorage.getItem("lyrisUserName");
    const storedId = localStorage.getItem("lyrisUserId");

    if (storedName) {
      setUserName(storedName);
    } else {
      setShowNameModal(true);
    }

    if (storedId) {
      setUserId(storedId);
    } else {
      const newId = crypto.randomUUID();
      localStorage.setItem("lyrisUserId", newId);
      setUserId(newId);
    }
  }, []);

  // Greet by name when we first get it
  useEffect(() => {
    if (userName) {
      setMessages([
        {
          role: "assistant",
          content: `Yo ${userName}, I'm Lyris. Bring me a lyric, a poem, a half-finished hook, a shaky idea, or a question about music theory and I'll help you shape it into something sharper. What are you trying to make right now, and what do you want it to feel like?`,
        },
      ]);
    }
  }, [userName]);

// Save conversation to Firestore after each exchange
  useEffect(() => {
    if (!userId || !userName || messages.length <= 1) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== "assistant") return;

    const save = async () => {
      try {
        await setDoc(
          doc(db, "conversations", userId),
          {
            userName,
            userId,
            messages: messages.slice(-60).map((m) => ({
              role: m.role,
              content: m.content,
              ...(m.timestamp ? { timestamp: m.timestamp } : {}),
              ...(m.generatedImage ? { generatedImage: m.generatedImage } : {}),
            })),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        console.error("Firestore save error:", err);
      }
    };
    save();
  }, [messages, userId, userName]);

  function handleNameSubmit(e: FormEvent) {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) return;
    localStorage.setItem("lyrisUserName", name);
    setUserName(name);
    setNameInput("");
    setShowNameModal(false);
  }

  function handleSignOut() {
    localStorage.removeItem("lyrisUserName");
    setUserName(null);
    setNameInput("");
    setShowNameModal(true);
  }

  function toggleListening() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Speech recognition is not supported in this browser. Try Chrome or Edge.");
      return;
    }
    if (isListening) { recognitionRef.current?.stop(); return; }
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
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  async function sendToChat(content: string) {
    const userMessage: ChatMessage = { role: "user", content, timestamp: new Date().toISOString() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages, userName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed.");
      setMessages([...updatedMessages, {
        role: "assistant",
        content: data.reply || "No reply returned.",
        images: Array.isArray(data.images) ? data.images : [],
        imageQuery: typeof data.imageQuery === "string" ? data.imageQuery : "",
        timestamp: new Date().toISOString(),
      }]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Something went wrong.";
      setMessages([...updatedMessages, { role: "assistant", content: `Error: ${msg}` }]);
    } finally {
      setLoading(false);
    }
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
  }

  async function handleImageGenerate(prompt: string, userText: string) {
    const userMessage: ChatMessage = { role: "user", content: userText, timestamp: new Date().toISOString() };
    const placeholderMsg: ChatMessage = { role: "assistant", content: "Generating your image..." };
    const base = [...messages, userMessage, placeholderMsg];
    setMessages(base);
    setImageLoading(true);

    try {
      const createRes = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || "Failed to start.");

      // Completed immediately
      if (createData.imageUrl) {
        setMessages([...messages, userMessage, { role: "assistant", content: "Here's your image:", generatedImage: createData.imageUrl, timestamp: new Date().toISOString() }]);
        return;
      }

      // Poll
      const { predictionId } = createData;
      const start = Date.now();
      while (Date.now() - start < 120000) {
        await new Promise((r) => setTimeout(r, 2000));
        const poll = await fetch(`/api/generate-image?id=${predictionId}`);
        const pollData = await poll.json();
        if (pollData.status === "succeeded") {
          setMessages([...messages, userMessage, { role: "assistant", content: "Here's your image:", generatedImage: pollData.imageUrl, timestamp: new Date().toISOString() }]);
          return;
        }
        if (pollData.status === "failed") throw new Error(pollData.error || "Generation failed.");
      }
      throw new Error("Image generation timed out.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to generate image.";
      setMessages([...messages, userMessage, { role: "assistant", content: `Error: ${msg}`, timestamp: new Date().toISOString() }]);
    } finally {
      setImageLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || loading || imageLoading) return;
    setInput("");
    resetTextarea();

    const imagePrompt = detectImageRequest(trimmedInput);
    if (imagePrompt) {
      await handleImageGenerate(imagePrompt, trimmedInput);
    } else {
      await sendToChat(trimmedInput);
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
      if (!res.ok) throw new Error(data.error || "Search failed.");
      setSpotifyResults(data);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Search failed.");
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
      const createRes = await fetch("/api/generate-song", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: latestAssistantMessage }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || "Failed to start generation.");
      const { predictionId } = createData;
      setSongStatus("Generating — this takes ~60s...");
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
      setAudioUrl(URL.createObjectURL(await res.blob()));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to generate audio.");
    } finally {
      setAudioLoading(false);
    }
  }

async function handleEnterPersona(artistName: string) {
    if (loading) return;
    await sendToChat(
      `Talk to me as ${artistName}. Fully adopt their persona — their voice, flow, slang, worldview, subject matter, and the way they'd speak about music, creativity, and life. Stay in character for the rest of our conversation unless I say otherwise.`
    );
  }

  async function handleWriteLikeThis(trackName: string, artistName: string) {
    if (loading || writingFor) return;
    const key = `${trackName} — ${artistName}`;
    setWritingFor(key);
    let lyricsText = "";
    try {
      const searchRes = await fetch(`/api/genius?q=${encodeURIComponent(`${trackName} ${artistName}`)}`);
      const searchData = await searchRes.json();
      if (searchRes.ok && searchData.results?.length > 0) {
        const lyricsRes = await fetch(`/api/genius?id=${searchData.results[0].id}`);
        const lyricsData = await lyricsRes.json();
        if (lyricsRes.ok && lyricsData.lyrics) lyricsText = lyricsData.lyrics;
      }
    } catch { /* proceed without lyrics */ } finally {
      setWritingFor(null);
    }
    const msg = lyricsText
      ? `I pulled the full lyrics to "${trackName}" by ${artistName} from Genius so we can study the craft. Here's the full text:\n\n${lyricsText}\n\nBreak down how they built this — the rhyme scheme, flow, structure, and imagery. Then write something original that captures the same energy and approach.`
      : `Write something original in the style of "${trackName}" by ${artistName} — match their flow, rhyme scheme, structure, imagery, and emotional tone.`;
    await sendToChat(msg);
  }

  async function handleLyricsSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = lyricsQuery.trim();
    if (!trimmed || lyricsSearchLoading) return;
    setLyricsSearchLoading(true);
    setLyricsResults(null);
    setActiveLyrics(null);
    try {
      const res = await fetch(`/api/genius?q=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lyrics search failed");
      setLyricsResults(data.results);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Lyrics search failed");
    } finally {
      setLyricsSearchLoading(false);
    }
  }

  async function handleFetchLyrics(id: number) {
    setLyricsLoading(true);
    setActiveLyrics(null);
    try {
      const res = await fetch(`/api/genius?id=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get lyrics");
      setActiveLyrics({ title: data.title, artist: data.artist, lyrics: data.lyrics });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to get lyrics";
      setActiveLyrics({ title: "Unavailable", artist: "", lyrics: msg });
    } finally {
      setLyricsLoading(false);
    }
  }

  function sendLyricsToChat() {
    if (!activeLyrics) return;
    const msg = `I pulled the full lyrics to "${activeLyrics.title}" by ${activeLyrics.artist} from Genius so we can study them together. Here's the full text:\n\n${activeLyrics.lyrics}\n\nBreak down the craft — the rhyme scheme, flow, structure, imagery, and what makes it work. Then help me write something with a similar energy.`;
    setInput(msg);
    setActiveLyrics(null);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        textareaRef.current.focus();
      }
    }, 0);
  }

return (
    <main className="page-shell">
      {/* Name modal */}
      {showNameModal && (
        <div className="name-modal-overlay">
          <div className="name-modal">
            <p className="name-modal-title">What should Lyris call you?</p>
            <p className="name-modal-sub">Your name is saved locally and used to personalize your experience.</p>
            <form onSubmit={handleNameSubmit} className="name-modal-form">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Your name..."
                className="name-modal-input"
                autoFocus
                maxLength={40}
              />
              <button type="submit" className="name-modal-btn" disabled={!nameInput.trim()}>
                Let&apos;s go
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="page-container">
        <section className="main-layout">
          <div className="chat-panel">
            {userName && (
              <div className="chat-panel-header">
                <span className="chat-panel-user">Chatting as {userName}</span>
                <button type="button" className="sign-out-btn" onClick={handleSignOut}>Change name</button>
              </div>
            )}
            <div className="chat-window">
              {messages.map((msg, index) => (
                <div key={index} className={`chat-bubble ${msg.role === "user" ? "user-bubble" : "assistant-bubble"}`}>
                  <div className="bubble-header">
                    <p className="bubble-label">{msg.role === "user" ? (userName ?? "You") : "Lyris"}</p>
                    {msg.timestamp && (
                      <span className="bubble-timestamp">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                  <p>{msg.content}</p>

                  {msg.generatedImage && (
                    <img
                      src={msg.generatedImage}
                      alt="Generated"
                      style={{ marginTop: 12, borderRadius: 14, maxWidth: "260px", width: "100%", display: "block" }}
                    />
                  )}

                  {msg.role === "assistant" && msg.imageQuery && msg.images && msg.images.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <p style={{ fontSize: "0.8rem", color: "#a1a1aa", marginBottom: 10 }}>
                        Visual search: {msg.imageQuery}
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                        {msg.images.map((image, imageIndex) => (
                          <a key={`${index}-${imageIndex}`} href={image.link} target="_blank" rel="noreferrer"
                            style={{ display: "block", textDecoration: "none", background: "#111827", border: "1px solid #27272a", borderRadius: 16, overflow: "hidden" }}>
                            <img src={image.imageUrl || image.thumbnail} alt={image.title}
                              style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
                            <div style={{ padding: 10 }}>
                              <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600, color: "#fafafa" }}>{image.title}</p>
                              {image.source && <p style={{ margin: "6px 0 0", fontSize: "0.8rem", color: "#a1a1aa" }}>{image.source}</p>}
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {(loading || imageLoading) && (
                <div className="chat-bubble assistant-bubble">
                  <p className="bubble-label">Lyris</p>
                  <p>{imageLoading ? "Generating image..." : "Thinking..."}</p>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="chat-form">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder='Lyric, poem, hook, or "generate an image of..."'
                className="chat-input"
                rows={1}
              />
              <button type="button" onClick={toggleListening} className={`mic-button${isListening ? " mic-active" : ""}`} title={isListening ? "Stop listening" : "Speak"}>
                {isListening ? "⏹" : "🎤"}
              </button>
              <button type="submit" disabled={loading || imageLoading} className="send-button">Send</button>
            </form>

            <div className="inline-actions">
              <button type="button" className="quick-prompt" onClick={handleReadAloud} disabled={!latestAssistantMessage || audioLoading}>
                {audioLoading ? "Generating..." : "Read aloud"}
              </button>
              <button type="button" className="quick-prompt suno-btn" onClick={handleGenerateSong} disabled={!latestAssistantMessage || songLoading}>
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
            <form onSubmit={handleSpotifySearch} className="sp-search-form">
              <input type="text" value={spotifyQuery} onChange={(e) => setSpotifyQuery(e.target.value)}
                placeholder="Search artists or songs..." className="sp-search-input" />
              <button type="submit" className="sp-search-btn" disabled={spotifyLoading}>
                {spotifyLoading ? "..." : "Search"}
              </button>
            </form>
            <form onSubmit={handleLyricsSearch} className="sp-search-form">
              <input type="text" value={lyricsQuery} onChange={(e) => setLyricsQuery(e.target.value)}
                placeholder="Find lyrics..." className="sp-search-input" />
              <button type="submit" className="sp-search-btn" disabled={lyricsSearchLoading}>
                {lyricsSearchLoading ? "..." : "Lyrics"}
              </button>
            </form>
          </div>

          {writingFor && (
            <div className="lyrics-panel">
              <p className="lyrics-loading">Finding lyrics for {writingFor}...</p>
            </div>
          )}

{spotifyResults && spotifyResults.artists.length > 0 && (
            <div className="netflix-row">
              <div className="netflix-row-header">
                <p className="netflix-row-label">Artists</p>
                <button type="button" className="netflix-close" onClick={() => setSpotifyResults(null)} title="Close">✕</button>
              </div>
              <div className="netflix-scroll">
                {spotifyResults.artists.map((artist) => (
                  <div key={artist.id} className="netflix-card artist-card">
                    {artist.image ? <img src={artist.image} alt={artist.name} className="netflix-card-img" /> : <div className="netflix-card-placeholder" />}
                    <p className="netflix-card-title">{artist.name}</p>
                    <button type="button" className="persona-btn" onClick={() => handleEnterPersona(artist.name)} disabled={loading}>
                      Be {artist.name}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {spotifyResults && spotifyResults.tracks.length > 0 && (
            <div className="netflix-row">
              <div className="netflix-row-header">
                <p className="netflix-row-label">Tracks</p>
                <button type="button" className="netflix-close" onClick={() => setSpotifyResults(null)} title="Close">✕</button>
              </div>
              <div className="netflix-scroll">
                {spotifyResults.tracks.map((track) => (
                  <div key={track.id} className="netflix-card netflix-card-embed">
                    <iframe title={`Spotify embed: ${track.name}`}
                      src={`https://open.spotify.com/embed/track/${track.id}?utm_source=generator&theme=0`}
                      width="100%" height="152"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy" className="netflix-embed" />
                    <button type="button" className="persona-btn write-btn"
                      onClick={() => handleWriteLikeThis(track.name, track.artistNames)}
                      disabled={loading || !!writingFor}>
                      Write like this
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {lyricsResults && (
            <div className="netflix-row">
              <div className="netflix-row-header">
                <p className="netflix-row-label">Lyrics</p>
                <button type="button" className="netflix-close" onClick={() => { setLyricsResults(null); setActiveLyrics(null); }} title="Close">✕</button>
              </div>
              <div className="netflix-scroll">
                {lyricsResults.map((song) => (
                  <div key={song.id} className="netflix-card lyrics-card" onClick={() => handleFetchLyrics(song.id)} title="Click to view lyrics">
                    {song.thumbnail ? <img src={song.thumbnail} alt={song.title} className="netflix-card-img" /> : <div className="netflix-card-placeholder" />}
                    <p className="netflix-card-title">{song.title}</p>
                    <p className="netflix-card-sub">{song.artist}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {lyricsLoading && (
            <div className="lyrics-panel">
              <p className="lyrics-loading">Loading lyrics...</p>
            </div>
          )}

          {activeLyrics && (
            <div className="lyrics-panel">
              <div className="lyrics-panel-header">
                <div>
                  <p className="lyrics-panel-title">{activeLyrics.title}</p>
                  <p className="lyrics-panel-artist">{activeLyrics.artist}</p>
                </div>
                <div className="lyrics-panel-actions">
                  <button type="button" className="sp-ctrl-btn lyrics-analyze-btn" onClick={sendLyricsToChat}>
                    Analyze with Lyris
                  </button>
                  <button type="button" className="netflix-close" onClick={() => setActiveLyrics(null)} title="Close">✕</button>
                </div>
              </div>
              <pre className="lyrics-body">{activeLyrics.lyrics}</pre>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
