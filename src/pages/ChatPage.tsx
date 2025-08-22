import React, { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { ChatPageProps } from "@/types/types";
import "../styles/chat.css";

export default function ChatPage({ profile, model }: ChatPageProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { sender: "user" | "llm"; text: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  // RAG is automatically enabled when documents are available
  const [documents, setDocuments] = useState<any[]>([]);
  const [showDocuments, setShowDocuments] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentsRef = useRef<HTMLDivElement>(null);

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
      // Create conversation if this is the first message
      let currentConversationId = conversationId;
      if (!currentConversationId && messages.length === 0) {
        try {
          currentConversationId = await invoke("create_conversation") as string;
          setConversationId(currentConversationId);
        } catch (err) {
          console.error("Failed to create conversation:", err);
          // Continue without conversation ID for backward compatibility
        }
      }
        
      const reply = await invoke("send_prompt", {
        llmAddress: profile.address,
        llmPort: profile.port,
        auth: profile.auth,
        model,
        prompt: userMessage,
        conversationId: currentConversationId,
        useRag: documents.length > 0, // Auto-enable RAG when documents are available
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

  // Load documents on component mount
  useEffect(() => {
    loadDocuments();
  }, []);

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

  // Click outside to close settings and documents
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
      if (documentsRef.current && !documentsRef.current.contains(event.target as Node)) {
        setShowDocuments(false);
      }
    }

    if (showSettings || showDocuments) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSettings, showDocuments]);

  const loadDocuments = async () => {
    try {
      const docs = await invoke<any[]>("get_documents");
      setDocuments(docs);
    } catch (error) {
      console.error("Failed to load documents:", error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['pdf', 'txt'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !allowedTypes.includes(fileExtension)) {
      toast.error("Only PDF and TXT files are supported");
      return;
    }

    setIsUploading(true);
    
    try {
      // Read file content as bytes
      const fileContent = await file.arrayBuffer();
      const fileBytes = Array.from(new Uint8Array(fileContent));
      
      await invoke("upload_document", {
        fileContent: fileBytes,
        filename: file.name,
        llmAddress: profile.address,
        llmPort: profile.port,
        auth: profile.auth
      });
      
      toast.success("Document uploaded successfully!");
      await loadDocuments();
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error(`Upload failed: ${error}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteDocument = async (documentId: string, filename: string) => {
    // Use toast confirmation instead of confirm() which doesn't work in Tauri
    toast.warning(
      `Delete "${filename}"?`,
      {
        duration: 8000,
        action: {
          label: "Delete",
          onClick: async () => {
            toast.dismiss();
            try {
              await invoke("delete_document", { documentId: documentId });
              toast.success("Document deleted successfully");
              await loadDocuments();
            } catch (error) {
              console.error("Delete failed:", error);
              toast.error(`Failed to delete document: ${error}`);
            }
          }
        },
        cancel: {
          label: "Cancel",
          onClick: () => toast.dismiss()
        }
      }
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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
              {documents.length > 0 && (
                <div className="rag-indicator">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 11l3 3 8-8"/>
                    <path d="M21 12c0 4.97-4.03 9-9 9-1.5 0-2.91-.37-4.15-1.02L3 21l1.02-4.85C3.37 14.91 3 13.5 3 12c0-4.97 4.03-9 9-9 1.59 0 3.04.42 4.32 1.15"/>
                  </svg>
                  <span>RAG</span>
                  <div className="rag-tooltip">
                    <strong>RAG Mode Active</strong>
                    <p>Retrieval-Augmented Generation is enabled using {documents.length} uploaded document{documents.length === 1 ? '' : 's'}.</p>
                    <p>The AI will search through your documents to provide more accurate, context-aware responses.</p>
                  </div>
                </div>
              )}
              <div ref={documentsRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowDocuments(!showDocuments)}
                  className="documents-button"
                  title={`Documents (${documents.length})`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                  </svg>
                  {documents.length > 0 && <span className="document-count">{documents.length}</span>}
                </button>
                {showDocuments && (
                  <div className="documents-dropdown">
                    <div className="documents-header">
                      <span>Documents ({documents.length})</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.txt"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="upload-btn-small"
                      >
                        {isUploading ? (
                          <span className="spinner-small"></span>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="17,8 12,3 7,8"/>
                            <line x1="12" y1="3" x2="12" y2="15"/>
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className="documents-list">
                      {documents.length === 0 ? (
                        <div className="no-documents">
                          <p>No documents uploaded</p>
                          <small>Upload PDFs or TXT files for RAG</small>
                        </div>
                      ) : (
                        documents.map((doc) => (
                          <div key={doc.id} className="document-item">
                            <div className="document-info">
                              <span className="document-name" title={doc.filename}>
                                {doc.filename.length > 20 ? doc.filename.substring(0, 17) + '...' : doc.filename}
                              </span>
                              <span className="document-size">{formatFileSize(doc.file_size)}</span>
                            </div>
                            <button
                              onClick={() => handleDeleteDocument(doc.id, doc.filename)}
                              className="delete-btn-small"
                              title="Delete document"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="3,6 5,6 21,6"/>
                                <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                                <line x1="10" y1="11" x2="10" y2="17"/>
                                <line x1="14" y1="11" x2="14" y2="17"/>
                              </svg>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
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
                    <button onClick={() => { setMessages([]); setConversationId(null); setShowSettings(false); }} disabled={messages.length === 0 || isLoading}>
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
