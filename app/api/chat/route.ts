import { NextRequest, NextResponse } from 'next/server'
import { streamChatWithAI } from '@/lib/openai'
import { ChatRequest } from '@/types'
import { getStockQuote, getStockHistory, formatStockDataForAI } from '@/lib/yfinance'
import { getStockNews } from '@/lib/news'
import { getMultipleSeries, DEFAULT_INDICATORS } from '@/lib/fred'
import { getOptionFlow } from '@/lib/option-flow'

// Common stock tickers to detect in user messages
const TICKER_PATTERN = /\b([A-Z]{1,5})\b/g
const KNOWN_TICKERS = [
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'META', 'TSLA', 'NVDA', 'AMD',
  'NFLX', 'DIS', 'BA', 'JPM', 'V', 'MA', 'WMT', 'KO', 'PEP', 'INTC',
  'CSCO', 'CRM', 'ORCL', 'ADBE', 'PYPL', 'SQ', 'SNAP', 'UBER', 'LYFT',
  'SHOP', 'SPOT', 'ZM', 'COIN', 'HOOD', 'PLTR', 'SOFI', 'NIO', 'RIVN',
  'F', 'GM', 'T', 'VZ', 'XOM', 'CVX', 'JNJ', 'PFE', 'MRNA', 'UNH',
  'SPY', 'QQQ', 'VOO', 'VTI', 'IWM', 'DIA',
]

// Try to detect stock tickers mentioned in the latest user message
function detectTickers(message: string): string[] {
  const upper = message.toUpperCase()
  const found: string[] = []

  // Check for known tickers (require word boundaries, min 2 chars to avoid false positives)
  for (const ticker of KNOWN_TICKERS) {
    if (ticker.length < 2) continue // Skip single-letter tickers like F, T
    const regex = new RegExp(`\\b${ticker}\\b`)
    if (regex.test(upper)) {
      found.push(ticker)
    }
  }

  // Also check for "$TICKER" pattern (e.g., $AAPL) — this allows single letters too
  const dollarPattern = /\$([A-Z]{1,5})\b/g
  let match
  while ((match = dollarPattern.exec(upper)) !== null) {
    if (!found.includes(match[1])) {
      found.push(match[1])
    }
  }

  return found.slice(0, 3) // Max 3 tickers at a time
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
    const detectedTickers = ticker 
      ? [ticker] 
      : detectTickers(latestMessage.content)

    // Fetch real-time stock data for detected tickers
    let stockContext = ''
    if (detectedTickers.length > 0) {
      const dataPromises = detectedTickers.map(async (t) => {
        const [quote, history, news] = await Promise.all([
          getStockQuote(t),
          getStockHistory(t),
          getStockNews(t)
        ])
        
        let contextText = ''
        if (quote) {
          contextText += formatStockDataForAI(quote, history)
        }
        
        if (news && news.length > 0) {
          contextText += `\n\nLatest News for ${t}:\n` + news.map(n => `- ${n.title} (${n.source})`).join('\n')
        }
        
        return contextText || null
      })

      const results = await Promise.all(dataPromises)
      stockContext = results.filter(Boolean).join('\n\n')
    } else {
      let macroDataText = '';
      const uMessage = latestMessage.content.toLowerCase();

      // Ensure we check for macroeconomic concepts first (using robust Regex to catch common typos like "intrest")
      const macroPattern = /interest|intrest|yield|inflation|cpi|unemployment|employ|economy|economic|fed|gdp/i;
      const hasMacroKeywords = macroPattern.test(uMessage);
      
      if (hasMacroKeywords) {
        // Fetch top tier macro indicators matching the Economy Dashboard payload
        const macroSeries = await getMultipleSeries(Object.keys(DEFAULT_INDICATORS));
        macroDataText = "Latest U.S. Macroeconomic Indicators (from Federal Reserve/FRED):\n";
        
        for (const [id, data] of Object.entries(macroSeries)) {
          if (data && data.observations && data.observations.length > 0) {
            // observations are sorted chronologically, so the latest is the LAST element
            const latest = data.observations[data.observations.length - 1];
            const meta = DEFAULT_INDICATORS[id];
            macroDataText += `- ${meta.title}: ${latest.value}${meta.units} (as of ${latest.date}). ${meta.description}\n`;
          }
        }
        stockContext += macroDataText + "\n";
      }

      // Check if user is asking for general market news without specifying a ticker
      if (uMessage.includes('news') || uMessage.includes('market') || uMessage.includes('today')) {
         const generalNews = await getStockNews('stock market OR Wall Street')
         if (generalNews && generalNews.length > 0) {
           stockContext += `\nLatest General Market News:\n` + generalNews.map(n => `- ${n.title} (${n.source}) - ${n.description}`).join('\n')
         }
      }

      // Check if user is asking for bullish/bearish names or option flow
      const isAskingForFlow = uMessage.includes('bullish') || uMessage.includes('bearish') || uMessage.includes('option flow') || uMessage.includes('flow');
      if (isAskingForFlow) {
        try {
          const optionFlow = await getOptionFlow()
          stockContext += `\n\nLatest Option Flow Summary (from OptionStrat):\n`
          stockContext += `Top Bullish: ${optionFlow.topBullish.map(t => `${t.symbol} (${t.premium} premium, ${Math.round(t.sentimentScore*100)}% confidence)`).join(', ')}\n`
          stockContext += `Top Bearish: ${optionFlow.topBearish.map(t => `${t.symbol} (${t.premium} premium, ${Math.round(t.sentimentScore*100)}% confidence)`).join(', ')}\n`
        } catch (e) {
          console.error("Failed to fetch option flow for context", e)
        }
      }
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
