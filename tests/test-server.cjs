const express = require("express");
const app = express();
app.use(express.json());

app.get("/api/tags", (req, res) => {
  res.json({
    models: [
      { name: "llama3-8b" },
      { name: "deepseek-coder" },
      { name: "wizardlm-uncensored" },
    ],
  });
});

app.post("/api/chat", (req, res) => {
  res.json({
    message: `You said: ${req.body?.prompt || "nothing"}`
  });
});

app.listen(11434, () => {
  console.log("🚀 Test API running at http://localhost:11434");
});