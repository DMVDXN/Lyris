"use client";

import { FormEvent, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi, I’m Lyris. I can help with songwriting, lyrics, poetry, rhyme, and creative ideas. What do you want to work on today?",
    },
  ]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedInput = input.trim();
    if (!trimmedInput || loading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: trimmedInput,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: trimmedInput }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Request failed.");
      }

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: data.reply || "No reply returned.",
        },
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong.";

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: `Error: ${errorMessage}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-4xl font-bold">Lyris</h1>
        <p className="mb-6 text-gray-400">A music and poetry chatbot.</p>

        <div className="mb-4 h-[500px] overflow-y-auto rounded-2xl border border-gray-800 bg-zinc-900 p-4">
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`max-w-[85%] rounded-2xl px-4 py-3 whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "ml-auto bg-white text-black"
                    : "bg-zinc-800 text-white"
                }`}
              >
                <p className="mb-1 text-xs uppercase opacity-70">
                  {msg.role === "user" ? "You" : "Lyris"}
                </p>
                <p>{msg.content}</p>
              </div>
            ))}

            {loading && (
              <div className="max-w-[85%] rounded-2xl bg-zinc-800 px-4 py-3">
                <p className="mb-1 text-xs uppercase opacity-70">Lyris</p>
                <p>Thinking...</p>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for lyrics, poems, rhyme ideas..."
            className="flex-1 rounded-xl border border-gray-700 bg-zinc-900 px-4 py-3 text-white outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-white px-5 py-3 font-semibold text-black disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </main>
  );
}