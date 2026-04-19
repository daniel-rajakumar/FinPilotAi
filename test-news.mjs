import dotenv from 'dotenv';
import fetch from 'node-fetch'; // Next.js use fetch globally in newer node, but let's just use Node 20+ fetch

dotenv.config({ path: '.env.local' });

const NEWS_API_KEY = process.env.NEWS_API_KEY || '';
const NEWS_API_URL = 'https://newsapi.org/v2/everything';

async function testNewsAPI(queryStr) {
  const query = encodeURIComponent(queryStr);
  const trustedDomains = [
    'cnbc.com', 'finance.yahoo.com', 'bloomberg.com', 'wsj.com', 'reuters.com', 
    'barrons.com', 'marketwatch.com', 'forbes.com', 'nytimes.com', 'washingtonpost.com', 
    'abcnews.go.com', 'cbsnews.com', 'nbcnews.com', 'usnews.com'
  ].join(',');

  const url = `${NEWS_API_URL}?q=${query}&domains=${trustedDomains}&sortBy=publishedAt&pageSize=20&language=en&apiKey=${NEWS_API_KEY}`;
  
  console.log('Testing URL:', url.replace(NEWS_API_KEY, 'HIDDEN'));
  
  const res = await fetch(url);
  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));
}

testNewsAPI('technology OR tech stocks');
