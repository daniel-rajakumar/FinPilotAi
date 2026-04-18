import { NextRequest, NextResponse } from 'next/server'
import { chatWithAI } from '@/lib/openai'
import { ChatRequest } from '@/types'

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

    const responseMessage = await chatWithAI(messages, ticker)

    return NextResponse.json({ message: responseMessage })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    )
  }
}
