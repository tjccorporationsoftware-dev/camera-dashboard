import { Noto_Sans_Thai, Geist_Mono } from "next/font/google";
import "./globals.css";

const mainFont = Noto_Sans_Thai({
  variable: "--font-main",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const monoFont = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "TJC System",
  description: "TJC Corporation Back Office System",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="th"
      className={`${mainFont.variable} ${monoFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}