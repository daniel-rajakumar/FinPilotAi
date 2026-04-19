import { NextResponse } from 'next/server'
import { getOptionFlow } from '@/lib/option-flow'

export async function GET() {
  try {
    const data = await getOptionFlow()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch option flow:', error)
    return NextResponse.json({ error: 'Failed to fetch option flow data' }, { status: 500 })
  }
}
