'use client';

import './globals.css';
import { SessionProvider } from 'next-auth/react';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Andee - Your Real-Time Meeting Guardian</title>
        <meta name="description" content="Voice-first meeting conflict management for contractors" />
      </head>
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
