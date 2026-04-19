// FRED (Federal Reserve Economic Data) API client
// Docs: https://fred.stlouisfed.org/docs/api/fred/

const FRED_API_KEY = process.env.FRED_API_KEY || ''
const FRED_BASE_URL = 'https://api.stlouisfed.org/fred'

export interface FredObservation {
  date: string
  value: number | null
}

export interface FredSeries {
  id: string
  title: string
  units: string
  frequency: string
  observations: FredObservation[]
}

// Indicator metadata type
export interface IndicatorMeta {
  id: string
  title: string
  units: string
  description: string
  color: string
}

// Default indicators shown on the dashboard
export const DEFAULT_INDICATORS: Record<string, IndicatorMeta> = {
  FEDFUNDS: {
    id: 'FEDFUNDS',
    title: 'Interest Rate',
    units: '%',
    description: 'Federal Funds Rate — the rate at which banks lend reserves overnight',
    color: '#9333ea',
  },
  CPIAUCSL: {
    id: 'CPIAUCSL',
    title: 'Inflation (CPI)',
    units: 'Index (1982-84=100)',
    description: 'Consumer Price Index — measures price changes in a basket of goods',
    color: '#dc2626',
  },
  DGS10: {
    id: 'DGS10',
    title: '10-Year Bonds',
    units: '%',
    description: 'Yield on 10-year US government Treasury bonds',
    color: '#ea580c',
  },
  UNRATE: {
    id: 'UNRATE',
    title: 'Unemployment Rate',
    units: '%',
    description: 'Percentage of the labor force that is unemployed',
    color: '#2563eb',
  },
  IPMAN: {
    id: 'IPMAN',
    title: 'PMI (Manufacturing)',
    units: 'Index (2017=100)',
    description: 'Industrial Production: Manufacturing Index — tracks factory output',
    color: '#0891b2',
  },
  PAYEMS: {
    id: 'PAYEMS',
    title: 'Non-Farm Payrolls',
    units: 'Thousands',
    description: 'Total non-farm employees — key measure of job growth',
    color: '#16a34a',
  },
}

// Extended indicators for "View All"
export const ALL_INDICATORS: Record<string, IndicatorMeta> = {
  ...DEFAULT_INDICATORS,
  GDP: {
    id: 'GDP',
    title: 'Gross Domestic Product',
    units: 'Billions $',
    description: 'Total value of goods & services produced in the US',
    color: '#16a34a',
  },
  M2SL: {
    id: 'M2SL',
    title: 'M2 Money Supply',
    units: 'Billions $',
    description: 'Total money supply including cash, deposits, and near-money',
    color: '#6366f1',
  },
  PPIACO: {
    id: 'PPIACO',
    title: 'Producer Price Index',
    units: 'Index',
    description: 'Measures average changes in selling prices received by producers',
    color: '#f59e0b',
  },
  DGS2: {
    id: 'DGS2',
    title: '2-Year Treasury Yield',
    units: '%',
    description: 'Yield on 2-year US government bonds — sensitive to Fed policy',
    color: '#14b8a6',
  },
  T10Y2Y: {
    id: 'T10Y2Y',
    title: 'Yield Curve (10Y-2Y)',
    units: '%',
    description: 'Spread between 10Y and 2Y yields — negative = inversion signal',
    color: '#e11d48',
  },
  DEXUSEU: {
    id: 'DEXUSEU',
    title: 'USD/EUR Exchange Rate',
    units: 'USD per EUR',
    description: 'US Dollar to Euro exchange rate',
    color: '#7c3aed',
  },
  CSUSHPISA: {
    id: 'CSUSHPISA',
    title: 'Home Price Index',
    units: 'Index (Jan 2000=100)',
    description: 'S&P/Case-Shiller U.S. National Home Price Index',
    color: '#059669',
  },
  UMCSENT: {
    id: 'UMCSENT',
    title: 'Consumer Sentiment',
    units: 'Index (1966:Q1=100)',
    description: 'University of Michigan Consumer Sentiment Index',
    color: '#d97706',
  },
  JTSJOL: {
    id: 'JTSJOL',
    title: 'Job Openings (JOLTS)',
    units: 'Thousands',
    description: 'Total nonfarm job openings from JOLTS survey',
    color: '#0284c7',
  },
  VIXCLS: {
    id: 'VIXCLS',
    title: 'VIX (Volatility Index)',
    units: 'Index',
    description: 'CBOE Volatility Index — measures market fear/uncertainty',
    color: '#be123c',
  },
}

export async function getFredSeries(seriesId: string, limit: number = 120): Promise<FredSeries | null> {
  if (!FRED_API_KEY) {
    console.warn('FRED_API_KEY not configured')
    return null
  }

  try {
    // Fetch series info
    const infoUrl = `${FRED_BASE_URL}/series?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json`
    const infoRes = await fetch(infoUrl, { next: { revalidate: 3600 } })
    const infoData = await infoRes.json()
    const seriesInfo = infoData.seriess?.[0]

    // Fetch observations
    const obsUrl = `${FRED_BASE_URL}/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=${limit}`
    const obsRes = await fetch(obsUrl, { next: { revalidate: 3600 } })
    const obsData = await obsRes.json()

    const observations: FredObservation[] = (obsData.observations || [])
      .map((obs: any) => ({
        date: obs.date,
        value: obs.value === '.' ? null : parseFloat(obs.value),
      }))
      .filter((obs: FredObservation) => obs.value !== null)
      .reverse() // chronological order

    return {
      id: seriesId,
      title: seriesInfo?.title || seriesId,
      units: seriesInfo?.units || '',
      frequency: seriesInfo?.frequency || '',
      observations,
    }
  } catch (error) {
    console.error(`Failed to fetch FRED series ${seriesId}:`, error)
    return null
  }
}

export async function getMultipleSeries(seriesIds: string[]): Promise<Record<string, FredSeries>> {
  const results: Record<string, FredSeries> = {}
  
  const promises = seriesIds.map(async (id) => {
    const data = await getFredSeries(id)
    if (data) results[id] = data
  })

  await Promise.all(promises)
  return results
}
