import type { Metadata, Viewport } from "next";
import { auth } from "@/lib/auth";
import Providers from "./providers";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#13111c",
};

export const metadata: Metadata = {
  title: "Meow AI",
  description: "Your friendly AI assistant",
  icons: { icon: "/favicon.ico" },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
