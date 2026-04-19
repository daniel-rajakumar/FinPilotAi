import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { ChatMessage, ChatSession, ChatStore } from '@/types'

const DATA_FILE = path.join(process.cwd(), 'data', 'chats.json')

function getDefaultTitle(messages: ChatMessage[], fallback = 'Chat 1') {
  const firstUserMessage = messages.find((message) => message.role === 'user' && message.content.trim())
  if (!firstUserMessage) return fallback

  const normalizedContent = firstUserMessage.content.replace(/\s+/g, ' ').trim()
  if (normalizedContent.length <= 28) return normalizedContent
  return `${normalizedContent.slice(0, 27).trimEnd()}…`
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false

  const candidate = value as ChatMessage
  return typeof candidate.id === 'string'
    && typeof candidate.content === 'string'
    && typeof candidate.timestamp === 'string'
    && typeof candidate.role === 'string'
}

function isChatSession(value: unknown): value is ChatSession {
  if (!value || typeof value !== 'object') return false

  const candidate = value as ChatSession
  return typeof candidate.id === 'string'
    && typeof candidate.title === 'string'
    && typeof candidate.createdAt === 'string'
    && typeof candidate.updatedAt === 'string'
    && Array.isArray(candidate.messages)
    && candidate.messages.every(isChatMessage)
}

function createLegacySession(messages: ChatMessage[]): ChatSession {
  const createdAt = messages[0]?.timestamp ?? new Date().toISOString()
  const updatedAt = messages[messages.length - 1]?.timestamp ?? createdAt

  return {
    id: crypto.randomUUID(),
    title: getDefaultTitle(messages),
    messages,
    createdAt,
    updatedAt,
  }
}

function normalizeStore(payload: unknown): ChatStore {
  if (Array.isArray(payload)) {
    if (payload.every(isChatSession)) {
      return {
        sessions: payload,
        activeSessionId: payload[0]?.id ?? null,
      }
    }

    if (payload.every(isChatMessage)) {
      const legacySession = createLegacySession(payload)
      return {
        sessions: [legacySession],
        activeSessionId: legacySession.id,
      }
    }
  }

  if (payload && typeof payload === 'object' && Array.isArray((payload as ChatStore).sessions)) {
    const store = payload as Partial<ChatStore>
    const sessions = store.sessions?.filter(isChatSession) ?? []
    const activeSessionId = typeof store.activeSessionId === 'string'
      && sessions.some((session) => session.id === store.activeSessionId)
      ? store.activeSessionId
      : (sessions[0]?.id ?? null)

    return { sessions, activeSessionId }
  }

  return { sessions: [], activeSessionId: null }
}

export async function GET() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8')
    return NextResponse.json(normalizeStore(JSON.parse(data || '[]')))
  } catch (error) {
    return NextResponse.json({ sessions: [], activeSessionId: null })
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const store = normalizeStore(payload)

    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true })
    await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to save chat data:', error)
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 })
  }
}
