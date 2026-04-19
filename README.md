# FinPilotAI

FinPilotAI is a multi-page financial intelligence app built with Next.js, React, OpenAI, Yahoo Finance, FRED, NewsAPI, Finnhub, and ElevenLabs. It combines live market data, macroeconomic indicators, news aggregation, options-flow views, and an AI chat assistant into a single product.

The app is designed to do two different kinds of work:

- deterministic market lookups for questions that should be answered directly from data
- model-assisted reasoning for interpretation, synthesis, and broader financial analysis

That split is important. FinPilotAI does not rely only on an LLM prompt for every market question. Several high-value chat queries are intercepted server-side and answered directly from Yahoo Finance data before the model is invoked.

## What This Project Includes

FinPilotAI currently ships with these user-facing sections:

- `Chat`: AI financial assistant with streaming responses, ticker detection, inline mini stock cards, voice dictation, voice playback, and multi-tab chat history
- `Graphs`: sector dashboard with curated sector baskets, sector ETFs, stock charts, and sector-specific news
- `News`: ticker news search, trending market headlines, and quick market-mover quote cards
- `Option Flow`: bullish and bearish options-flow dashboard
- `Economy`: macro dashboard powered by FRED plus a weekly economic calendar
- `Settings`: theme selection and assistant behavior toggles like Brainrot Mode

## Core Product Goals

- Provide a fast stock-research workflow for retail-style market questions
- Blend live financial data with AI interpretation instead of pure text generation
- Surface useful market pages directly from the sidebar instead of forcing everything into chat
- Keep the app deployable without a database

## Tech Stack

### Frontend

- Next.js `16.2.4` with App Router
- React `19.2.4`
- TypeScript
- Framer Motion
- Recharts
- Lucide React icons
- React Markdown

### Data / APIs

- OpenAI for sentiment analysis and streaming chat
- Yahoo Finance via `yahoo-finance2` for quotes, history, market-cap ranking, most-actives, earnings timestamps, and charts
- FRED for macroeconomic series
- NewsAPI for financial news
- Finnhub for company news fallback / complement
- MarketWatch RSS as a fallback source for general market headlines
- ElevenLabs for text-to-speech playback

### Persistence

- Browser `localStorage` for immediate chat-tab persistence
- Local JSON file storage at `data/chats.json` for saved chat sessions

There is no database in this project.

## Product Walkthrough

### 1. Chat Assistant

The chat page lives at [app/page.tsx](/Users/danielrajakumar/code/FinPilotAi/app/page.tsx).

Key capabilities:

- streaming assistant responses via Server-Sent Events
- automatic ticker detection from plain text, `$TICKER`, and common company aliases
- inline stock cards for referenced tickers
- voice dictation using the browser speech-recognition API
- assistant audio playback using ElevenLabs
- full-screen voice assistant mode with live captioning and active-word spotlighting
- multi-tab chat sessions at the top of the page
- chat session persistence across refreshes and section changes

Chat sessions now support:

- multiple concurrent tabs
- tab titles derived from the first user prompt
- tab closing with permanent deletion of that session
- immediate restore after refresh from browser storage
- server-backed save/load using `data/chats.json`

### 2. Graphs / Sector Dashboard

The Graphs page lives at [app/graphs/page.tsx](/Users/danielrajakumar/code/FinPilotAi/app/graphs/page.tsx).

It presents curated sector universes instead of trying to model the entire market:

- Technology
- Consumer Goods
- Finance
- Healthcare
- Semiconductors
- Energy

For each sector, the page uses a representative ETF and a hand-picked basket of stocks. It also pulls sector-linked news by mapping each sector to a representative ticker.

### 3. News

The News page lives at [app/news/page.tsx](/Users/danielrajakumar/code/FinPilotAi/app/news/page.tsx).

It supports:

- ticker-specific news search
- trending market news on initial load
- quick quote cards for market movers
- trending ticker chips
- normalized date formatting
- fallback handling when timestamps are missing or malformed

General market news requests use fallback logic so the page can still populate when paid news keys are missing.

### 4. Option Flow

The Option Flow page lives at [app/options/page.tsx](/Users/danielrajakumar/code/FinPilotAi/app/options/page.tsx).

It shows:

- Top 5 Bullish Names
- Top 5 Bearish Names
- sentiment-confidence badges
- premium, trade count, current price, and change

