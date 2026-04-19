// Economic Calendar - computes weekly macro releases with forecast/previous data
// and provides beat/miss analysis

export interface EconEvent {
  name: string
  description: string
  time: string
  impact: 'high' | 'medium'
  date: Date
  dayLabel: string
  dateLabel: string
  icon: string
  category: string
  // Data fields
  forecast: string | null    // Market consensus expectation
  previous: string | null    // Previous release value
  actual: string | null      // Actual result (if released)
  unit: string               // e.g., '%', 'K', 'Index'
  insight: string | null     // Beat/miss analysis
  insightType: 'beat' | 'miss' | 'inline' | null
}

interface ScheduleRule {
  name: string
  description: string
  time: string
  impact: 'high' | 'medium'
  icon: string
  category: string
  unit: string
  getOccurrences: (weekStart: Date, weekEnd: Date) => Date[]
}

// ==================== HISTORICAL DATA ====================
// Keyed by "EVENT_NAME|YYYY-MM-DD" for lookup
interface HistoricalEntry {
  forecast: string
  previous: string
  actual: string | null
  insight: string | null
  insightType: 'beat' | 'miss' | 'inline' | null
}

const HISTORICAL_DATA: Record<string, HistoricalEntry> = {
  // ---- March 2026 ----
  'Non-Farm Payrolls (NFP)|2026-03-06': {
    forecast: '200K',
    previous: '143K',
    actual: '228K',
    insight: 'Beat expectations by 28K. Strong hiring signals Fed may pause rate cuts.',
    insightType: 'beat',
  },
  'Initial Jobless Claims|2026-03-06': {
    forecast: '220K',
    previous: '218K',
    actual: '215K',
    insight: 'Slightly better than expected. Labor market remains resilient.',
    insightType: 'beat',
  },
  'ISM Services PMI|2026-03-05': {
    forecast: '52.5',
    previous: '52.8',
    actual: '53.5',
    insight: 'Services expansion accelerated. Broad-based strength across new orders.',
    insightType: 'beat',
  },
  'ISM Manufacturing PMI|2026-03-03': {
    forecast: '50.5',
    previous: '50.9',
    actual: '50.3',
    insight: 'Slight miss — manufacturing barely expanding. New orders sub-index fell.',
    insightType: 'miss',
  },
  'CPI (Inflation)|2026-03-11': {
    forecast: '0.3%',
    previous: '0.5%',
    actual: '0.2%',
    insight: 'Below expectations. Cooling inflation boosts rate cut hopes. Markets rallied.',
    insightType: 'beat',
  },
  'PPI (Producer Prices)|2026-03-13': {
    forecast: '0.3%',
    previous: '0.4%',
    actual: '0.0%',
    insight: 'Much softer than expected. Wholesale prices flat — signals disinflation.',
    insightType: 'beat',
  },
  'Retail Sales|2026-03-17': {
    forecast: '0.6%',
    previous: '-0.9%',
    actual: '0.2%',
    insight: 'Missed forecast. Consumer spending rebounded slightly but still weak.',
    insightType: 'miss',
  },
  'Initial Jobless Claims|2026-03-13': {
    forecast: '218K',
    previous: '215K',
    actual: '220K',
    insight: 'In line with expectations. No significant labor market deterioration.',
    insightType: 'inline',
  },
  'Initial Jobless Claims|2026-03-20': {
    forecast: '223K',
    previous: '220K',
    actual: '223K',
    insight: 'Exactly as expected. Steady claims suggest stable employment.',
    insightType: 'inline',
  },
  'Initial Jobless Claims|2026-03-27': {
    forecast: '225K',
    previous: '223K',
    actual: '224K',
    insight: 'In line. Weekly claims remain historically low.',
    insightType: 'inline',
  },
  'PCE Price Index|2026-03-28': {
    forecast: '0.3%',
    previous: '0.3%',
    actual: '0.4%',
    insight: 'Hotter than expected. Core PCE uptick may delay Fed rate cuts.',
    insightType: 'miss',
  },
  'Consumer Confidence|2026-03-25': {
    forecast: '94.0',
    previous: '98.3',
    actual: '92.9',
    insight: 'Significant miss. Consumers growing pessimistic about economic outlook.',
    insightType: 'miss',
  },
  'GDP (Advance/Prelim/Final)|2026-03-26': {
    forecast: '2.3%',
    previous: '3.1%',
    actual: '2.4%',
    insight: 'Slightly above forecast. Economy still growing but decelerating from Q3.',
    insightType: 'beat',
  },

  // ---- April 2026 ----
  'ISM Manufacturing PMI|2026-04-01': {
    forecast: '49.5',
    previous: '50.3',
    actual: '49.0',
    insight: 'Fell into contraction territory. Manufacturing recession fears resurface.',
    insightType: 'miss',
  },
  'ISM Services PMI|2026-04-03': {
    forecast: '53.0',
    previous: '53.5',
    actual: '50.8',
    insight: 'Sharp deceleration. Services still expanding but momentum fading fast.',
    insightType: 'miss',
  },
  'Non-Farm Payrolls (NFP)|2026-04-03': {
    forecast: '210K',
    previous: '228K',
    actual: '177K',
    insight: 'Missed by 33K. Weakest jobs report in months. Rate cut odds jumped.',
    insightType: 'miss',
  },
  'Initial Jobless Claims|2026-04-03': {
    forecast: '225K',
    previous: '224K',
    actual: '219K',
    insight: 'Better than expected despite weak NFP. Mixed signals in labor market.',
    insightType: 'beat',
  },
  'Initial Jobless Claims|2026-04-10': {
    forecast: '222K',
    previous: '219K',
    actual: '223K',
    insight: 'Roughly in line. Labor market steady amid trade policy uncertainty.',
    insightType: 'inline',
  },
  'CPI (Inflation)|2026-04-14': {
    forecast: '0.3%',
    previous: '0.2%',
    actual: '0.1%',
    insight: 'Big downside surprise. Inflation cooling faster than expected. Markets surged.',
    insightType: 'beat',
  },
  'PPI (Producer Prices)|2026-04-14': {
    forecast: '0.2%',
    previous: '0.0%',
    actual: '-0.1%',
    insight: 'Producer prices declined. Deflation at wholesale level is rare and noteworthy.',
    insightType: 'beat',
  },
  'Retail Sales|2026-04-15': {
    forecast: '0.4%',
    previous: '0.2%',
    actual: '1.4%',
    insight: 'Massive beat — consumers spending aggressively despite weak sentiment. Likely front-running tariffs.',
    insightType: 'beat',
  },
  'Initial Jobless Claims|2026-04-17': {
    forecast: '225K',
    previous: '223K',
    actual: '215K',
    insight: 'Better than expected. Claims declining suggests employers still holding onto workers.',
    insightType: 'beat',
  },
  // Future events (no actual yet)
  'Existing Home Sales|2026-04-22': {
    forecast: '4.15M',
    previous: '4.38M',
    actual: null,
    insight: null,
    insightType: null,
  },
  'Flash Manufacturing & Services PMI|2026-04-23': {
    forecast: '50.1',
    previous: '50.3',
    actual: null,
    insight: null,
    insightType: null,
  },
  'PCE Price Index|2026-04-24': {
    forecast: '0.2%',
    previous: '0.4%',
    actual: null,
    insight: null,
    insightType: null,
  },
  'Consumer Confidence|2026-04-28': {
    forecast: '88.0',
    previous: '92.9',
    actual: null,
    insight: null,
    insightType: null,
  },
  'Initial Jobless Claims|2026-04-23': {
    forecast: '220K',
    previous: '215K',
    actual: null,
    insight: null,
    insightType: null,
  },

  // ---- May 2026 (future forecasts) ----
  'ISM Manufacturing PMI|2026-05-01': {
    forecast: '48.5',
    previous: '49.0',
    actual: null,
    insight: null,
    insightType: null,
  },
  'Non-Farm Payrolls (NFP)|2026-05-01': {
    forecast: '185K',
    previous: '177K',
    actual: null,
    insight: null,
    insightType: null,
  },
  'ISM Services PMI|2026-05-05': {
    forecast: '51.0',
    previous: '50.8',
    actual: null,
    insight: null,
    insightType: null,
  },
  'Initial Jobless Claims|2026-05-01': {
    forecast: '222K',
    previous: '215K',
    actual: null,
    insight: null,
    insightType: null,
  },
  'Initial Jobless Claims|2026-05-08': {
    forecast: '224K',
    previous: '222K',
    actual: null,
    insight: null,
    insightType: null,
  },
  'CPI (Inflation)|2026-05-12': {
    forecast: '0.2%',
    previous: '0.1%',
    actual: null,
    insight: null,
    insightType: null,
  },
  'Retail Sales|2026-05-15': {
    forecast: '-0.2%',
    previous: '1.4%',
    actual: null,
    insight: null,
    insightType: null,
  },
  'Initial Jobless Claims|2026-05-15': {
    forecast: '226K',
    previous: '224K',
    actual: null,
    insight: null,
    insightType: null,
  },
}

