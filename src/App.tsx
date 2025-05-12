import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
  const [models, setModels] = useState("");
  const [llmAddress, setLlmAddress] = useState("");

  async function getModels() {
    const response = await invoke("get_models", {
      llmAddress: llmAddress,
    });
    setModels(response as string);
  }

  return (
    <main className="container">
      <h1>Welcome to LLM Chat</h1>

      <p>Here's your llm's available.</p>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          getModels();
        }}
      >
        <input
          id="greet-input"
          onChange={(e) => setLlmAddress(e.currentTarget.value)}
          placeholder="Enter a domain name or ip address"
        />
        <button type="submit">Get models</button>
      </form>
      <p>{models}</p>
    </main>
  );
}

export default App;
