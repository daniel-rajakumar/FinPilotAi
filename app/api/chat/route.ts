import { NextRequest, NextResponse } from 'next/server'
import { chatWithAI } from '@/lib/openai'
import { ChatRequest } from '@/types'
import { getStockQuote, getStockHistory, formatStockDataForAI } from '@/lib/yfinance'

// Common stock tickers to detect in user messages
const TICKER_PATTERN = /\b([A-Z]{1,5})\b/g
const KNOWN_TICKERS = [
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'META', 'TSLA', 'NVDA', 'AMD',
  'NFLX', 'DIS', 'BA', 'JPM', 'V', 'MA', 'WMT', 'KO', 'PEP', 'INTC',
  'CSCO', 'CRM', 'ORCL', 'ADBE', 'PYPL', 'SQ', 'SNAP', 'UBER', 'LYFT',
  'SHOP', 'SPOT', 'ZM', 'COIN', 'HOOD', 'PLTR', 'SOFI', 'NIO', 'RIVN',
  'F', 'GM', 'T', 'VZ', 'XOM', 'CVX', 'JNJ', 'PFE', 'MRNA', 'UNH',
  'SPY', 'QQQ', 'VOO', 'VTI', 'IWM', 'DIA',
]

// Try to detect stock tickers mentioned in the latest user message
function detectTickers(message: string): string[] {
  const upper = message.toUpperCase()
  const found: string[] = []

  // Check for known tickers (require word boundaries, min 2 chars to avoid false positives)
  for (const ticker of KNOWN_TICKERS) {
    if (ticker.length < 2) continue // Skip single-letter tickers like F, T
    const regex = new RegExp(`\\b${ticker}\\b`)
    if (regex.test(upper)) {
      found.push(ticker)
    }
  }

  // Also check for "$TICKER" pattern (e.g., $AAPL) — this allows single letters too
  const dollarPattern = /\$([A-Z]{1,5})\b/g
  let match
  while ((match = dollarPattern.exec(upper)) !== null) {
    if (!found.includes(match[1])) {
      found.push(match[1])
    }
  }

  return found.slice(0, 3) // Max 3 tickers at a time
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { messages, ticker } = body

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      )
    }

    // Get the latest user message to detect tickers
    const latestMessage = messages[messages.length - 1]
    const detectedTickers = ticker 
      ? [ticker] 
      : detectTickers(latestMessage.content)

    // Fetch real-time stock data for detected tickers
    let stockContext = ''
    if (detectedTickers.length > 0) {
      const dataPromises = detectedTickers.map(async (t) => {
        const [quote, history] = await Promise.all([
          getStockQuote(t),
          getStockHistory(t),
        ])
        if (quote) {
          return formatStockDataForAI(quote, history)
        }
        return null
      })

      const results = await Promise.all(dataPromises)
      stockContext = results.filter(Boolean).join('\n\n')
    }

    const responseMessage = await chatWithAI(messages, ticker, stockContext)

    return NextResponse.json({ message: responseMessage })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    )
  }
}
