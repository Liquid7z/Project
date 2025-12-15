import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: 'LiqAI',
  description: 'Generate handwritten assignments with your own style, powered by AI.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Source+Code+Pro:wght@400&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%236d28d9'></rect><path d='M68 28h11v44H68V28zm-22 0h11v44H46V28zM24 28h11v44H24V28z' fill='white' transform='rotate(25, 59.5, 50)'/><path d='M22,72 C22,72 22,28 78,28' stroke='white' stroke-width='8' fill='none' stroke-linecap='round'/></svg>" />
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
