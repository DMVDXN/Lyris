import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lyris | Music & Poetry Guide",
  description:
    "Lyris is a designed conversational AI for music and poetry with critic insight, interviewer curiosity, Spotify discovery, and expressive audio output.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}