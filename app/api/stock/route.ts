import { NextRequest, NextResponse } from 'next/server'
import { getStockQuote, getStockHistory } from '@/lib/yfinance'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')
  const period = searchParams.get('period') || '30' // days

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })
  }

  try {
    const [quote, history] = await Promise.all([
      getStockQuote(symbol),
      getStockHistory(symbol, parseInt(period)),
    ])

    return NextResponse.json({ quote, history })
  } catch (error) {
    console.error('Stock API error:', error)
    return NextResponse.json({ error: 'Failed to fetch stock data' }, { status: 500 })
  }
}
