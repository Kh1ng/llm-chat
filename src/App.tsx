import { useState } from "react";
import LandingPage from "./pages/LandingPage";
import SettingsPage from "./pages/SettingsPage";
import { Profile } from "./types/types";
import ChatPage from "./pages/ChatPage";
import "./App.css";
import { Toaster } from "sonner";
import ThemeToggle from "./components/ThemeToggle";

function App() {
  const [view, setView] = useState<"landing" | "settings" | "chat">("landing");
  const [chatProfile, setChatProfile] = useState<Profile | null>(null);
  const [chatModel, setChatModel] = useState("");

  return (
    <>
      <Toaster position="top-right" richColors closeButton expand />
      <header className="app-header">
        <div className="left">
        {view === "landing" ? (
          <div></div>
        ) : (
          <button onClick={() => setView("landing")} className="themed-button">
            ←
          </button>
        )}
        </div>
        <div className="centered">
        <h1>Vellm</h1>
        </div>
        <div className="right">
          <ThemeToggle />
        </div>
      </header>

      {view === "landing" ? (
        <div className="landing-page-wrapper">
          <LandingPage
            onOpenChat={(profile, model) => {
              setChatProfile(profile);
              setChatModel(model);
              setView("chat");
            }}
          />
          <div className="add-model-btn-wrapper">
            <button
              onClick={() => setView("settings")}
              className="themed-button fill-width"
            >
              Add / Edit Models
            </button>
          </div>
        </div>
      ) : view === "settings" ? (
        <SettingsPage />
      ) : chatProfile && chatModel ? (
        <ChatPage profile={chatProfile} model={chatModel} />
      ) : (
        <p>Missing chat context.</p>
      )}
    </>
  );
}

export default App;
