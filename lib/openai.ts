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

export async function chatWithAI(
  messages: ChatMessage[],
  ticker?: string,
  stockContext?: string
): Promise<ChatMessage> {
  const now = new Date()
  const currentDate = now.toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  })
  const currentTime = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short' 
  })

  const hedgeFundPersona = `You are FinPilotAI, a professional financial analyst working at a hedge fund.
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
Always remind the user that this is not financial advice.`;

  let systemPrompt = ticker 
    ? `${hedgeFundPersona}\n\nYou are currently analyzing the stock ${ticker}.`
    : `${hedgeFundPersona}\n\nHelp the user with stock research, market analysis, and general financial questions.`;

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
    });

    const content = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process that request.";

    return {
      id: Math.random().toString(36).substring(7),
      role: 'assistant',
      content,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Chat API failed:', error);
    return {
      id: Math.random().toString(36).substring(7),
      role: 'assistant',
      content: "I'm having trouble connecting to my brain right now. Please check your API keys or try again later.",
      timestamp: new Date().toISOString()
    };
  }
}
