'use client'

import React from 'react'
import {
  LayoutGrid,
  MessageSquare,
  Star,
  Settings,
  X,
  Send,
  Aperture
} from 'lucide-react'
import Image from 'next/image'

export default function ChatDashboard() {
  return (
    <div className="app-container">
      {/* Sidebar */}
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
               {/* Optional User Avatar placeholder */}
               <img src="https://i.pravatar.cc/150?img=47" alt="User avatar" />
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-area">
        {/* Top Tabs */}
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
          <div className="chat-window">
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
                  <button className="prompt-btn">I need assistance with my account.</button>
                  <button className="prompt-btn">Recommend a good restaurant nearby.</button>
                  <button className="prompt-btn">How do I reset my password?</button>
                  <button className="prompt-btn">What&#39;s the weather like today?</button>
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className="input-area-container">
              <div className="input-wrapper">
                <input 
                  type="text" 
                  placeholder="Ask Something" 
                  className="chat-input"
                />
                <button className="send-btn">
                  <Send size={18} strokeWidth={1.5} color="#7b8390" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
