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

// Key economic indicators with their FRED series IDs
export const ECONOMIC_INDICATORS: Record<string, { id: string; title: string; units: string; description: string; color: string }> = {
  GDP: {
    id: 'GDP',
    title: 'Gross Domestic Product',
    units: 'Billions $',
    description: 'Total value of goods & services produced in the US',
    color: '#16a34a',
  },
  CPIAUCSL: {
    id: 'CPIAUCSL',
    title: 'Consumer Price Index (CPI)',
    units: 'Index (1982-84=100)',
    description: 'Measures inflation by tracking consumer prices',
    color: '#dc2626',
  },
  UNRATE: {
    id: 'UNRATE',
    title: 'Unemployment Rate',
    units: '%',
    description: 'Percentage of the labor force that is unemployed',
    color: '#2563eb',
  },
  FEDFUNDS: {
    id: 'FEDFUNDS',
    title: 'Federal Funds Rate',
    units: '%',
    description: 'Interest rate at which banks lend reserves overnight',
    color: '#9333ea',
  },
  DGS10: {
    id: 'DGS10',
    title: '10-Year Treasury Yield',
    units: '%',
    description: 'Yield on 10-year US government bonds',
    color: '#ea580c',
  },
  M2SL: {
    id: 'M2SL',
    title: 'M2 Money Supply',
    units: 'Billions $',
    description: 'Total money supply including cash, deposits, and near-money',
    color: '#0891b2',
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