Important: the current option-flow source is not a live external integration. The data is a mocked snapshot returned from [lib/option-flow.ts](/Users/danielrajakumar/code/FinPilotAi/lib/option-flow.ts) and labeled in code as a static implementation based on a dated market snapshot.

### 5. Economy

The Economy page lives at [app/economy/page.tsx](/Users/danielrajakumar/code/FinPilotAi/app/economy/page.tsx).

It combines:

- default FRED dashboard indicators
- extended “View All” macro indicators
- weekly economic calendar data
- forecast / previous / actual / beat-miss commentary
- live banner for macro-related market instruments

Default FRED indicators:

- `FEDFUNDS` - Interest Rate
- `CPIAUCSL` - Inflation (CPI)
- `DGS10` - 10-Year Bonds
- `UNRATE` - Unemployment Rate
- `IPMAN` - PMI proxy via manufacturing production
- `PAYEMS` - Non-Farm Payrolls

Extended indicators include GDP, M2, PPI, 2Y yield, yield curve, USD/EUR, housing, consumer sentiment, JOLTS, and VIX.

The economic calendar logic is implemented locally in [lib/econ-calendar.ts](/Users/danielrajakumar/code/FinPilotAi/lib/econ-calendar.ts) with forecast/previous/actual metadata and future scheduled releases.

### 6. Settings

The Settings page lives at [app/settings/page.tsx](/Users/danielrajakumar/code/FinPilotAi/app/settings/page.tsx).

It currently supports:

- light theme
- dark theme
- theme persistence using `localStorage`
- Brainrot Mode toggle for chat behavior

Brainrot Mode defaults to `false`.

## How Chat Works

The main chat route lives at [app/api/chat/route.ts](/Users/danielrajakumar/code/FinPilotAi/app/api/chat/route.ts).

This route does not blindly forward every question to OpenAI.

### Deterministic Chat Handlers

Before invoking the model, the server checks whether the user asked one of several structured questions that should be answered from data:

- top companies by market cap
- tracked stocks reporting earnings next week
- top volume leaders over the last month
- historical stock price questions
- earliest available history questions
- sector stock suggestions from the app’s tracked sector universe

Examples of prompts that are handled directly:

- `top 5 companies by market cap right now`
- `what stocks are reporting earnings next week`
- `give a list of the top 25 highest volume traded stocks over the last month`
- `what was apple's price in 2016`
- `what is the earliest stock data you have`
- `suggest me good stocks in semiconductor sector`

These responses are built from Yahoo Finance quote/history data and streamed back as SSE text events.

### Model-Assisted Chat Path

If the prompt is not caught by a deterministic handler, the route builds a live context payload and streams the question to OpenAI using [lib/openai.ts](/Users/danielrajakumar/code/FinPilotAi/lib/openai.ts).

The context payload can include:

- default FRED macro indicators
- option-flow summary
- general market news
- one or more detected ticker quotes
- ticker price history
- ticker news

The model persona is intentionally opinionated:

- hedge-fund analyst framing
- emphasis on causal explanation
- explicit “What smart money is doing” and “What could go wrong” sections
- required sentiment / risk / conviction footer

### Ticker Detection

Ticker detection in chat uses:

- a curated ticker allowlist
- `$AAPL`-style mentions
- upper-case token scanning
- company-name aliases such as Apple -> `AAPL`, Google -> `GOOGL`, Tesla -> `TSLA`

## Data Sources and Their Roles

### Yahoo Finance

Implemented in [lib/yfinance.ts](/Users/danielrajakumar/code/FinPilotAi/lib/yfinance.ts).

Used for:

- real-time quotes
- quote batches
- historical price series
- market-cap ranking
- most-active stock universe
- 30-day volume calculations
- earnings timestamps

Main exported helpers:

- `getStockQuote`
- `getStockQuotes`
- `getStockHistory`
- `getStockHistoryRange`
- `getMostActiveStocks`
- `getStockVolumeStats`
- `formatStockDataForAI`

### FRED

Implemented in [lib/fred.ts](/Users/danielrajakumar/code/FinPilotAi/lib/fred.ts).

Used for:

- single macro series
- default dashboard series
- extended dashboard series
- macro context in chat

Main exported helpers:

- `getFredSeries`
- `getMultipleSeries`
- `DEFAULT_INDICATORS`
- `ALL_INDICATORS`

