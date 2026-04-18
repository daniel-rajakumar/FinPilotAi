export interface NewsArticle {
  title: string
  description: string | null
  url: string
  source: string
  publishedAt: string
}

export interface AnalysisResult {
  sentiment: 'Bullish' | 'Bearish' | 'Neutral'
  explanation: string
  prediction: string
  headlines: string[]
  ticker: string
}

export interface AnalyzeRequest {
  ticker: string
}
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  id: string
  timestamp: string
}

export interface ChatRequest {
  messages: ChatMessage[]
  ticker?: string
}

export interface ChatResponse {
  message: ChatMessage
}

export interface AnalyzeResponse extends AnalysisResult {}
