"use client";

import React from 'react'
import Link from 'next/link'
import {
  BarChart3, MessageSquare, Newspaper, Settings, Landmark,
  Sun, Moon, Monitor, ChevronRight
} from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <Link href="/graphs" className="icon-btn" title="Graphs">
            <BarChart3 size={22} strokeWidth={1.5} />
          </Link>
          <Link href="/" className="icon-btn" title="Chat">
            <MessageSquare size={22} strokeWidth={1.5} />
          </Link>
          <Link href="/news" className="icon-btn" title="News">
            <Newspaper size={22} strokeWidth={1.5} />
          </Link>
          <Link href="/economy" className="icon-btn" title="Economy">
            <Landmark size={22} strokeWidth={1.5} />
          </Link>
        </div>
        <div className="sidebar-bottom">
          <Link href="/settings" className="icon-btn active" title="Settings">
            <div className="active-bg">
              <Settings size={22} strokeWidth={1.5} />
            </div>
          </Link>
          <button className="avatar-btn">
            <div className="avatar">
               <img src="https://i.pravatar.cc/150?img=47" alt="User avatar" />
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-area">
        <div className="settings-container">
          <div className="settings-header">
            <h1 className="settings-title">Settings</h1>
            <p className="settings-subtitle">Customize your FinPilotAI experience</p>
          </div>

          {/* Appearance Section */}
          <div className="settings-section">
            <div className="settings-section-header">
              <h2 className="settings-section-title">Appearance</h2>
              <p className="settings-section-desc">Choose how FinPilotAI looks to you</p>
            </div>

            <div className="theme-picker">
              <button
                className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
              >
                <div className="theme-option-preview light-preview">
                  <div className="preview-sidebar" />
                  <div className="preview-main">
                    <div className="preview-line" />
                    <div className="preview-line short" />
                    <div className="preview-chart" />
                  </div>
                </div>
                <div className="theme-option-label">
                  <Sun size={16} />
                  <span>Light</span>
                </div>
              </button>

              <button
                className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                <div className="theme-option-preview dark-preview">
                  <div className="preview-sidebar" />
                  <div className="preview-main">
                    <div className="preview-line" />
                    <div className="preview-line short" />
                    <div className="preview-chart" />
                  </div>
                </div>
                <div className="theme-option-label">
                  <Moon size={16} />
                  <span>Dark</span>
                </div>
              </button>
            </div>
          </div>

          {/* General Section */}
          <div className="settings-section">
            <div className="settings-section-header">
              <h2 className="settings-section-title">General</h2>
            </div>

            <div className="settings-list">
              <div className="settings-item">
                <div className="settings-item-info">
                  <span className="settings-item-label">AI Model</span>
                  <span className="settings-item-value">GPT-4o Mini</span>
                </div>
                <ChevronRight size={18} className="settings-item-arrow" />
              </div>
              <div className="settings-item">
                <div className="settings-item-info">
                  <span className="settings-item-label">Default Chart Period</span>
                  <span className="settings-item-value">1 Month</span>
                </div>
                <ChevronRight size={18} className="settings-item-arrow" />
              </div>
              <div className="settings-item">
                <div className="settings-item-info">
                  <span className="settings-item-label">Auto-save Chat History</span>
                  <span className="settings-item-value">Enabled</span>
                </div>
                <ChevronRight size={18} className="settings-item-arrow" />
              </div>
            </div>
          </div>

          {/* About Section */}
          <div className="settings-section">
            <div className="settings-section-header">
              <h2 className="settings-section-title">About</h2>
            </div>

            <div className="settings-list">
              <div className="settings-item">
                <div className="settings-item-info">
                  <span className="settings-item-label">Version</span>
                  <span className="settings-item-value">0.1.0</span>
                </div>
              </div>
              <div className="settings-item">
                <div className="settings-item-info">
                  <span className="settings-item-label">Built with</span>
                  <span className="settings-item-value">Next.js · OpenAI · Yahoo Finance</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
