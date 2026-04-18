import { NextRequest, NextResponse } from 'next/server'
import { getStockNews } from '@/lib/news'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const ticker = searchParams.get('ticker')

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker is required' }, { status: 400 })
  }

  try {
    const articles = await getStockNews(ticker)
    return NextResponse.json({ ticker: ticker.toUpperCase(), articles })
  } catch (error) {
    console.error('News API error:', error)
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 })
  }
}
