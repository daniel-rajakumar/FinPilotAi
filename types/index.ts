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
  tickers?: string[]  // detected stock tickers for inline charts
}

export interface ChatRequest {
  messages: ChatMessage[]
  ticker?: string
  brainrotMode?: boolean
}

export interface ChatResponse {
  message: ChatMessage
}

export interface AnalyzeResponse extends AnalysisResult {}
