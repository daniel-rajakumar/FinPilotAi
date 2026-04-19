import { NextResponse } from 'next/server';

export async function GET() {
  const NEWS_API_KEY = process.env.NEWS_API_KEY || '';
  const NEWS_API_URL = 'https://newsapi.org/v2/everything';
  const query = encodeURIComponent('Apple OR Microsoft OR Technology');
  
  const trustedDomains = [
    'cnbc.com', 'finance.yahoo.com', 'bloomberg.com', 'wsj.com', 'reuters.com', 
    'barrons.com', 'marketwatch.com', 'forbes.com', 'nytimes.com', 'washingtonpost.com', 
    'abcnews.go.com', 'cbsnews.com', 'nbcnews.com', 'usnews.com'
  ].join(',');

  const url = `${NEWS_API_URL}?q=${query}&domains=${trustedDomains}&sortBy=publishedAt&pageSize=20&language=en&apiKey=${NEWS_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    return new NextResponse(text, { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
