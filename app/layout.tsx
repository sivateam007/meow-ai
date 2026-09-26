import type { Metadata, Viewport } from "next";
import { getSessionUser } from "@/lib/auth";
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
  const user = await getSessionUser();

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers initialUser={user}>{children}</Providers>
      </body>
    </html>
  );
}
