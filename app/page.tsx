"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer
} from 'recharts'
import {
  X,
  Send,
  Aperture,
  TrendingUp,
  TrendingDown,
  Zap,
  Mic,
  MicOff,
  Volume2,
  Loader2,
  AudioLines
} from 'lucide-react'
import { ChatMessage } from '@/types'
import ReactMarkdown from 'react-markdown'
import { motion, AnimatePresence } from 'framer-motion'
import CompanyLogo from '@/components/CompanyLogo'
import AppSidebar from '@/components/AppSidebar'

interface MiniStockData {
  quote: {
    name: string
    symbol: string
    price: number
    change: number
    changePercent: number
    dayHigh: number
    dayLow: number
    volume: number
    marketCap: number
  } | null
  history: { date: string; close: number }[]
}

interface VoiceQueueItem {
  audioUrl: string
  text: string
}

const PERIOD_OPTIONS = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
]

function InlineStockCard({ ticker }: { ticker: string }) {
  const [data, setData] = useState<MiniStockData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activePeriod, setActivePeriod] = useState(1) // default 1M
  const [expanded, setExpanded] = useState(false)
  const [chartLoading, setChartLoading] = useState(false)

  const fetchStockData = useCallback(async (days: number, isInitial = false) => {
    if (isInitial) setLoading(true)
    else setChartLoading(true)
    try {
      const res = await fetch(`/api/stock?symbol=${ticker}&period=${days}`)
      const result = await res.json()
      setData(result)
    } catch (err) {
      console.error('Failed to fetch stock for card:', err)
    } finally {
      if (isInitial) setLoading(false)
      else setChartLoading(false)
    }
  }, [ticker])

  useEffect(() => {
    fetchStockData(PERIOD_OPTIONS[activePeriod].days, true)
  }, [ticker]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePeriodChange = (index: number) => {
    if (index === activePeriod) return
    setActivePeriod(index)
    fetchStockData(PERIOD_OPTIONS[index].days)
  }

  if (loading) {
    return (
      <div className="inline-stock-card loading-card">
        <div className="isc-shimmer" />
        <div className="isc-shimmer short" />
        <div className="isc-shimmer chart-shimmer" />
      </div>
    )
  }

  if (!data?.quote) return null

  const isPositive = data.quote.change >= 0
  const gradientColor = isPositive ? '#22c55e' : '#ef4444'
  const lineColor = isPositive ? '#16a34a' : '#dc2626'

  // Compute 30d performance from history
  let periodReturn = ''
  if (data.history.length >= 2) {
    const oldest = data.history[0].close
    const newest = data.history[data.history.length - 1].close
    const pct = ((newest - oldest) / oldest) * 100
    periodReturn = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
  }

  return (
    <div className={`inline-stock-card ${expanded ? 'expanded' : ''}`}>
      {/* Live indicator */}
      <div className="isc-live-badge">
        <span className="isc-live-dot" />
        LIVE
      </div>

      <div className="isc-header">
        <div className="isc-title-area" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CompanyLogo symbol={data.quote.symbol} size={28} />
          <span className="isc-symbol">{data.quote.symbol}</span>
          <span className="isc-name">{data.quote.name || 'Unknown Company'}</span>
        </div>
        <div className="isc-price-block">
          <span className="isc-price">${data.quote.price.toFixed(2)}</span>
          <span className={`isc-change ${isPositive ? 'up' : 'down'}`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {isPositive ? '+' : ''}{data.quote.change.toFixed(2)} ({isPositive ? '+' : ''}{data.quote.changePercent.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* Period toggles */}
      <div className="isc-period-row">
        <div className="isc-period-toggles">
          {PERIOD_OPTIONS.map((p, i) => (
            <button
              key={p.label}
              className={`isc-period-btn ${activePeriod === i ? 'active' : ''}`}
              onClick={() => handlePeriodChange(i)}
            >
              {p.label}
            </button>
          ))}
        </div>
        {periodReturn && (
          <span className={`isc-period-return ${data.history.length >= 2 && data.history[data.history.length - 1].close >= data.history[0].close ? 'up' : 'down'}`}>
            {PERIOD_OPTIONS[activePeriod].label}: {periodReturn}
          </span>
        )}
      </div>

      {/* Chart */}
      {data.history.length > 0 && (
        <div className={`isc-chart ${chartLoading ? 'chart-loading' : ''}`}>
          <ResponsiveContainer width="100%" height={expanded ? 180 : 120}>
            <AreaChart data={data.history} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${ticker}-${activePeriod}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={gradientColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={gradientColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                tickFormatter={(val: string) => {
                  const d = new Date(val)
                  return `${d.getMonth() + 1}/${d.getDate()}`
                }}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                width={50}
                tickFormatter={(val: number) => `$${val.toFixed(0)}`}
              />
              <Tooltip
                contentStyle={{
                  background: '#1c1c1e', border: 'none', borderRadius: '10px',
                  padding: '8px 14px', color: '#fff', fontSize: '13px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                }}
                formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Price']}
                labelStyle={{ color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}
                labelFormatter={(label: any) => {
                  const d = new Date(String(label))
                  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                }}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke={lineColor}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#grad-${ticker}-${activePeriod})`}
                animationDuration={600}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stats grid */}
      <div className="isc-stats">
        <div className="isc-stat">
          <span className="isc-stat-label">Day Range</span>
          <span className="isc-stat-value">${data.quote.dayLow.toFixed(2)} – ${data.quote.dayHigh.toFixed(2)}</span>
        </div>
        <div className="isc-stat">
          <span className="isc-stat-label">Volume</span>
          <span className="isc-stat-value">{(data.quote.volume / 1e6).toFixed(1)}M</span>
        </div>
        <div className="isc-stat">
          <span className="isc-stat-label">Mkt Cap</span>
          <span className="isc-stat-value">
            {data.quote.marketCap >= 1e12
              ? `$${(data.quote.marketCap / 1e12).toFixed(2)}T`
              : `$${(data.quote.marketCap / 1e9).toFixed(1)}B`}
          </span>
        </div>
      </div>

      {/* Expandable extra stats */}
      {expanded && (
        <div className="isc-stats isc-stats-extra">
          <div className="isc-stat">
            <span className="isc-stat-label">Open</span>
            <span className="isc-stat-value">${data.quote.price.toFixed(2)}</span>
          </div>
          <div className="isc-stat">
            <span className="isc-stat-label">Prev Close</span>
            <span className="isc-stat-value">${(data.quote.price - data.quote.change).toFixed(2)}</span>
          </div>
          <div className="isc-stat">
            <span className="isc-stat-label">Today</span>
            <span className={`isc-stat-value ${isPositive ? 'stat-up' : 'stat-down'}`}>
              {isPositive ? '+' : ''}{data.quote.changePercent.toFixed(2)}%
            </span>
          </div>
        </div>
      )}

      {/* Expand / Collapse toggle */}
      <button className="isc-expand-btn" onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Show Less' : 'More Details'}
      </button>
    </div>
  )
}

export default function ChatDashboard() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // Voice states
  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef<any>(null)
  
  // TTS states
  const [playingTTSMessageId, setPlayingTTSMessageId] = useState<string | null>(null)
  const [ttsLoadingId, setTtsLoadingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // SSE TTS Queue Engine
  const audioQueueRef = useRef<VoiceQueueItem[]>([])
  const isPlayingAudioRef = useRef(false)
  const captionProgressTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Full Screen Voice states
  const [isFullScreenVoice, setIsFullScreenVoice] = useState(false)
  const isVoiceActiveRef = useRef(false)
  const chatAbortControllerRef = useRef<AbortController | null>(null)
  const [voiceOrigin, setVoiceOrigin] = useState({ x: '50%', y: '85%' })
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle')
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [voiceCaption, setVoiceCaption] = useState('')
  const [activeCaptionWordIndex, setActiveCaptionWordIndex] = useState(0)
  const voiceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)

  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop()
      setIsRecording(false)
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert("Your browser does not support the Web Speech API. Please try Chrome or Safari.")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onstart = () => setIsRecording(true)
    recognition.onend = () => setIsRecording(false)
    recognition.onerror = () => setIsRecording(false)

    // Save initial value to append
    const startValue = inputValue

    recognition.onresult = (event: any) => {
      let currentTrans = ''
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        currentTrans += event.results[i][0].transcript
      }
      setInputValue((startValue ? startValue + ' ' : '') + currentTrans)
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const playTTS = async (text: string, messageId: string) => {
    if (playingTTSMessageId === messageId && audioRef.current) {
      audioRef.current.pause()
      setPlayingTTSMessageId(null)
      return
    }
    try {
      setTtsLoadingId(messageId)
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // strip markdown from text so elevenlabs doesn't speak asterisks
        body: JSON.stringify({ text: text.replace(/[*_#`]/g, '') })
      })
      if (!res.ok) throw new Error('TTS Failed')
      const blob = await res.blob()
      const audioUrl = URL.createObjectURL(blob)
      if (audioRef.current) audioRef.current.pause()
      const audio = new Audio(audioUrl)
      audioRef.current = audio
      audio.onplay = () => {
        setTtsLoadingId(null)
        setPlayingTTSMessageId(messageId)
      }
      audio.onended = () => setPlayingTTSMessageId(null)
      audio.play()
    } catch (err) {
      console.error(err)
      setTtsLoadingId(null)
    }
  }

  const clearVoiceCaptionProgress = () => {
    if (captionProgressTimerRef.current) {
      clearInterval(captionProgressTimerRef.current)
      captionProgressTimerRef.current = null
    }
  }

  const sanitizeSpeechText = (text: string) => text.replace(/[*_#`]/g, '').replace(/\s+/g, ' ').trim()

  const startCaptionProgress = (text: string, audio: HTMLAudioElement) => {
    const words = text.split(/\s+/).filter(Boolean)
    setVoiceCaption(text)
    setActiveCaptionWordIndex(0)

    clearVoiceCaptionProgress()

    if (words.length === 0) {
      return
    }

    const updateWordIndex = () => {
      const duration = audio.duration
      const currentTime = audio.currentTime

      if (!duration || !Number.isFinite(duration) || duration <= 0) {
        return
      }

      const progress = Math.min(Math.max(currentTime / duration, 0), 0.999)
      const nextIndex = Math.min(words.length - 1, Math.floor(progress * words.length))
      setActiveCaptionWordIndex(nextIndex)
    }

    audio.onloadedmetadata = updateWordIndex
    audio.ontimeupdate = updateWordIndex

    captionProgressTimerRef.current = setInterval(updateWordIndex, 80)
  }

  const playNextInQueue = () => {
    if (!isVoiceActiveRef.current) {
      audioQueueRef.current.forEach(item => URL.revokeObjectURL(item.audioUrl))
      audioQueueRef.current = []
      clearVoiceCaptionProgress()
      setVoiceCaption('')
      setActiveCaptionWordIndex(0)
      return
    }

    if (audioQueueRef.current.length === 0) {
      isPlayingAudioRef.current = false
      clearVoiceCaptionProgress()
      setVoiceCaption('')
      setActiveCaptionWordIndex(0)
      return
    }

    isPlayingAudioRef.current = true
    const queueItem = audioQueueRef.current.shift()!
    
    if (!audioRef.current) audioRef.current = new Audio()
    audioRef.current.pause()
    audioRef.current.src = queueItem.audioUrl
    startCaptionProgress(queueItem.text, audioRef.current)
    audioRef.current.onended = () => {
      clearVoiceCaptionProgress()
      URL.revokeObjectURL(queueItem.audioUrl)
      playNextInQueue()
    }
    audioRef.current.play().catch((err) => {
      console.error('Audio playback rejected:', err)
      clearVoiceCaptionProgress()
      URL.revokeObjectURL(queueItem.audioUrl)
      playNextInQueue()
    })
  }

  const enqueueVoiceChunk = async (sentence: string) => {
    if (!isVoiceActiveRef.current) return
    setVoiceState('speaking')
    try {
      const cleanSentence = sanitizeSpeechText(sentence)
      if (!cleanSentence) return

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanSentence })
      })
      if (!res.ok) throw new Error('TTS Failed')
      const blob = await res.blob()
      if (!isVoiceActiveRef.current) return
      
      const audioUrl = URL.createObjectURL(blob)
      audioQueueRef.current.push({
        audioUrl,
        text: cleanSentence,
      })
      
      if (!isPlayingAudioRef.current) {
        playNextInQueue()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const toggleFullScreenVoice = (e: React.MouseEvent) => {
    // Unlock the browser's audio context synchronously during this trusted user click event
    if (!audioRef.current) {
      audioRef.current = new Audio()
    }
    // Play a tiny, silent base64 WAV file to bypass Safari/Chrome async autoplay restrictions
    audioRef.current.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA"
    audioRef.current.play().catch(() => {})

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    setVoiceOrigin({ x: `${x}px`, y: `${y}px` })
    setIsFullScreenVoice(true)
    isVoiceActiveRef.current = true
    setVoiceState('listening')
  }

  const closeFullScreenVoice = () => {
    setIsFullScreenVoice(false)
    isVoiceActiveRef.current = false
    setVoiceState('idle')
    setIsLoading(false)
    
    // Hard-cancel any pending ChatGPT text generation streams!
    if (chatAbortControllerRef.current) {
      chatAbortControllerRef.current.abort()
      chatAbortControllerRef.current = null
    }

    if (recognitionRef.current) recognitionRef.current.stop()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current.ontimeupdate = null
      audioRef.current.onloadedmetadata = null
    }
    audioQueueRef.current.forEach(item => URL.revokeObjectURL(item.audioUrl))
    audioQueueRef.current = []
    isPlayingAudioRef.current = false
    clearVoiceCaptionProgress()
    setVoiceCaption('')
    setActiveCaptionWordIndex(0)
    if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current)
  }

  // Voice Interaction Orchestrator Loop
  useEffect(() => {
    if (!isFullScreenVoice || voiceState !== 'listening') return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
       alert('Speech Recognition unsupported')
       return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true

    let localTranscript = ''

    recognition.onstart = () => setVoiceTranscript('')

    recognition.onresult = (event: any) => {
      if (!isVoiceActiveRef.current) return // Prevent final stop() from queuing zombie fetch timeouts
      
      let finalStr = ''
      let interimStr = ''
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalStr += event.results[i][0].transcript
        else interimStr += event.results[i][0].transcript
      }
      localTranscript = finalStr + interimStr
      setVoiceTranscript(localTranscript)

      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current)
      
      voiceTimeoutRef.current = setTimeout(() => {
         recognition.stop()
         if (localTranscript.trim()) {
           setVoiceState('thinking')
           handleSend(localTranscript, true)
         } else {
           setVoiceState('idle') 
           setTimeout(() => setVoiceState('listening'), 50)
         }
      }, 2000)
    }

    recognition.onerror = () => {
       setVoiceState('idle')
       setTimeout(() => setVoiceState('listening'), 500)
    }

    recognitionRef.current = recognition
    recognition.start()

    return () => {
      recognition.stop()
    }
  }, [isFullScreenVoice, voiceState])

  // Auto-save history whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      fetch('/api/data/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages)
      }).catch(err => console.error('Failed to auto-save:', err))
    }
  }, [messages])

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async (content: string, isVoiceMode = false) => {
    if (!content.trim() || isLoading) return

    if (chatAbortControllerRef.current) chatAbortControllerRef.current.abort()
    const abortController = new AbortController()
    chatAbortControllerRef.current = abortController

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, userMessage],
          brainrotMode: localStorage.getItem('brainrotMode') === 'true'
        }),
        signal: abortController.signal
      })

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let streamingMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, streamingMessage]);
      setIsLoading(false);

      let sentenceBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') break;
            if (!dataStr) continue;
            
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.meta?.tickers) {
                streamingMessage.tickers = parsed.meta.tickers;
                setMessages(prev => prev.map(m => m.id === streamingMessage.id ? { ...streamingMessage } : m));
              } else if (parsed.text) {
                streamingMessage.content += parsed.text;
                setMessages(prev => prev.map(m => m.id === streamingMessage.id ? { ...streamingMessage } : m));

                if (isVoiceMode && isVoiceActiveRef.current) {
                  sentenceBuffer += parsed.text;
                  if (/[.!?,;:]\s/.test(sentenceBuffer) || /[.!?,;:]$/.test(sentenceBuffer) || /\n/.test(sentenceBuffer)) {
                    const match = sentenceBuffer.match(/([\s\S]*?[.!?,;:\n])(?:\s|$)([\s\S]*)/);
                    if (match) {
                      const sentence = match[1].trim();
                      const remainder = match[2] || "";
                      if (sentence.replace(/[*_#`]/g, '').trim()) {
                        enqueueVoiceChunk(sentence);
                      }
                      sentenceBuffer = remainder;
                    }
                  }
                }
              }
            } catch (e) {}
          }
        }
      }
      
      if (isVoiceMode && isVoiceActiveRef.current && sentenceBuffer.trim()) {
        const cleanFinal = sentenceBuffer.trim().replace(/[*_#`]/g, '');
        if (cleanFinal) enqueueVoiceChunk(sentenceBuffer.trim());
      }
      
      if (isVoiceMode && isVoiceActiveRef.current) {
        // Wait gracefully for the entire audio queue to empty before flipping back to listening mode
        const checkAudioInterval = setInterval(() => {
          if (!isPlayingAudioRef.current && audioQueueRef.current.length === 0) {
            clearInterval(checkAudioInterval);
            if (isVoiceActiveRef.current) setVoiceState('listening');
          }
        }, 300);
      }
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setMessages(prev => prev.filter(m => m.id !== userMessage.id))
      } else {
        console.error('Failed to send message:', error)
        if (isVoiceMode && isVoiceActiveRef.current) setVoiceState('listening')
      }
      setIsLoading(false)
    }
  }

  const handlePromptClick = (text: string) => {
    handleSend(text)
  }

  return (
    <div className="app-container">
      <AppSidebar active="chat" />

      {/* Main Content Area */}
      <main className="main-area">
        {/* Chat Window */}
        <div className="chat-window-wrapper">
          <div className="chat-window" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="chat-content-center">
                <div className="logo-container">
                   <Aperture size={32} strokeWidth={1.5} color="#888" />
                </div>
                <h1 className="welcome-title">Let&#39;s chat! What&#39;s on your mind?</h1>
                <p className="welcome-subtitle">
                  Choose from the prompts below or start asking queries. I&#39;m here to help with<br/>
                  whatever you need.
                </p>

                <div className="prompts-section">
                  <p className="prompts-label">Try these prompts:</p>
                  <div className="prompts-grid">
                    <button onClick={() => handlePromptClick("What's happening with NVDA stock today?")} className="prompt-btn">What's happening with NVDA stock today?</button>
                    <button onClick={() => handlePromptClick("Compare AAPL and MSFT performance this month.")} className="prompt-btn">Compare AAPL and MSFT performance this month.</button>
                    <button onClick={() => handlePromptClick("Is TSLA a good buy right now?")} className="prompt-btn">Is TSLA a good buy right now?</button>
                    <button onClick={() => handlePromptClick("Explain what a P/E ratio means.")} className="prompt-btn">Explain what a P/E ratio means.</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="message-list">
                {messages.map((m) => (
                  <div key={m.id} className={`message-bubble-wrapper ${m.role}`}>
                    {/* Inline stock charts */}
                    {m.role === 'assistant' && m.tickers && m.tickers.length > 0 && (
                      <div className="inline-stock-cards">
                        {m.tickers.map(t => <InlineStockCard key={t} ticker={t} />)}
                      </div>
                    )}
                    <div className="message-bubble">
                      {m.role === 'assistant' ? (
                        <div style={{ position: 'relative' }}>
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                          <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button 
                              className={`tts-btn ${playingTTSMessageId === m.id ? 'playing' : ''}`}
                              onClick={() => playTTS(m.content, m.id)}
                              title={playingTTSMessageId === m.id ? "Stop Audio" : "Play Audio"}
                            >
                              {ttsLoadingId === m.id ? <Loader2 size={16} className="spin" /> : <Volume2 size={16} />}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p>{m.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="message-bubble-wrapper assistant">
                    <div className="message-bubble loading">
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Input Area */}
            <div className="input-area-container" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(inputValue); }}
                className="input-wrapper"
              >
                <input 
                  type="text" 
                  placeholder="Ask Something" 
                  className="chat-input"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isLoading}
                />
                <button 
                  type="button" 
                  className={`mic-btn ${isRecording ? 'recording' : ''}`}
                  onClick={toggleRecording}
                  title="Voice Input Dictation"
                >
                  {isRecording ? <MicOff size={18} strokeWidth={1.5} /> : <Mic size={18} strokeWidth={1.5} color="#7b8390" />}
                </button>
                <button type="submit" className="send-btn" disabled={!inputValue.trim() || isLoading}>
                  <Send size={18} strokeWidth={1.5} color={inputValue.trim() ? "#1c1c1e" : "#7b8390"} />
                </button>
              </form>
              
              <button 
                type="button" 
                className="voice-hero-btn"
                onClick={toggleFullScreenVoice}
                title="Full Screen Voice Assistant"
              >
                <AudioLines size={22} strokeWidth={2} color="#fff" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* FULL SCREEN VOICE OVERLAY */}
      <AnimatePresence>
        {isFullScreenVoice && (
          <motion.div 
            className="voice-mode-overlay"
            initial={{ 
              clipPath: `circle(0px at ${voiceOrigin.x} ${voiceOrigin.y})`,
              opacity: 1
            }}
            animate={{ 
              clipPath: `circle(150vw at ${voiceOrigin.x} ${voiceOrigin.y})`,
              opacity: 1
            }}
            exit={{ 
              clipPath: `circle(0px at ${voiceOrigin.x} ${voiceOrigin.y})`,
              opacity: 0
            }}
            transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
          >
            <button className="voice-mode-close" onClick={closeFullScreenVoice}>
              <X size={24} />
            </button>
            
            <div className="voice-orb-container">
              <div className={`voice-orb ${voiceState}`}></div>
              <div className="voice-status-text">
                {voiceState}
                {voiceState === 'listening' ? '...' : ''}
                {voiceState === 'thinking' ? '...' : ''}
                {voiceState === 'speaking' ? '...' : ''}
              </div>
            </div>

            <div className="voice-transcript">
              {voiceState === 'listening' ? voiceTranscript : ''}
              {voiceState === 'speaking' ? (
                <VoiceCaption
                  text={voiceCaption}
                  activeWordIndex={activeCaptionWordIndex}
                />
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function VoiceCaption({
  text,
  activeWordIndex,
}: {
  text: string
  activeWordIndex: number
}) {
  if (!text) {
    return <span className="voice-caption-placeholder">Preparing caption...</span>
  }

  const parts = text.match(/\S+\s*/g) ?? [text]

  return (
    <span className="voice-caption-text" aria-live="polite">
      {parts.map((part, index) => (
        <span
          key={`${part}-${index}`}
          className={index === activeWordIndex ? 'voice-caption-word active' : 'voice-caption-word'}
        >
          {part}
        </span>
      ))}
    </span>
  )
}
