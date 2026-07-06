import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TSM CRM",
  description: "CRM for TSM digital marketing and AI automation operations.",
  icons: {
    icon: "/tsm-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
