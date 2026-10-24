import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Sidebar from "@/app/components/sidebar";
import "./globals.css";
import "./workspace.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SupportPilot",
  description:
    "An AI-assisted support workspace for ticket triage and source-backed reply drafts.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="workspace-layout">
          <Sidebar/>
          <div className="workspace-content">{children}</div>
        </div>
      </body>
    </html>
  );
}
