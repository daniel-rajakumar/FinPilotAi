"use client";

import React, { useState, useRef, useEffect } from 'react'
import {
  LayoutGrid,
  MessageSquare,
  Star,
  Settings,
  X,
  Send,
  Aperture
} from 'lucide-react'
import { ChatMessage } from '@/types'

export default function ChatDashboard() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load chat history from /data/chats.json on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch('/api/data/chat')
        const data = await response.json()
        if (Array.isArray(data)) {
          setMessages(data)
        }
      } catch (err) {
        console.error('Failed to load history:', err)
      }
    }
    loadHistory()
  }, [])

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

  const handleSend = async (content: string) => {
    if (!content.trim() || isLoading) return

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
        body: JSON.stringify({ messages: [...messages, userMessage] })
      })

      const data = await response.json()
      if (data.message) {
        setMessages(prev => [...prev, data.message])
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePromptClick = (text: string) => {
    handleSend(text)
  }

  return (
    <div className="app-container">
      {/* Sidebar - Same as before */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <button className="icon-btn">
            <LayoutGrid size={22} strokeWidth={1.5} />
          </button>
          <button className="icon-btn active">
            <div className="active-bg">
              <MessageSquare size={22} strokeWidth={1.5} />
            </div>
          </button>
          <button className="icon-btn">
            <Star size={22} strokeWidth={1.5} />
          </button>
          <button className="icon-btn">
            <Settings size={22} strokeWidth={1.5} />
          </button>
        </div>
        
        <div className="sidebar-bottom">
          <button className="icon-btn">
            <Settings size={22} strokeWidth={1.5} />
          </button>
          <button className="avatar-btn">
            <div className="avatar">
               <img src="https://i.pravatar.cc/150?img=47" alt="User avatar" />
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-area">
        {/* Top Tabs - Same as before */}
        <div className="tabs-container">
          <div className="tab active-tab">
            <span className="tab-text">New Chat</span>
            <X size={14} className="tab-close" />
          </div>
          <div className="tab">
            <span className="tab-text">The Roman Empire</span>
            <X size={14} className="tab-close" />
          </div>
          <div className="tab">
            <span className="tab-text">Effects of the French Revolution</span>
            <X size={14} className="tab-close" />
          </div>
        </div>

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
                    <button onClick={() => handlePromptClick("I need assistance with my account.")} className="prompt-btn">I need assistance with my account.</button>
                    <button onClick={() => handlePromptClick("Recommend a good restaurant nearby.")} className="prompt-btn">Recommend a good restaurant nearby.</button>
                    <button onClick={() => handlePromptClick("How do I reset my password?")} className="prompt-btn">How do I reset my password?</button>
                    <button onClick={() => handlePromptClick("What's the weather like today?")} className="prompt-btn">What&#39;s the weather like today?</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="message-list">
                {messages.map((m) => (
                  <div key={m.id} className={`message-bubble-wrapper ${m.role}`}>
                    <div className="message-bubble">
                      <p>{m.content}</p>
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
            <div className="input-area-container">
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
                <button type="submit" className="send-btn" disabled={!inputValue.trim() || isLoading}>
                  <Send size={18} strokeWidth={1.5} color={inputValue.trim() ? "#1c1c1e" : "#7b8390"} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