### NewsAPI / Finnhub / MarketWatch

Implemented mainly in [lib/finance-news.ts](/Users/danielrajakumar/code/FinPilotAi/lib/finance-news.ts) and [lib/news.ts](/Users/danielrajakumar/code/FinPilotAi/lib/news.ts).

Two different news paths exist:

- `lib/news.ts` for chat/news-analysis style stock news queries
- `lib/finance-news.ts` for the News page and general market headline aggregation

`finance-news.ts` does the heavier lifting:

- merges NewsAPI and Finnhub results
- filters to trusted sources
- normalizes timestamps from ISO strings, Unix seconds, or Unix milliseconds
- falls back to MarketWatch top-stories RSS for general market news when API-backed sources are unavailable

### OpenAI

Implemented in [lib/openai.ts](/Users/danielrajakumar/code/FinPilotAi/lib/openai.ts).

Used for:

- structured sentiment analysis in `/api/analyze`
- streaming chat completions in `/api/chat`

Current model usage:

- `gpt-4o-mini` for JSON analysis
- `gpt-4o-mini` for streaming chat

### ElevenLabs

Used by [app/api/tts/route.ts](/Users/danielrajakumar/code/FinPilotAi/app/api/tts/route.ts).

Used for:

- assistant message playback
- voice mode audio generation

Voice configuration in code:

- Voice ID: `pNInz6obpgDQGcFmaJgB`
- model: `eleven_turbo_v2_5`

## API Routes

### `POST /api/chat`

Primary chat endpoint.

Behavior:

- accepts chat history and optional ticker
- resolves direct market-data questions where possible
- otherwise builds live market context and streams model output
- returns `text/event-stream`

### `POST /api/analyze`

News-analysis endpoint for a ticker.

Behavior:

- validates ticker format
- fetches stock news
- runs OpenAI JSON analysis
- returns structured sentiment / explanation / prediction

### `GET /api/news?ticker=...`

News aggregation endpoint for the News page.

Behavior:

- fetches ticker-specific or general-market articles
- uses normalized article shapes
- returns `{ ticker, articles }`

### `GET /api/fred`

Macro data endpoint.

Supported modes:

- `?series=SERIES_ID`
- `?all=true`
- `?viewAll=true`

### `GET /api/stock?symbol=...&period=...`

Single-stock quote plus chart history endpoint.

Returns:

- `quote`
- `history`

### `GET /api/stock/batch?symbols=AAPL,MSFT,...`

Batch quote endpoint.

Used for:

- macro banner
- quote strips
- leaderboard calculations

### `GET /api/option-flow`

Returns option-flow dashboard data.

Current behavior:

- serves static mocked snapshot data from `lib/option-flow.ts`

### `POST /api/tts`

Text-to-speech endpoint.

Behavior:

- accepts `{ text }`
- calls ElevenLabs
- returns `audio/mpeg`

### `GET /api/data/chat`

Chat persistence endpoint.

Behavior:

- reads from `data/chats.json`
- normalizes legacy single-chat payloads into session-based storage

### `POST /api/data/chat`

Chat persistence save endpoint.

Behavior:

- accepts session-based chat store
- writes to `data/chats.json`

### `GET /api/test-news`

Diagnostic route for checking NewsAPI connectivity and payloads.

This is a development/debug route.

## Project Structure

```text
FinPilotAi/
├── app/
│   ├── api/
│   │   ├── analyze/
│   │   ├── chat/
│   │   ├── data/chat/
│   │   ├── fred/
│   │   ├── news/
│   │   ├── option-flow/
│   │   ├── stock/
│   │   ├── stock/batch/
│   │   ├── test-news/
│   │   └── tts/
│   ├── economy/
│   ├── graphs/
│   ├── news/
│   ├── options/
│   ├── settings/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
├── data/
│   └── chats.json
├── lib/
├── types/
├── .env.example
├── next.config.ts
├── package.json
└── README.md
```

## Important Files

### Product Shell

