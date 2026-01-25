import './globals.css';
import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import MobileNav from './MobileNav';

export const metadata: Metadata = {
  title: 'ViveBien - Staging Dashboard',
  description: 'Healthcare companion dashboard for the Hispanic community',
  icons: {
    icon: '/favicon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#C4613A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen">
        <header className="bg-white/80 backdrop-blur-md border-b border-ebano/10 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="/logo.png" 
                  alt="ViveBien - Testing Stage" 
                  className="h-10 md:h-12 w-auto"
                />
              </Link>
              
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/" className="font-body text-text-secondary hover:text-barro transition-colors">
                  Patients
                </Link>
                <Link href="/routines" className="font-body text-text-secondary hover:text-barro transition-colors">
                  Routines
                </Link>
                <Link href="/credits" className="font-body text-text-secondary hover:text-barro transition-colors">
                  Credits
                </Link>
                <div className="sello-confianza">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Confianza
                </div>
              </nav>

              <MobileNav />
            </div>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8 safe-bottom">
          {children}
        </main>
        
        <footer className="border-t border-ebano/10 mt-auto hidden md:block">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <p className="text-center text-text-muted text-sm font-body">
            ViveBien © 2026 — Con amor para nuestra comunidad 💚
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
