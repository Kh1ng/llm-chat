/* eslint-disable no-console */

const express = require("express");
const app = express();
app.use(express.json());

// Simple auth middleware
app.use((req, res, next) => {
  const auth = req.headers["authorization"];
  if (auth && auth !== "Bearer test-token") {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

app.get("/api/tags", (req, res) => {
  if (req.query.fail === "true") {
    return res.status(500).json({ error: "Failed to fetch models" });
  }

  res.json({
    models: [
      { name: "llama3-8b" },
      { name: "deepseek-coder" },
      { name: "wizardlm-uncensored" },
    ],
  });
});

app.post("/api/chat", (req, res) => {
  const prompt = req.body?.prompt;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  if (prompt === "timeout") {
    return setTimeout(() => {
      res.json({ message: "Delayed response" });
    }, 3000);
  }

  if (prompt === "fail") {
    return res.status(500).json({ error: "LLM failure" });
  }

  res.json({ message: `You said: ${prompt}` });
});

app.post("/v1/chat/completions", (req, res) => {
  const messages = req.body?.messages;
  const prompt = messages?.[messages.length - 1]?.content;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt missing" });
  }

  if (prompt === "fail") {
    return res.status(500).json({ error: "Mocked LLM failure" });
  }

  if (prompt === "timeout") {
    return setTimeout(() => {
      res.json({
        id: "mock-id",
        object: "chat.completion",
        created: Date.now(),
        model: "mock-model",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "Delayed response",
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 10,
          total_tokens: 20,
        },
      });
    }, 3000);
  }

  res.json({
    id: "mock-id",
    object: "chat.completion",
    created: Date.now(),
    model: "mock-model",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: `You said: ${prompt}`,
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 10,
      total_tokens: 20,
    },
  });
});

app.post("/wake", (req, res) => {
  const profile = req.body?.profile;
  if (!profile?.macAddress) {
    return res.status(400).json({ error: "MAC address required" });
  }

  console.log(`Simulated Wake-on-LAN packet sent to ${profile.macAddress}`);
  res.json({ success: true, message: "Magic packet sent (simulated)." });
});

app.post("/save-profile", (req, res) => {
  const profile = req.body;

  if (!profile || !profile.name || !profile.address) {
    return res.status(400).json({ error: "Profile name and address are required" });
  }

  console.log(`Profile saved: ${JSON.stringify(profile)}`);
  res.json({ success: true, message: "Profile saved successfully" });
});

app.post("/send-message", (req, res) => {
  const { address, prompt } = req.body;

  if (!address || !prompt) {
    return res.status(400).json({ error: "Address and prompt are required" });
  }

  console.log(`Message sent to ${address}: ${prompt}`);
  res.json({ success: true, message: `You said: ${prompt}` });
});

let server;

async function startTestServer() {
  return new Promise((resolve) => {
    server = app.listen(11434, () => {
      console.log("🚀 Test API running at http://localhost:11434");
      resolve({ url: "http://localhost:11434" });
    });
  });
}

async function stopTestServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log("Test server stopped");
        resolve();
      });
    } else {
      resolve();
    }
  });
}

module.exports = {
  startTestServer,
  stopTestServer,
};

// Auto-start server if running directly
if (require.main === module) {
  app.listen(11434, () => {
    console.log("🚀 Test API running at http://localhost:11434");
  });
}