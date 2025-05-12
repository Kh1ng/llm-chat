import React, { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

type ChatPageProps = {
  profile: {
    name: string;
    address: string;
    models: string[];
  };
  model: string;
};

export default function ChatPage({ profile, model }: ChatPageProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { sender: "user" | "llm"; text: string }[]
  >([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  if (!profile || !model) {
    return <p>Missing profile or model info. Please return to landing page.</p>;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const userMessage = input.trim();
    if (!userMessage) return;

    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
    setInput("");

    const reply = await invoke("send_prompt", {
      llmAddress: profile.address,
      model,
      prompt: userMessage,
    });

    setMessages((prev) => [...prev, { sender: "llm", text: reply as string }]);
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Chat with {model}</h2>
      <p>
        Using profile: {profile.name} ({profile.address})
      </p>
      <button onClick={() => setMessages([])} style={{ marginBottom: "1rem" }}>
        Clear Chat
      </button>
      <div className="chat-history" style={{ display: "flex", flexDirection: "column" }}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
                style={{
                marginBottom: "1rem",
                padding: "0.75rem",
                borderRadius: "8px",
                backgroundColor: msg.sender === "user" ? "#2a2a2a" : "#1e1e1e",
                color: "white",
                alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                maxWidth: "80%",
                }}
          >
            <strong>{msg.sender === "user" ? "You" : model}:</strong>
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{msg.text}</p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} style={{ marginTop: "1rem", display: "flex" }}>
        <textarea
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message"
          style={{ width: "75%", marginRight: "0.5rem", height: "3rem", resize: "none" }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
