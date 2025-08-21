import React, { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import ReactMarkdown from "react-markdown";
import { ChatPageProps } from "@/types/types";

export default function ChatPage({ profile, model }: ChatPageProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { sender: "user" | "llm"; text: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const userMessage = input.trim();
    if (!userMessage || isLoading) return;

    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
    setInput("");
    setIsLoading(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      // Construct full address with port if needed
      const fullAddress = profile.address.includes(':') 
        ? profile.address 
        : `${profile.address}:${profile.port}`;
        
      const reply = await invoke("send_prompt", {
        llmAddress: fullAddress,
        auth: profile.auth,
        model,
        prompt: userMessage,
      });

      setMessages((prev) => [...prev, { sender: "llm", text: reply as string }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: "llm", text: "⚠️ Failed to get response. Please check your connection and try again." },
      ]);
      console.error("LLM request failed:", err);
    } finally {
      setIsLoading(false);
    }
  }

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: "smooth",
          block: "end",
          inline: "nearest"
        });
      }, 100);
    }
  }, [messages]);

  // Click outside to close settings
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    }

    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSettings]);

  if (!profile || !model) {
    return (
      <div className="chat-container">
        <div className="error-state">
          <p>Missing profile or model information.</p>
          <p>Please return to the landing page and select a profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {/* Messages Area */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="welcome-message">
              <h2>Welcome to LLM Chat</h2>
              <p>Start a conversation with {model}</p>
            </div>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((msg, idx) => (
              <div key={idx} className={`message message--${msg.sender}`}>
                <div className="message-content">
                  {msg.sender === "llm" ? (
                    <div className="message-text">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="message-text">{msg.text}</div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message message--llm">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="input-container">
        <form onSubmit={handleSubmit} className="input-form">
          <div className="input-wrapper">
            <textarea
              ref={textareaRef}
              className="message-input"
              value={input}
              onChange={handleTextareaChange}
              placeholder="Message..."
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              rows={1}
            />
            <div className="input-controls">
              <div ref={settingsRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowSettings(!showSettings)}
                  className="settings-button"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
                {showSettings && (
                  <div className="settings-dropdown">
                    <button onClick={() => { setMessages([]); setShowSettings(false); }} disabled={messages.length === 0 || isLoading}>
                      Clear History
                    </button>
                  </div>
                )}
              </div>
              <button 
                className="send-button" 
                type="submit"
                disabled={!input.trim() || isLoading}
              >
                {isLoading ? (
                  <span>⏳</span>
                ) : (
                  <span>→</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
