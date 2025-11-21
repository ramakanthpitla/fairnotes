import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/components/providers/auth-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { LikedProductsProvider } from '@/components/providers/liked-products-provider';
import { Navigation } from '@/components/layout/navigation';
import { NetworkStatus } from '@/components/network-status';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FairNotes - Your Learning Platform',
  description: 'Access premium study materials including PDFs and video courses.',
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <LikedProductsProvider>
              <NetworkStatus />
              <Toaster position="top-center" />
              <Navigation />
              <main className="pb-32 pt-[88px] md:pt-0 md:pb-0">
                {children}
              </main>
            </LikedProductsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
