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

  const prompt = `You are a financial analyst AI. Analyze the following recent news headlines about the stock ticker "${ticker}" and provide a structured analysis.

Headlines:
${headlineList}

Respond ONLY with valid JSON in this exact format:
{
  "sentiment": "Bullish" or "Bearish" or "Neutral",
  "explanation": "A clear 2-3 sentence explanation of why the sentiment is what it is, written for a beginner investor.",
  "prediction": "A brief 1-2 sentence prediction about the short-term stock movement based on these headlines."
}

Important rules:
- sentiment must be exactly one of: "Bullish", "Bearish", or "Neutral"
- Keep the explanation simple and jargon-free
- The prediction should be cautious and mention uncertainty
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
  ticker?: string
): Promise<ChatMessage> {
  const systemPrompt = ticker 
    ? `You are FinPilotAI, a expert financial analyst bot. You are currently analyzing the stock ${ticker}. Provide helpful, accurate, and cautious financial insights based on the user's questions. Always remind the user that this is not financial advice.`
    : `You are FinPilotAI, a expert financial analyst bot. Help the user with stock research, market analysis, and general financial questions. Be concise and professional.`;

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
