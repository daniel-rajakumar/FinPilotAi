export function isValidTicker(ticker: string): boolean {
  const cleaned = ticker.trim().toUpperCase()
  return /^[A-Z]{1,5}$/.test(cleaned)
}

export function sanitizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5)
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return 'Unknown date'
  }
}

export function getSentimentColor(sentiment: string): string {
  switch (sentiment) {
    case 'Bullish':
      return '#00c896'
    case 'Bearish':
      return '#ff4757'
    case 'Neutral':
      return '#ffa502'
    default:
      return '#a0a0a0'
  }
}

export function getSentimentEmoji(sentiment: string): string {
  switch (sentiment) {
    case 'Bullish':
      return '📈'
    case 'Bearish':
      return '📉'
    case 'Neutral':
      return '➡️'
    default:
      return '❓'
  }
}
