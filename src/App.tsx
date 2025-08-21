import LandingPage from "./pages/LandingPage";
import SettingsPage from "./pages/SettingsPage";
import ChatPage from "./pages/ChatPage";
import "./App.css";
import { Toaster } from "sonner";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <AppContainer />
    </BrowserRouter>
  );
}

function AppContainer() {
  const location = useLocation();
  const isChat = location.pathname === "/chat";
  
  return (
    <div className={`app-container ${isChat ? 'chat-route' : ''}`}>
      <Toaster position="top-right" richColors closeButton expand />
      <MainHeader />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<LandingPageWrapper />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/chat" element={<ChatPageWrapper />} />
        </Routes>
      </main>
    </div>
  );
}

function LandingPageWrapper() {
  const navigate = useNavigate();
  return <LandingPage onOpenChat={(profile, model) => navigate("/chat", { state: { profile, model } })} />;
}

function MainHeader() {
  const location = useLocation();
  const isChat = location.pathname === "/chat";
  
  // For chat page, render a minimal header with back button integrated
  if (isChat) {
    const { profile, model } = location.state || {};
    return (
      <header className="main-header chat-main-header">
        <div className="chat-header-nav">
          <BackButton />
          {profile && model && (
            <div className="chat-nav-info">
              <span className="chat-nav-title">{model}</span>
              <span className="chat-nav-subtitle">• {profile.name}</span>
            </div>
          )}
        </div>
      </header>
    );
  }
  
  // For other pages, show full header
  return (
    <header className="main-header">
      <div className="header-left">
        <BackButton />
      </div>
      <div className="header-center">
        <h1 className="app-title">Vellm</h1>
      </div>
      <div className="header-right">
        {/* Theme toggle removed */}
      </div>
    </header>
  );
}

function BackButton() {
  const location = useLocation();
  const navigate = useNavigate();
  if (location.pathname === "/") return <div></div>;
  return (
    <button onClick={() => navigate(-1)} className="themed-button">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
    </button>
  );
}

function ChatPageWrapper() {
  const location = useLocation();
  const { profile, model } = location.state || {};
  if (profile && model) {
    return <ChatPage profile={profile} model={model} />;
  }
  return <p>Missing chat context.</p>;
}

export default App;
