# 🚀 Finance Copilot — 9 Hour Hackathon Implementation Plan

## 🧠 Project Overview
Finance Copilot is a web app that:
- Analyzes financial news for a given stock ticker
- Determines sentiment (Bullish / Bearish / Neutral)
- Explains the reasoning in simple terms
- Predicts short-term stock movement
- Displays top relevant headlines

---

## 🏗️ Tech Stack
- Frontend + Backend: Next.js (App Router)
- Language: TypeScript
- AI: OpenAI API
- News Data: NewsAPI (or GNews)
- Styling: Basic CSS (or Tailwind if fast)

---

## 📁 Project Structure

finance-copilot/
├── app/
│   ├── api/analyze/route.ts
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── components/
│   ├── SearchBar.tsx
│   ├── SentimentCard.tsx
│   ├── SummaryCard.tsx
│   ├── NewsList.tsx
│   └── Header.tsx
│
├── lib/
│   ├── openai.ts
│   ├── news.ts
│   └── helpers.ts
│
├── types/index.ts
├── .env.local
├── package.json
└── README.md

---

## 👥 Team Responsibilities

### 👤 Frontend Developer
- Build UI components
- Handle user input (ticker)
- Call backend API
- Display results (cards, lists)

### 👤 Backend Developer (Data)
- Fetch stock-related news
- Clean and structure article data

### 👤 Backend Developer (AI)
- Send news data to OpenAI
- Generate structured sentiment analysis
- Return clean JSON output

---

## 🔄 Core App Flow

1. User enters stock ticker (e.g., AAPL)
2. Frontend sends POST request to /api/analyze
3. Backend:
   - Fetches news articles
   - Sends headlines to OpenAI
   - Receives structured analysis
4. Backend returns:
   - sentiment
   - explanation
   - prediction
   - headlines
5. Frontend displays results

---

## 📡 API Contract

### Request
POST /api/analyze
{
  "ticker": "AAPL"
}

### Response
{
  "sentiment": "Bullish",
  "explanation": "Positive earnings and strong demand...",
  "prediction": "Stock may trend upward...",
  "headlines": [
    "Apple beats earnings expectations",
    "iPhone demand rises"
  ]
}

---

## ⚙️ Backend Implementation

### 📁 lib/news.ts
- Fetch stock-related news from API
- Return top 5 articles

### 📁 lib/openai.ts
- Format prompt using headlines
- Request structured JSON output:
{
  "sentiment": "",
  "explanation": "",
  "prediction": ""
}

### 📁 app/api/analyze/route.ts
- Receive ticker
- Call getStockNews()
- Call analyzeNews()
- Return combined response

---

## 🎨 Frontend Implementation

### 📁 app/page.tsx
- Main UI page
- Manage state for results
- Render components

### 📁 components/SearchBar.tsx
- Input field for ticker
- Button to trigger API call

### 📁 components/SentimentCard.tsx
- Display sentiment prominently

### 📁 components/SummaryCard.tsx
- Display explanation + prediction

### 📁 components/NewsList.tsx
- Display headlines list

---

## 🧪 Testing Plan

- Test API with sample ticker (AAPL, TSLA)
- Verify:
  - News is fetched correctly
  - AI returns valid JSON
  - UI updates properly
- Add fallback if AI response fails

---

## ⏱️ 9-Hour Timeline

### Hour 0–1
- Setup project
- Install dependencies
- Define API contract

### Hour 1–3
- Frontend: Build UI with mock data
- Backend (Data): Fetch news
- Backend (AI): Setup OpenAI + prompt

### Hour 3–5
- Integrate backend pipeline
- Connect frontend to API

### Hour 5–7
- Improve UI/UX
- Refine AI output

### Hour 7–9
- Test end-to-end
- Fix bugs
- Prepare demo

---

## 🔥 Stretch Features (Optional)

- Add stock price chart
- Add “Should I Buy?” button
- Add macroeconomic term explanations (CPI, PPI, etc.)
- Add loading animations

---

## ⚠️ Key Constraints

- Focus on ONE clean working flow
- Avoid adding too many features
- Ensure demo works reliably
- Prioritize clarity over complexity

---

## 🎯 Success Criteria

- User enters a ticker
- App returns meaningful sentiment + explanation
- UI is clean and easy to understand
- Demo works smoothly without breaking

---

## 🏁 Final Notes

- Use mock data early to unblock frontend
- Keep AI output short and structured
- Make the demo impressive, not the codebase complex