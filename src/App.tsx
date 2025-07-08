import LandingPage from "./pages/LandingPage";
import SettingsPage from "./pages/SettingsPage";
import ChatPage from "./pages/ChatPage";
import "./App.css";
import { Toaster } from "sonner";
import ThemeToggle from "./components/ThemeToggle";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors closeButton expand />
      <header className="app-header">
        <div className="left">
          <BackButton />
        </div>
        <div className="centered">
          <h1>Vellm</h1>
        </div>
        <div className="right">
          <ThemeToggle />
        </div>
      </header>
      <Routes>
        <Route path="/" element={<LandingPageWrapper />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/chat" element={<ChatPageWrapper />} />
      </Routes>
    </BrowserRouter>
  );
}

function LandingPageWrapper() {
  const navigate = useNavigate();
  return <LandingPage onOpenChat={(profile, model) => navigate("/chat", { state: { profile, model } })} />;
}

function BackButton() {
  const location = useLocation();
  const navigate = useNavigate();
  if (location.pathname === "/") return <div></div>;
  return (
    <button onClick={() => navigate(-1)} className="themed-button">
      ←
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
