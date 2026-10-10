import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { SpaceBackdrop } from "@/components/layout/SpaceBackdrop";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Chrono & Spatial — SPHEREx Sky Change Explorer",
  description:
    "Explore real NASA SPHEREx sky imagery across 6-month survey cadences, compare multi-epoch observations, and detect cosmic changes across 102 near-infrared channels.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('spherex_theme');
                if (theme === 'light') {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                } else {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                }
                const lang = localStorage.getItem('spherex_lang');
                if (lang) {
                  document.documentElement.lang = lang;
                  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col antialiased">
        <a href="#main-content" className="skip-link">Skip to content</a>
        <SpaceBackdrop />
        <Header />
        <main id="main-content" className="app-main">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
