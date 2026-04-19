import { NextRequest, NextResponse } from 'next/server'
import { fetchNews } from '@/lib/finance-news'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const ticker = searchParams.get('ticker')

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker is required' }, { status: 400 })
  }

  try {
    const articles = await fetchNews(ticker)
    return NextResponse.json({ ticker: ticker.toUpperCase(), articles })
  } catch (error) {
    console.error('News API error:', error)
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 })
  }
}
