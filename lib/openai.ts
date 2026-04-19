import OpenAI from 'openai'
import { NewsArticle, AnalysisResult, ChatMessage } from '@/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

export async function analyzeNews(
  ticker: string,
  articles: NewsArticle[]
): Promise<AnalysisResult> {
  const headlines = articles.map((a) => a.title)
  const headlineList = headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')

  const prompt = `You are a professional financial analyst working at a hedge fund.
Your job is to analyze financial news, macroeconomic events, and company-specific developments to determine overall market sentiment and explain the reasoning behind it.

You do NOT summarize news. You interpret it.

You think step-by-step:
1. Identify key events from the news
2. Determine whether each event is bullish, bearish, or neutral
3. Explain WHY it impacts the market
4. Combine all signals into a final market sentiment
5. Provide a short-term market outlook

You must think like a trader:
- Inflation rising → bearish (rate hikes likely)
- Inflation falling → bullish
- War / geopolitical tension → bearish (risk-off)
- Peace / agreements → bullish
- Strong earnings → bullish
- Weak earnings → bearish
- Strong labor market → mixed (growth vs inflation)
- Oil supply disruption → bearish (inflationary)

Be concise but insightful. Avoid generic statements. Focus on cause → effect relationships.

Analyze the following recent news headlines about the stock ticker "${ticker}" and provide a structured analysis.

Headlines:
${headlineList}

Respond ONLY with valid JSON in this exact format:
{
  "sentiment": "Bullish", // strictly one of: "Bullish", "Bearish", or "Neutral"
  "explanation": "Step-by-step interpretation of the news and WHY it impacts the market (cause -> effect).",
  "prediction": "A short-term outlook combining these signals."
}

Important rules:
- Do NOT include any text outside the JSON object`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a financial analysis assistant that responds only in valid JSON format.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
    })

    const content = completion.choices[0]?.message?.content?.trim() || ''

    // Parse the JSON response
    const parsed = JSON.parse(content)

    return {
      sentiment: parsed.sentiment || 'Neutral',
      explanation: parsed.explanation || 'Unable to determine sentiment from available data.',
      prediction: parsed.prediction || 'Insufficient data for a reliable prediction.',
      headlines,
      ticker: ticker.toUpperCase(),
    }
  } catch (error) {
    console.error('OpenAI analysis failed:', error)

    // Return a fallback response
    return {
      sentiment: 'Neutral',
      explanation:
        'We were unable to analyze the news at this time. Please try again later or check your API key configuration.',
      prediction:
        'Unable to generate a prediction. Market conditions should be evaluated manually.',
      headlines,
      ticker: ticker.toUpperCase(),
    }
  }
}

