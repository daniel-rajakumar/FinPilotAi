import { NextRequest, NextResponse } from 'next/server'
import { getStockNews } from '@/lib/news'
import { analyzeNews } from '@/lib/openai'
import { isValidTicker, sanitizeTicker } from '@/lib/helpers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ticker } = body

    if (!ticker || !isValidTicker(ticker)) {
      return NextResponse.json(
        { error: 'Please provide a valid stock ticker (1-5 letters, e.g., AAPL)' },
        { status: 400 }
      )
    }

    const cleanTicker = sanitizeTicker(ticker)

    // Fetch news articles
    const articles = await getStockNews(cleanTicker)

    // Analyze with OpenAI
    const analysis = await analyzeNews(cleanTicker, articles)

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Analysis endpoint error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
