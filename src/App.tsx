import { useState } from "react";
import LandingPage from "./pages/LandingPage";
import SettingsPage from "./pages/SettingsPage";
import "./App.css";

function App() {
  const [view, setView] = useState<"landing" | "settings">("landing");

return (
  <>
    <header>
      <button onClick={() => setView("landing")}>Home</button>
      <button onClick={() => setView("settings")}>Settings</button>
    </header>

    {view === "landing" ? <LandingPage /> : <SettingsPage />}
  </>
  );
}

export default App;
