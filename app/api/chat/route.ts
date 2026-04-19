import { NextRequest, NextResponse } from 'next/server'
import { streamChatWithAI } from '@/lib/openai'
import { ChatRequest, NewsArticle } from '@/types'
import { getStockQuote, getStockHistory, getStockQuotes, formatStockDataForAI, StockHistory, StockQuote } from '@/lib/yfinance'
import { getStockNews } from '@/lib/news'
import { FredSeries, getMultipleSeries, DEFAULT_INDICATORS } from '@/lib/fred'
import { getOptionFlow, OptionFlowData } from '@/lib/option-flow'

// Common stock tickers to detect in user messages
const KNOWN_TICKERS = [
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'META', 'TSLA', 'NVDA', 'AMD',
  'NFLX', 'DIS', 'BA', 'JPM', 'V', 'MA', 'WMT', 'KO', 'PEP', 'INTC',
  'CSCO', 'CRM', 'ORCL', 'ADBE', 'PYPL', 'SQ', 'SNAP', 'UBER', 'LYFT',
  'SHOP', 'SPOT', 'ZM', 'COIN', 'HOOD', 'PLTR', 'SOFI', 'NIO', 'RIVN',
  'F', 'GM', 'T', 'VZ', 'XOM', 'CVX', 'JNJ', 'PFE', 'MRNA', 'UNH',
  'SPY', 'QQQ', 'VOO', 'VTI', 'IWM', 'DIA',
]

const MARKET_CAP_CANDIDATES = [
  'NVDA', 'MSFT', 'AAPL', 'AMZN', 'GOOGL', 'META', 'TSLA', 'BRK-B', 'AVGO',
  'TSM', 'WMT', 'JPM', 'LLY', 'V', 'ORCL', 'MA', 'NFLX', 'XOM', 'COST',
  'PG', 'JNJ', 'HD', 'ABBV', 'BAC', 'KO',
]

const MARKET_CAP_QUERY_PATTERN = /\b(top|largest|biggest|highest)\b[\s\S]{0,60}\bmarket\s*cap\b|\bmarket\s*cap\b[\s\S]{0,60}\b(top|largest|biggest|highest)\b|\b(top|largest|biggest|highest)\b[\s\S]{0,30}\bmarketcap\b|\bmarketcap\b[\s\S]{0,30}\b(top|largest|biggest|highest)\b/i
const ANALYSIS_QUERY_PATTERN = /\b(why|because|analysis|analyze|sentiment|impact|compare|versus|vs\.?|news|explain|macro)\b/i

interface TickerContextResult {
  ticker: string
  quote: StockQuote | null
  history: StockHistory[]
  news: NewsArticle[]
}

function isPureMarketCapLeaderboardRequest(message: string): boolean {
  return MARKET_CAP_QUERY_PATTERN.test(message) && !ANALYSIS_QUERY_PATTERN.test(message)
}

function getRequestedLimit(message: string, fallback: number = 5): number {
  const topMatch = message.match(/\btop\s+(\d{1,2})\b/i)
  if (topMatch) {
    return Math.min(Math.max(Number(topMatch[1]), 1), 10)
  }

  const standaloneNumber = message.match(/\b(\d{1,2})\b/)
  if (standaloneNumber) {
    return Math.min(Math.max(Number(standaloneNumber[1]), 1), 10)
  }

  return fallback
}

