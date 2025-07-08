import React, { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import ReactMarkdown from "react-markdown";
import { ChatPageProps } from "@/types/types";

export default function ChatPage({ profile, model }: ChatPageProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { sender: "user" | "llm"; text: string }[]
  >([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const userMessage = input.trim();
    if (!userMessage) return;

    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
    setInput("");

    // Add a placeholder response
    setMessages((prev) => [...prev, { sender: "llm", text: "..." }]);

    // TODO: handle markdown/math jax + deepseek <thinking> response

    try {
      const reply = await invoke("send_prompt", {
        llmAddress: profile.address,
        model,
        prompt: userMessage,
      });

      setMessages((prev) => {
        const withoutPending = prev.filter(
          (msg, idx) => !(idx === prev.length - 1 && msg.text === "..."),
        );
        return [...withoutPending, { sender: "llm", text: reply as string }];
      });
    } catch (err) {
      setMessages((prev) => {
        const withoutPending = prev.filter(
          (msg, idx) => !(idx === prev.length - 1 && msg.text === "..."),
        );
        return [
          ...withoutPending,
          { sender: "llm", text: "⚠️ Failed to get response." },
        ];
      });
      console.error("LLM request failed:", err);
    }
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!profile || !model) {
    return (
      <div className="chat-page">
        <p>Missing profile or model info. Please return to landing page.</p>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <h2>Chat with {model}</h2>
      <p>
        Using profile: {profile.name} ({profile.address})
      </p>
      <button onClick={() => setMessages([])} className="themed-button">
        Clear Chat
      </button>
      <div className="chat-history chat-history-flex">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`chat-bubble ${msg.sender === "user" ? "user" : "llm"}`}
          >
            <strong>{msg.sender === "user" ? "You" : model}:</strong>
            {msg.text === "..." ? (
              <p className="chat-text">
                <span className="ellipsis">
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </span>
              </p>
            ) : msg.sender === "llm" ? (
              <div className="chat-text">
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            ) : (
              <p className="chat-text">{msg.text}</p>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="chat-form">
        <textarea
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <button className="themed-button" type="submit">
          Send
        </button>
      </form>
    </div>
  );
}
