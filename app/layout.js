import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Andee - Test Build</title>
      </head>
      <body>{children}</body>
    </html>
  );
}