function formatMarketCap(value: number | null): string {
  if (!value) {
    return 'N/A'
  }

  if (value >= 1e12) {
    return `$${(value / 1e12).toFixed(2)}T`
  }

  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`
  }

  return `$${(value / 1e6).toFixed(2)}M`
}

function buildTextStreamResponse(text: string, tickers: string[] = []) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      if (tickers.length > 0) {
        const metaEvent = JSON.stringify({ meta: { tickers } })
        controller.enqueue(encoder.encode(`data: ${metaEvent}\n\n`))
      }

      const textEvent = JSON.stringify({ text })
      controller.enqueue(encoder.encode(`data: ${textEvent}\n\n`))
      controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
      controller.close()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}

async function buildMarketCapLeaderboardResponse(message: string, brainrotMode?: boolean) {
  const limit = getRequestedLimit(message, 5)
  const quotes = await getStockQuotes(MARKET_CAP_CANDIDATES)

  const topCompanies = quotes
    .filter((quote) => quote.quoteType === 'EQUITY' && typeof quote.marketCap === 'number')
    .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))
    .slice(0, limit)

  if (topCompanies.length === 0) {
    return buildTextStreamResponse(
      'I do not have access to enough live company market-cap data in my active market feed to rank that right now.'
    )
  }

  const intro = brainrotMode
    ? `Top ${topCompanies.length} companies by market cap from the live feed right now:\n\n`
    : `Top ${topCompanies.length} companies by market cap from the live feed right now:\n\n`

  const rankings = topCompanies
    .map((company, index) => `${index + 1}. ${company.name} (${company.symbol}) - ${formatMarketCap(company.marketCap)}`)
    .join('\n')

  return buildTextStreamResponse(`${intro}${rankings}`, topCompanies.map((company) => company.symbol))
}

// Try to detect stock tickers mentioned in the latest user message
function detectTickers(message: string): string[] {
  const upper = message.toUpperCase()
  const found: string[] = []

  // 1. Check for known baseline tickers
  for (const ticker of KNOWN_TICKERS) {
    if (ticker.length < 2) continue 
    const regex = new RegExp(`\\b${ticker}\\b`)
    if (regex.test(upper)) {
      found.push(ticker)
    }
  }

  // 2. Check explicit "$TICKER" syntax (allows lowercase to map naturally)
  const dollarPattern = /\$([A-Za-z]{1,5})\b/g
  let match
  while ((match = dollarPattern.exec(message)) !== null) {
    const symbol = match[1].toUpperCase()
    if (!found.includes(symbol)) found.push(symbol)
  }

  // 3. Bruteforce extract explicit ALL CAPS words from raw message (filters out basic English stop words)
  const commonWords = new Set(['THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'ANY', 'CAN', 'HAS', 'HIM', 'HIS', 'HOW', 'WHY', 'WHO', 'WAY', 'USE', 'TWO', 'TOO', 'TOP', 'TEN', 'SEE', 'SAY', 'RUN', 'OUT', 'OUR', 'ONE', 'OFF', 'NOW', 'NEW', 'MAY', 'MAN', 'LET', 'ITS', 'INTO', 'GET', 'DAY', 'DID', 'FEW', 'YES', 'NO', 'CEO', 'CFO', 'CTO', 'USA', 'LLC', 'INC'])
  const explicitPattern = /\b([A-Z]{2,5})\b/g
  let explicitMatch
  while ((explicitMatch = explicitPattern.exec(message)) !== null) {
    if (!commonWords.has(explicitMatch[1]) && !found.includes(explicitMatch[1])) {
      found.push(explicitMatch[1])
    }
  }

  return found.slice(0, 3) // Max 3 dedicated ticker API concurrent queries at a time
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { messages, ticker, brainrotMode } = body

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      )
    }

    // Get the latest user message to detect tickers
    const latestMessage = messages[messages.length - 1]
    if (isPureMarketCapLeaderboardRequest(latestMessage.content)) {
      return await buildMarketCapLeaderboardResponse(latestMessage.content, brainrotMode)
    }

    const detectedTickers = ticker 
      ? [ticker] 
      : detectTickers(latestMessage.content)

    // Fetch EVERYTHING concurrently to feed the Financial Intelligence Engine
    const contextPromises: Array<
      Promise<Record<string, FredSeries> | OptionFlowData | NewsArticle[] | TickerContextResult | null>
    > = [
      getMultipleSeries(Object.keys(DEFAULT_INDICATORS)).catch(() => null),
      getOptionFlow().catch(() => null),
      getStockNews('stock market').catch(() => null)
    ]

    // If the user doesn't provide a specific stock, arm the Intelligence Engine with baseline market indices and the Magnificent 7 mega-caps to perform relative leaderboards
    const baselineTickers = detectedTickers.length > 0 ? detectedTickers : ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA'];

    if (baselineTickers.length > 0) {
      baselineTickers.forEach(t => {
        contextPromises.push(
          Promise.all([getStockQuote(t), getStockHistory(t), getStockNews(t)])
            .then(([quote, history, news]) => ({ ticker: t, quote, history, news }))
            .catch(() => null)
        )
      })
    }

    const results = await Promise.all(contextPromises)
    
    const macroSeries = results[0] as Record<string, FredSeries> | null
    const optionFlow = results[1] as OptionFlowData | null
    const generalNews = results[2] as NewsArticle[] | null
    const tickerResults = results.slice(3).filter(Boolean) as TickerContextResult[]

    let stockContext = "--- LIVE API CONTEXT FED TO ENGINE ---\n\n"

    // 1. MACRO DATA
    if (macroSeries) {
      stockContext += "LATEST MACROECONOMIC INDICATORS (FRED):\n"
      for (const [id, data] of Object.entries(macroSeries)) {
        if (data.observations.length > 0) {
          const latest = data.observations[data.observations.length - 1]
          const meta = DEFAULT_INDICATORS[id]
          stockContext += `- ${meta.title}: ${latest.value}${meta.units} (as of ${latest.date}). ${meta.description}\n`
        }
      }
      stockContext += "\n"
    }

    // 2. OPTION FLOW
    if (optionFlow) {
      stockContext += "UNUSUAL INSTITUTIONAL OPTION FLOW (OPTIONSTRAT):\n"
      stockContext += `Bullish Options: ${optionFlow.topBullish.map((t) => `${t.symbol} (${t.premium} premium, ${Math.round(t.sentimentScore * 100)}% conf)`).join(', ')}\n`
      stockContext += `Bearish Options: ${optionFlow.topBearish.map((t) => `${t.symbol} (${t.premium} premium, ${Math.round(t.sentimentScore * 100)}% conf)`).join(', ')}\n\n`
    }

    // 3. SPECIFIC TICKERS
    if (tickerResults.length > 0) {
      stockContext += "SPECIFIC TICKER DATA:\n"
      tickerResults.forEach((tr) => {
        if (tr.quote) stockContext += formatStockDataForAI(tr.quote, tr.history)
        if (tr.news?.length > 0) {
          stockContext += `\nLatest News for ${tr.ticker}:\n${tr.news.map((n) => `- ${n.title} (${n.source})`).join('\n')}`
        }
        stockContext += "\n\n"
      })
    }

    // 4. GENERAL NEWS
    if (generalNews && generalNews.length > 0) {
      stockContext += "GENERAL MARKET NEWS:\n"
      stockContext += `${generalNews.map((n) => `- ${n.title} (${n.source}) - ${n.description}`).join('\n')}\n\n`
    }

    const completionStream = await streamChatWithAI(messages, ticker, stockContext, brainrotMode)

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // 1. Send meta data (detected tickers) first
        if (detectedTickers.length > 0) {
          const metaEvent = JSON.stringify({ meta: { tickers: detectedTickers } });
          controller.enqueue(encoder.encode(`data: ${metaEvent}\n\n`));
        }

        // 2. Stream AI tokens text payload
        try {
          for await (const chunk of completionStream) {
            const text = chunk.choices?.[0]?.delta?.content || '';
            if (text) {
              const textEvent = JSON.stringify({ text });
              controller.enqueue(encoder.encode(`data: ${textEvent}\n\n`));
            }
          }
        } catch (e) {
          console.error("Stream generation error:", e);
        } finally {
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    )
  }
}
