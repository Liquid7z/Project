import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: 'LiqAI',
  description: 'Your Personal Handwriting Assistant',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const logoSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M12 16.5l-3.5-3.5' /><path d='M17.5 6.5L14 10' /><path d='M14.5 13.5L18 10' /><path d='M12 22a10 10 0 00-9.9-9.5' /><path d='M2.5 12.5a10 10 0 0119.5-2' /></svg>`;
  const favicon = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%236F00FF'></rect>${encodeURIComponent(logoSvg.replace(/stroke='white'/g, "stroke='white' transform='scale(3) translate(3, 3)'"))}</svg>`;

  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Source+Code+Pro:wght@400&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />
        <link rel="icon" href={favicon} />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="font-body antialiased min-h-screen bg-background">
        <ThemeProvider>
          <FirebaseClientProvider>
            {children}
          </FirebaseClientProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