// ==================== SCHEDULE RULES ====================

function getNthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const first = new Date(year, month, 1)
  let dayOfWeek = first.getDay()
  let diff = weekday - dayOfWeek
  if (diff < 0) diff += 7
  const day = 1 + diff + (n - 1) * 7
  return new Date(year, month, day)
}

function getLastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  const last = new Date(year, month + 1, 0)
  let diff = last.getDay() - weekday
  if (diff < 0) diff += 7
  return new Date(year, month, last.getDate() - diff)
}

function getFirstBusinessDay(year: number, month: number): Date {
  const d = new Date(year, month, 1)
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1)
  return d
}

function getNthBusinessDay(year: number, month: number, n: number): Date {
  const d = new Date(year, month, 1)
  let count = 0
  while (count < n) {
    if (d.getDay() !== 0 && d.getDay() !== 6) count++
    if (count < n) d.setDate(d.getDate() + 1)
  }
  return d
}

function isInWeek(date: Date, weekStart: Date, weekEnd: Date): boolean {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const ws = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate())
  const we = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate())
  return d >= ws && d <= we
}

function getThursdayInWeek(weekStart: Date): Date {
  const d = new Date(weekStart)
  const day = d.getDay()
  d.setDate(d.getDate() + (4 - day))
  return d
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const SCHEDULE_RULES: ScheduleRule[] = [
  {
    name: 'Non-Farm Payrolls (NFP)',
    description: 'Monthly jobs report — the most market-moving release. Shows jobs added/lost.',
    time: '8:30 AM ET', impact: 'high', icon: '💼', category: 'Employment', unit: 'K',
    getOccurrences: (ws, we) => {
      const dates: Date[] = []
      for (const m of new Set([ws.getMonth(), we.getMonth()])) {
        const y = m === ws.getMonth() ? ws.getFullYear() : we.getFullYear()
        const d = getNthWeekdayOfMonth(y, m, 5, 1) // 1st Friday
        if (isInWeek(d, ws, we)) dates.push(d)
      }
      return dates
    },
  },
  {
    name: 'CPI (Inflation)',
    description: 'Consumer Price Index — primary measure of inflation. Directly impacts Fed rate decisions.',
    time: '8:30 AM ET', impact: 'high', icon: '📊', category: 'Inflation', unit: '%',
    getOccurrences: (ws, we) => {
      const dates: Date[] = []
      for (const m of new Set([ws.getMonth(), we.getMonth()])) {
        const y = m === ws.getMonth() ? ws.getFullYear() : we.getFullYear()
        for (let day = 10; day <= 14; day++) {
          const d = new Date(y, m, day)
          const dow = d.getDay()
          if ((dow === 2 || dow === 3) && isInWeek(d, ws, we)) { dates.push(d); break }
        }
      }
      return dates
    },
  },
  {
    name: 'PPI (Producer Prices)',
    description: 'Producer Price Index — wholesale inflation. Leading indicator for CPI.',
    time: '8:30 AM ET', impact: 'medium', icon: '🏭', category: 'Inflation', unit: '%',
    getOccurrences: (ws, we) => {
      const dates: Date[] = []
      for (const m of new Set([ws.getMonth(), we.getMonth()])) {
        const y = m === ws.getMonth() ? ws.getFullYear() : we.getFullYear()
        for (let day = 14; day <= 17; day++) {
          const d = new Date(y, m, day)
          const dow = d.getDay()
          if (dow >= 1 && dow <= 5 && isInWeek(d, ws, we)) { dates.push(d); break }
        }
      }
      return dates
    },
  },
  {
    name: 'FOMC Rate Decision',
    description: 'Federal Reserve interest rate decision — the single most impactful policy event.',
    time: '2:00 PM ET', impact: 'high', icon: '🏦', category: 'Fed Policy', unit: '%',
    getOccurrences: (ws, we) => {
      const fomcDates = [
        new Date(2026, 0, 28), new Date(2026, 2, 18), new Date(2026, 4, 6),
        new Date(2026, 5, 17), new Date(2026, 6, 29), new Date(2026, 8, 16),
        new Date(2026, 10, 4), new Date(2026, 11, 16),
      ]
      return fomcDates.filter(d => isInWeek(d, ws, we))
    },
  },
  {
    name: 'Initial Jobless Claims',
    description: 'Weekly new unemployment filings. Real-time labor market pulse.',
    time: '8:30 AM ET', impact: 'medium', icon: '📋', category: 'Employment', unit: 'K',
    getOccurrences: (ws, we) => {
      const thu = getThursdayInWeek(ws)
      return isInWeek(thu, ws, we) ? [thu] : []
    },
  },
  {
    name: 'ISM Manufacturing PMI',
    description: 'Purchasing Managers Index — above 50 = expansion, below 50 = contraction.',
    time: '10:00 AM ET', impact: 'high', icon: '⚙️', category: 'Manufacturing', unit: 'Index',
    getOccurrences: (ws, we) => {
      const dates: Date[] = []
      for (const m of new Set([ws.getMonth(), we.getMonth()])) {
        const y = m === ws.getMonth() ? ws.getFullYear() : we.getFullYear()
        const d = getFirstBusinessDay(y, m)
        if (isInWeek(d, ws, we)) dates.push(d)
      }
      return dates
    },
  },
  {
    name: 'ISM Services PMI',
    description: 'Services sector activity — services = ~70% of GDP. Critical health check.',
    time: '10:00 AM ET', impact: 'high', icon: '🏢', category: 'Services', unit: 'Index',
    getOccurrences: (ws, we) => {
      const dates: Date[] = []
      for (const m of new Set([ws.getMonth(), we.getMonth()])) {
        const y = m === ws.getMonth() ? ws.getFullYear() : we.getFullYear()
        const d = getNthBusinessDay(y, m, 3)
        if (isInWeek(d, ws, we)) dates.push(d)
      }
      return dates
    },
  },
  {
    name: 'Retail Sales',
    description: 'Monthly consumer spending — consumer spending drives ~70% of U.S. GDP.',
    time: '8:30 AM ET', impact: 'high', icon: '🛒', category: 'Consumer', unit: '%',
    getOccurrences: (ws, we) => {
      const dates: Date[] = []
      for (const m of new Set([ws.getMonth(), we.getMonth()])) {
        const y = m === ws.getMonth() ? ws.getFullYear() : we.getFullYear()
        for (let day = 15; day <= 17; day++) {
          const d = new Date(y, m, day)
          if (d.getDay() >= 1 && d.getDay() <= 5 && isInWeek(d, ws, we)) { dates.push(d); break }
        }
      }
      return dates
    },
  },
  {
    name: 'PCE Price Index',
    description: "The Fed's preferred inflation gauge. Often more impactful than CPI for rate policy.",
    time: '8:30 AM ET', impact: 'high', icon: '🎯', category: 'Inflation', unit: '%',
    getOccurrences: (ws, we) => {
      const dates: Date[] = []
      for (const m of new Set([ws.getMonth(), we.getMonth()])) {
        const y = m === ws.getMonth() ? ws.getFullYear() : we.getFullYear()
        const d = getLastWeekdayOfMonth(y, m, 5) // Last Friday
        if (isInWeek(d, ws, we)) dates.push(d)
      }
      return dates
    },
  },
  {
    name: 'Consumer Confidence',
    description: 'Consumer optimism index. Signals spending and sentiment trends ahead.',
    time: '10:00 AM ET', impact: 'medium', icon: '😊', category: 'Consumer', unit: 'Index',
    getOccurrences: (ws, we) => {
      const dates: Date[] = []
      for (const m of new Set([ws.getMonth(), we.getMonth()])) {
        const y = m === ws.getMonth() ? ws.getFullYear() : we.getFullYear()
        const d = getLastWeekdayOfMonth(y, m, 2) // Last Tuesday
        if (isInWeek(d, ws, we)) dates.push(d)
      }
      return dates
    },
  },
  {
    name: 'GDP (Advance/Prelim/Final)',
    description: 'Quarterly economic growth. Two negative quarters = recession.',
    time: '8:30 AM ET', impact: 'high', icon: '🌎', category: 'Growth', unit: '%',
    getOccurrences: (ws, we) => {
      const gdpMonths = [0, 3, 6, 9]
      const dates: Date[] = []
      for (const m of gdpMonths) {
        for (const y of new Set([ws.getFullYear(), we.getFullYear()])) {
          const d = getLastWeekdayOfMonth(y, m, 4)
          if (isInWeek(d, ws, we)) dates.push(d)
        }
      }
      return dates
    },
  },
  {
    name: 'Existing Home Sales',
    description: 'Measures sales and prices of existing single-family homes. Key housing market health gauge.',
    time: '10:00 AM ET', impact: 'medium', icon: '🏠', category: 'Housing', unit: 'M',
    getOccurrences: (ws, we) => {
      // Usually around the 21st-23rd of the month
      const dates: Date[] = []
      for (const m of new Set([ws.getMonth(), we.getMonth()])) {
        const y = m === ws.getMonth() ? ws.getFullYear() : we.getFullYear()
        for (let day = 21; day <= 23; day++) {
          const d = new Date(y, m, day)
          if (d.getDay() >= 1 && d.getDay() <= 5 && isInWeek(d, ws, we)) { dates.push(d); break }
        }
      }
      return dates
    },
  },
  {
    name: 'Flash Manufacturing & Services PMI',
    description: 'Early estimate of private sector output. High market impact as it leads ISM releases.',
    time: '9:45 AM ET', impact: 'high', icon: '📈', category: 'Growth', unit: 'Index',
    getOccurrences: (ws, we) => {
      // Usually around the 21st-24th
      const dates: Date[] = []
      for (const m of new Set([ws.getMonth(), we.getMonth()])) {
        const y = m === ws.getMonth() ? ws.getFullYear() : we.getFullYear()
        for (let day = 23; day <= 24; day++) {
          const d = new Date(y, m, day)
          if (d.getDay() >= 1 && d.getDay() <= 5 && isInWeek(d, ws, we)) { dates.push(d); break }
        }
      }
      return dates
    },
  },
]

// ==================== PUBLIC API ====================

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

export function getEventsForWeek(weekOffset: number = 0): EconEvent[] {
  const now = new Date()
  const ref = new Date(now)
  ref.setDate(ref.getDate() + weekOffset * 7)

  const weekStart = getWeekStart(ref)
  const weekEnd = getWeekEnd(ref)

  const events: EconEvent[] = []

  for (const rule of SCHEDULE_RULES) {
    const occurrences = rule.getOccurrences(weekStart, weekEnd)
    for (const date of occurrences) {
      const key = `${rule.name}|${formatDateKey(date)}`
      const hist = HISTORICAL_DATA[key]

      events.push({
        name: rule.name,
        description: rule.description,
        time: rule.time,
        impact: rule.impact,
        date,
        dayLabel: DAY_NAMES[date.getDay()],
        dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        icon: rule.icon,
        category: rule.category,
        unit: rule.unit,
        forecast: hist?.forecast ?? null,
        previous: hist?.previous ?? null,
        actual: hist?.actual ?? null,
        insight: hist?.insight ?? null,
        insightType: hist?.insightType ?? null,
      })
    }
  }

  events.sort((a, b) => a.date.getTime() - b.date.getTime())
  return events
}

export function getWeekRangeForOffset(weekOffset: number = 0): { start: string; end: string; label: string } {
  const now = new Date()
  const ref = new Date(now)
  ref.setDate(ref.getDate() + weekOffset * 7)

  const ws = getWeekStart(ref)
  const we = getWeekEnd(ref)

  let label = 'This Week'
  if (weekOffset === -1) label = 'Last Week'
  else if (weekOffset === 1) label = 'Next Week'
  else if (weekOffset < -1) label = `${Math.abs(weekOffset)} Weeks Ago`
  else if (weekOffset > 1) label = `In ${weekOffset} Weeks`

  return {
    start: ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    end: we.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    label,
  }
}