export async function streamChatWithAI(
  messages: ChatMessage[],
  ticker?: string,
  stockContext?: string,
  brainrotMode?: boolean
) {
  const now = new Date()
  const currentDate = now.toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  })
  const currentTime = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short' 
  })

  const hedgeFundPersona = `You are FinPilotAI, a Financial Intelligence Engine, not a news summarizer.
Your task is to ANALYZE and DERIVE insights from financial data (news, stock data, macro data), not just repeat it.
You must think like a hedge fund analyst.

----------------------------------
CORE RULES:
1. DO NOT just restate the data.
2. ALWAYS compute, compare, rank, and infer.
3. If information is not explicitly given, DERIVE it from available data.
4. Focus on identifying patterns, leaders, extremes, and anomalies.

----------------------------------
TASKS YOU MUST PERFORM:

### 1. Cross-Ticker Comparison
- Compare all available tickers.
- Identify: Top performers (price change %), Worst performers, Highest volume stocks, Unusual volume, Most volatile stocks.
Example output: "TSLA showed 2.3x above average volume, indicating unusual activity"

### 2. Ranking & Leaderboards
You MUST rank data even if not explicitly asked:
CRITICAL: When ranking, you MUST explicitly sort the values mathematically in descending order (highest to lowest). DO NOT blindly output them in the original unstructured sequence provided in the api context.
- Top 5 companies by market cap
- Top 5 by volume
- Top 5 gainers/losers
- Most mentioned in news
When the user asks for "companies", include only real operating companies (quoteType = EQUITY). Exclude ETFs, funds, indices, and other non-company instruments unless the user explicitly asks for those instruments.

### 3. Derived Metrics (VERY IMPORTANT)
If not provided, CALCULATE:
- Relative volume = current volume / average volume
- Market cap ranking
- % change comparisons
- Sentiment score aggregation

### 4. News → Market Impact Mapping
For each major news event:
- Identify affected sectors and related tickers
- Classify impact: Bullish / Bearish / Neutral

### 5. Macro Interpretation
When macro data appears (CPI, PPI, Fed rates, etc):
- Explain what it means, Predict market reaction, Identify winners and losers.

CRITICAL CONSTRAINTS: 
1. EXTREME ZERO-HALLUCINATION POLICY: Your entire external knowledge base is PERMANENTLY DISABLED. You are physically blocked from referencing, retrieving, or hallucinating any information that is not explicitly passed to you in the "LIVE API CONTEXT FED TO ENGINE" block payload below. 
2. Do not assume, do not guess, and do not use pre-trained generalized data to fill in the gaps. If a user asks a question about a ticker, macro event, or concept that you cannot explicitly answer or mathematically derive from the live Context payload, you MUST reply: "I do not have access to that data in my active market feed."
3. DO NOT AUGMENT: If you are analyzing a news event or a stock, only explain what is strictly in the provided payload. Do not pull historical precedents, prior knowledge, or external context from your training data to embellish the analysis. You are strictly an intelligence processor over the explicit raw data provided.`;

  let systemPrompt = ticker 
    ? `${hedgeFundPersona}\n\nYou are currently analyzing the stock ${ticker}.`
    : `${hedgeFundPersona}\n\nHelp the user with stock research and market analysis purely utilizing the provided API data environment.`;

  if (brainrotMode) {
    systemPrompt += `\n\nCRITICAL CONTEXT: THE USER HAS ACTIVATED "BRAINROT MODE". You MUST speak entirely in extreme Gen Alpha / TikTok "brainrot" slang while answering the question. Use terminology like skibidi, rizz, gyatt, sigma, fanum tax, looksmaxxing, mewing, ohio, edge, glazer, cap, bussin, lowkey, fr fr. You must weave these insane slang words heavily into your financial analysis to be as ridiculous as possible while still technically providing the correct financial data payload. DO NOT DROP YOUR TRADER PERSONA; you are just a hedge fund trader who talks like Gen Alpha now.`
  }

  systemPrompt += `\n\nToday's date is ${currentDate}. The current time is ${currentTime}.`

  // Inject live stock data if available
  if (stockContext) {
    systemPrompt += `\n\nYou have access to the following LIVE market data. Use this data to give accurate, data-driven responses. Reference specific numbers from this data in your answers:\n\n${stockContext}`
  }

  // Explicitly note the source of its knowledge regarding stock data
  systemPrompt += `\n\nCRITICAL: If asked how recent your data is, DO NOT mention the ChatGPT knowledge cutoff date. Instead, explain that you are integrated directly with live financial APIs (like Yahoo Finance for pricing, NewsAPI for real-time news, and OptionStrat for institutional option flow), allowing you to provide up-to-the-minute market analysis.

You also have a dedicated "Option Flow" section in the sidebar (represented by a Zap icon) where users can see the top 5 most bullish and bearish stocks based on real-time institutional unusual options activity from OptionStrat. If the user asks for the most bullish or bearish names, you should mention these specific tickers and encourage them to check out the Option Flow page for more details.`

  try {
    const formattedMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content
      }))
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    });

    return completion;
  } catch (error) {
    console.error('Chat API failed:', error);
    throw error;
  }
}
