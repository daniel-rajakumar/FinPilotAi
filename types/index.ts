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

export interface AnalyzeResponse extends AnalysisResult {}
