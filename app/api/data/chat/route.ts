import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { ChatMessage } from '@/types'

const DATA_FILE = path.join(process.cwd(), 'data', 'chats.json')

export async function GET() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8')
    return NextResponse.json(JSON.parse(data || '[]'))
  } catch (error) {
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const messages: ChatMessage[] = await request.json()
    await fs.writeFile(DATA_FILE, JSON.stringify(messages, null, 2), 'utf-8')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to save chat data:', error)
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 })
  }
}