- [app/layout.tsx](/Users/danielrajakumar/code/FinPilotAi/app/layout.tsx): app metadata, font load, initial theme script
- [app/globals.css](/Users/danielrajakumar/code/FinPilotAi/app/globals.css): global layout and all main styling
- [components/AppSidebar.tsx](/Users/danielrajakumar/code/FinPilotAi/components/AppSidebar.tsx): shared sidebar navigation
- [components/PageHeaderIcon.tsx](/Users/danielrajakumar/code/FinPilotAi/components/PageHeaderIcon.tsx): shared page-header icon style
- [components/ThemeProvider.tsx](/Users/danielrajakumar/code/FinPilotAi/components/ThemeProvider.tsx): theme context and persistence

### Chat + Persistence

- [app/page.tsx](/Users/danielrajakumar/code/FinPilotAi/app/page.tsx): chat UI, multi-tab sessions, voice mode, TTS, inline stock cards
- [app/api/chat/route.ts](/Users/danielrajakumar/code/FinPilotAi/app/api/chat/route.ts): chat orchestration and deterministic handlers
- [app/api/data/chat/route.ts](/Users/danielrajakumar/code/FinPilotAi/app/api/data/chat/route.ts): server-side chat save/load
- [data/chats.json](/Users/danielrajakumar/code/FinPilotAi/data/chats.json): current file-backed chat store

### Market / Macro / News

- [lib/yfinance.ts](/Users/danielrajakumar/code/FinPilotAi/lib/yfinance.ts): Yahoo Finance data layer
- [lib/fred.ts](/Users/danielrajakumar/code/FinPilotAi/lib/fred.ts): FRED data layer
- [lib/finance-news.ts](/Users/danielrajakumar/code/FinPilotAi/lib/finance-news.ts): News page aggregation and fallback logic
- [lib/news.ts](/Users/danielrajakumar/code/FinPilotAi/lib/news.ts): chat/news-analysis news fetcher
- [lib/option-flow.ts](/Users/danielrajakumar/code/FinPilotAi/lib/option-flow.ts): option-flow snapshot data
- [lib/econ-calendar.ts](/Users/danielrajakumar/code/FinPilotAi/lib/econ-calendar.ts): macro calendar schedule and insights

## Environment Variables

The code currently references these environment variables:

| Variable | Required | Used For |
| --- | --- | --- |
| `OPENAI_API_KEY` | Yes for chat + analysis | OpenAI completions in `lib/openai.ts` |
| `NEWS_API_KEY` | Optional but strongly recommended | NewsAPI lookups in `lib/news.ts`, `lib/finance-news.ts`, and `/api/test-news` |
| `FINNHUB_API_KEY` | Optional but recommended | Finnhub company-news fallback/complement in `lib/finance-news.ts` |
| `FRED_API_KEY` | Yes for economy dashboard | FRED series fetches in `lib/fred.ts` |
| `ELEVEN_LABS_API_KEY` | Required for voice playback | ElevenLabs TTS route |

The current `.env.example` is incomplete relative to the codebase. A real local `.env.local` should look more like this:

```bash
OPENAI_API_KEY=your_openai_api_key_here
NEWS_API_KEY=your_newsapi_key_here
FINNHUB_API_KEY=your_finnhub_api_key_here
FRED_API_KEY=your_fred_api_key_here
ELEVEN_LABS_API_KEY=your_elevenlabs_api_key_here
```

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment file

```bash
cp .env.example .env.local
```

Then add the missing variables documented above.

### 3. Start the dev server

```bash
npm run dev
```

### 4. Open the app

By default:

