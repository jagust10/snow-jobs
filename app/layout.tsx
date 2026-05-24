import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ServiceNow Job Finder",
  description: "Find ServiceNow jobs across mocked job boards."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
