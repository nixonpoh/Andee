import './globals.css'

export const metadata = {
  title: 'Andee - Your Real-Time Meeting Guardian',
  description: 'Voice-first meeting conflict management for contractors',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
