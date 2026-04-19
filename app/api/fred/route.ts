import { NextRequest, NextResponse } from 'next/server'
import { getFredSeries, getMultipleSeries, DEFAULT_INDICATORS, ALL_INDICATORS } from '@/lib/fred'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const seriesId = searchParams.get('series')
  const all = searchParams.get('all')
  const viewAll = searchParams.get('viewAll')

  try {
    // Fetch all extended indicators
    if (viewAll === 'true') {
      const ids = Object.keys(ALL_INDICATORS)
      const data = await getMultipleSeries(ids)
      return NextResponse.json({ indicators: ALL_INDICATORS, data })
    }

    // Fetch default indicators
    if (all === 'true') {
      const ids = Object.keys(DEFAULT_INDICATORS)
      const data = await getMultipleSeries(ids)
      return NextResponse.json({ indicators: DEFAULT_INDICATORS, data })
    }

    // Fetch single series
    if (seriesId) {
      const data = await getFredSeries(seriesId)
      if (!data) {
        return NextResponse.json({ error: 'Series not found or FRED API key missing' }, { status: 404 })
      }
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Provide ?series=SERIES_ID or ?all=true or ?viewAll=true' }, { status: 400 })
  } catch (error) {
    console.error('FRED API error:', error)
    return NextResponse.json({ error: 'Failed to fetch FRED data' }, { status: 500 })
  }
}