- [http://localhost:3000](http://localhost:3000)

The repo also includes a custom dev origin allowlist in [next.config.ts](/Users/danielrajakumar/code/FinPilotAi/next.config.ts) for `10.29.13.9`.

## Deployment

This project is deployable on Vercel without any database setup.

### Required deployment steps

1. Create the Vercel project
2. Add environment variables in the Vercel dashboard
3. Redeploy after changing environment variables

Suggested Vercel environment variables:

- `OPENAI_API_KEY`
- `NEWS_API_KEY`
- `FINNHUB_API_KEY`
- `FRED_API_KEY`
- `ELEVEN_LABS_API_KEY`

## Persistence Model

Chat persistence is split across two layers:

### Browser layer

Used for immediate restore on refresh:

- `localStorage` key: `finpilot-chat-store`
- `localStorage` key: `brainrotMode`
- `localStorage` key: `finpilot-theme`

### Server / filesystem layer

Used for saved chat state across browser sessions on the same deployment:

- file: [data/chats.json](/Users/danielrajakumar/code/FinPilotAi/data/chats.json)

Chat storage format is session-based:

```json
{
  "sessions": [
    {
      "id": "uuid",
      "title": "Chat title",
      "messages": [],
      "createdAt": "ISO timestamp",
      "updatedAt": "ISO timestamp"
    }
  ],
  "activeSessionId": "uuid"
}
```

## Design Notes

- Shared sidebar is implemented once and reused across all pages
- Shared page-header icon badges keep page headers visually consistent
- Scroll behavior is fixed at the app-shell level so long pages remain scrollable
- The app supports both light and dark themes

## What Is Live vs. What Is Not

### Live / fetched at runtime

- stock quotes
- stock history
- batch quotes
- most-active screener results
- earnings timestamps
- FRED macro data
- NewsAPI articles
- Finnhub company news
- MarketWatch RSS fallback
- OpenAI responses
- ElevenLabs speech audio

### Static / mocked / hand-maintained

- option-flow leaderboard data in `lib/option-flow.ts`
- economic calendar schedule and historical forecast/actual entries in `lib/econ-calendar.ts`
- sector stock universes in `app/graphs/page.tsx` and `app/api/chat/route.ts`
- market-cap candidate set and earnings candidate set used for some direct chat handlers

## Known Limitations and Caveats

### 1. Option Flow Is Not Truly Live

The Option Flow page markets itself as live unusual-flow analysis, but the actual implementation currently returns static mocked data. This is the most important product caveat in the repo.

### 2. Sector Universes Are Curated, Not Exhaustive

Sector suggestions and graphs operate on a hand-picked stock list, not on every listed company in a sector.

### 3. Market-Cap and Volume Leaderboards Are Universe-Limited

Some direct handlers rank from a practical Yahoo-driven candidate set rather than a full market census.

### 4. Voice Mode Needs Browser Support

Voice dictation depends on the browser speech-recognition API. Browsers without `SpeechRecognition` or `webkitSpeechRecognition` support will not support dictation.

### 5. File-Based Persistence Is Simple, Not Multi-User

`data/chats.json` is suitable for local or simple single-instance deployment. It is not a multi-user database design.

### 6. News Quality Depends on Available Keys

Without `NEWS_API_KEY` and `FINNHUB_API_KEY`, some news experiences degrade to fallback behavior.

## Developer Notes

### Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

### Type Definitions

Shared app types live in [types/index.ts](/Users/danielrajakumar/code/FinPilotAi/types/index.ts).

Notable types:

- `NewsArticle`
- `AnalysisResult`
- `ChatMessage`
- `ChatSession`
- `ChatStore`

### Styling

The project uses:

- one large global stylesheet at [app/globals.css](/Users/danielrajakumar/code/FinPilotAi/app/globals.css)
- inline JSX styles in some pages, especially `app/options/page.tsx`

### Navigation

Sidebar items are currently:

- Graphs
- Chat
- News
- Option Flow
- Economy
- Settings

## Suggested Improvements

If you continue developing this project, the highest-value next steps are:

- replace mocked option-flow data with a real provider
- upgrade `.env.example` to match the actual required keys
- move file-based chat storage to a proper per-user database
- centralize sector definitions instead of duplicating them across pages and chat handlers
- add tests for deterministic chat handler routes
- add monitoring around upstream API failures
- separate large inline UI blocks in `app/page.tsx`, `app/graphs/page.tsx`, and `app/economy/page.tsx` into smaller components

## Quick Start Summary

If you want the shortest path to running the app locally:

```bash
npm install
cp .env.example .env.local
```

Then set:

```bash
OPENAI_API_KEY=...
NEWS_API_KEY=...
FINNHUB_API_KEY=...
FRED_API_KEY=...
ELEVEN_LABS_API_KEY=...
```

Then run:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Current Status

FinPilotAI is already a usable financial dashboard and AI assistant, but it is best described as a strong prototype / product foundation rather than a fully normalized production platform. Its strongest traits are:

- fast product iteration
- good page coverage for market workflows
- practical use of live Yahoo/FRED/news data
- direct-handler logic for several high-value chat questions

Its biggest architectural weaknesses are:

- file-based persistence
- partially static data sources
- duplicated domain configuration in multiple files
- limited formal testing

That said, the project is coherent, deployable, and materially more capable than a simple “LLM wrapper” because it combines data APIs, deterministic financial logic, and a purpose-built UI.
