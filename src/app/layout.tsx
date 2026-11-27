import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AGRIHUB — Trade Smart. Transport Together.",
  description:
    "Shared truck capacity pooling and coordinated rural business logistics for small producers, shippers, and transport operators.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body className="min-h-screen bg-[#F4F5F1] text-[#242B31] antialiased flex flex-col">
        {children}
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            style: {
              borderRadius: "0.75rem",
              border: "1px solid #E4E8E2",
            },
          }}
        />
      </body>
    </html>
  );
}

