import { NextRequest, NextResponse } from 'next/server'
import { getStockQuotes } from '@/lib/yfinance'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbolsParam = searchParams.get('symbols')

  if (!symbolsParam) {
    return NextResponse.json({ error: 'Symbols parameter is required (e.g., ?symbols=AAPL,MSFT)' }, { status: 400 })
  }

  const symbols = symbolsParam.split(',').map(s => s.trim()).filter(Boolean)

  try {
    const quotes = await getStockQuotes(symbols)
    return NextResponse.json({ quotes })
  } catch (error) {
    console.error('Batch Stock API error:', error)
    return NextResponse.json({ error: 'Failed to fetch batch stock data' }, { status: 500 })
  }
}
