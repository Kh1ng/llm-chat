# LLM Chat

LLM Chat is a lightweight, Tauri-based cross-platform client for interacting with self-hosted language models via the [Ollama](https://ollama.com) backend. Built with Rust and TypeScript, it offers a streamlined local experience on desktop and mobile platforms.

## Features

- 🔌 Connect to one or more Ollama servers
- 📡 Wake-on-LAN support for headless servers
- 🧠 Fetch and select available models from each profile
- 💬 Start chat sessions per profile/model combo
- 🌙 Dark mode toggle
- 🔄 Refresh models manually
- 📱 Experimental Android & Windows builds
- 🛠 Lightweight and self hosting friendly

## Getting Started

iOS builds coming soon

See the [Wiki](https://github.com/llm-chat/wiki) for:

- [Wake-on-LAN Configuration](https://github.com/llm-chat/wiki/Wake-on-LAN)
- [Authentication & Remote Access](https://github.com/llm-chat/wiki/Authentication-Config)
- [Finding Your IP and MAC Addresses](https://github.com/llm-chat/wiki/Finding-Network-Info)

## Authentication & Remote Access

> ⚠️ **Security Disclaimer**

This application does not fully implement built-in authentication. If you plan to expose your Ollama server over the internet or use this app remotely, it's **strongly recommended** to secure access with a VPN (e.g., [Tailscale](https://tailscale.com)) or equivalent network-layer protection.

## License

This project is licensed under the [AGPL-3.0 License](./LICENSE). Commercial licensing is available — please contact the author for details.

---

Want to contribute? Open issues, submit PRs, or suggest ideas on the [Discussions](https://github.com/llm-chat/discussions) page.
