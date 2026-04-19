import fs from 'fs';

const PITCH = "http://localhost:3000/api/chat";

const queries = [
  // 1. CORE MARKET UNDERSTANDING
  "What is the current market sentiment?",
  "Why is the market up today?",
  "Why is the market down today?",
  "What are the main drivers of the market right now?",
  "Is the market risk-on or risk-off?",

  // 2. DERIVED / ANALYTICAL QUESTIONS
  "Which stocks had the highest trading volume this week?",
  "Which stocks are showing unusual volume today?",
  "What are the top 5 companies by market cap right now?",
  "Which stocks are outperforming the market?",
  "Which stocks are underperforming the most?",
  "What are the most volatile stocks today?",
  "Which tickers are getting the most attention in the news?",

  // 3. NEWS INTERPRETATION
  "What does the latest news mean for the market?",
  "How does geopolitical tension affect stocks?",
  "If oil prices rise, which stocks benefit?",
  "What stocks are affected by AI-related news?",
  "What sectors are impacted by current headlines?",

  // 4. MACRO ECONOMICS
  "CPI came in lower than expected, what happens?",
  "What does rising interest rates mean for stocks?",
  "How does unemployment affect the market?",
  "What happens if the Fed cuts rates?",
  "Explain CPI in simple terms",
  "Explain PPI, PMI, JOLTS",

  // 5. CONFLICT / MIXED SIGNALS
  "What if inflation is rising but earnings are strong?",
  "The Fed is hawkish but stocks are going up — why?",
  "Is the market giving mixed signals right now?",
  "What are the conflicting factors in the market?",

  // 6. SECTOR ANALYSIS
  "Which sectors are bullish right now?",
  "Which sectors are under pressure?",
  "How are tech stocks performing vs energy?",
  "What sectors benefit from high interest rates?",

  // 7. STOCK-SPECIFIC QUESTIONS
  "Analyze AAPL based on recent news",
  "Why is NVDA moving today?",
  "Is TSLA bullish or bearish right now?",
  "What is affecting Apple stock?",

  // 8. OPTIONS FLOW
  "Which stocks have the highest options activity?",
  "Is there unusual options flow today?",
  "What does heavy call buying indicate?",
  "Which tickers show bullish positioning?",

  // 9. PREDICTION / REASONING
  "What is likely to happen next in the market?",
  "Is this rally sustainable?",
  "Are we heading into a correction?",
  "What are the biggest risks right now?",

  // 10. EDGE CASES
  "There is no major news today, what is driving the market?",
  "All data is neutral, what is the sentiment?",
  "If markets are flat, what does that mean?",
  "What if volume is low across all stocks?",

  // 11. STRESS TEST
  "Summarize the market, top movers, macro data, and risks in one answer",
  "Compare tech vs energy vs financials and explain differences",
  "Give me the top 3 bullish and bearish signals right now",
  "Explain today’s market like a hedge fund analyst",

  // 12. UX / HUMAN-FRIENDLY TESTS
  "Explain like I’m 5 why the market is down",
  "Give me a simple summary",
  "Give me a detailed analysis",
  "Why should I care about CPI?"
];

async function runQuery(q) {
  try {
    const response = await fetch(PITCH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: q }],
        ticker: null,
      })
    });

    if (!response.ok) {
      return `Error: ${response.status} ${response.statusText}`;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let resultText = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      // The chunks are SSE: data: {"text":"..."} \n\n
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          if (dataStr === '[DONE]') continue;
          try {
            const data = JSON.parse(dataStr);
            if (data.text) resultText += data.text;
          } catch(e) {}
        }
      }
    }
    return resultText;
  } catch (err) {
    return `Exception: ${err.message}`;
  }
}

async function runAll() {
  console.log("Starting tests...");
  let report = "# AI Benchmark Report\n\n";

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    console.log(`Running [${i+1}/${queries.length}]: ${q}`);
    const answer = await runQuery(q);
    report += `### Q: ${q}\n**A:** ${answer}\n\n---\n`;
  }

  fs.writeFileSync("test-report.md", report);
  console.log("Done! Wrote report to test-report.md");
}

runAll();
