import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FinPilotAI — AI Stock Sentiment Analysis',
  description:
    'Analyze financial news for any stock ticker. Get AI-powered sentiment analysis, explanations, and short-term predictions based on the latest market headlines.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
