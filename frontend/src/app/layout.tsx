import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';

import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
 import { ToastContainer } from 'react-toastify';
import NextTopLoader from 'nextjs-toploader';

const outfit = Outfit({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Multibrand POS",
    template: "%s | Multibrand POS",
  },
  description: "Multibrand POS – point of sale, inventory, purchase and sales management",
  // Served from /public: an app/icon.svg would clash with the @svgr/webpack rule for .svg imports
  icons: { icon: "/images/logo/logo-icon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.className} dark:bg-gray-900`}>
        {/* Thin progress bar at the top while moving between pages */}
        {/* zIndex above the header (z-99999) so the bar shows across the full width */}
        <NextTopLoader color="#465FFF" height={3} showSpinner={false} shadow={false} zIndex={100000} />
        <ThemeProvider>
          <AuthProvider>
          <SidebarProvider>{children}</SidebarProvider>
          </AuthProvider>
           <ToastContainer position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
