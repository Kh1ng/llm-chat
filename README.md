![GitHub license](https://img.shields.io/badge/license-AGPL-green.svg) [![Linting](https://github.com/Kh1ng/llm-chat/actions/workflows/lint.yml/badge.svg)](https://github.com/Kh1ng/llm-chat/actions/workflows/lint.yml)
[![Tests](https://github.com/Kh1ng/llm-chat/actions/workflows/test.yml/badge.svg)](https://github.com/Kh1ng/llm-chat/actions/workflows/test.yml)
[![Mac OS](https://github.com/Kh1ng/llm-chat/actions/workflows/macbuild.yml/badge.svg)](https://github.com/Kh1ng/llm-chat/actions/workflows/macbuild.yml)
[![iOS](https://github.com/Kh1ng/llm-chat/actions/workflows/windowsbuild.yml/badge.svg)](https://github.com/Kh1ng/llm-chat/actions/workflows/iosbuild.yml)
[![Windows](https://github.com/Kh1ng/llm-chat/actions/workflows/iosbuild.yml/badge.svg)](https://github.com/Kh1ng/llm-chat/actions/workflows/windowsbuild.yml)

# LLM Chat

LLM Chat is a lightweight, Tauri-based cross-platform client for interacting with self-hosted language models via the [Ollama](https://ollama.com) backend. Built with Rust and TypeScript, it offers a streamlined local experience on desktop and mobile platforms.

## Features

-  Connect to one or more OpenAI-compatible API endpoints
-  Wake-on-LAN support
-  Save, fetch, and select available models in individual profiles
-  Start chat sessions per profile/model combo
-  Dark mode toggle
-  Refresh models manually
-  Experimental Android & Windows builds
-  Lightweight and self hosting friendly

## Getting Started

initial release on iOS and macOS soon (tm).

See the [Wiki](https://github.com/llm-chat/wiki) for:

- [Wake-on-LAN Configuration](https://github.com/llm-chat/wiki/Wake-on-LAN)
- [Authentication & Remote Access](https://github.com/llm-chat/wiki/Authentication-Config)
- [Finding Your IP and MAC Addresses](https://github.com/llm-chat/wiki/Finding-Network-Info)

## Authentication & Remote Access

> ⚠️ **Security Disclaimer**

This application does not fully implement built-in authentication. If you plan to expose your Ollama server over the internet or use this app remotely, it's **strongly recommended** to secure access with a VPN (e.g., [Tailscale](https://tailscale.com)) or equivalent network-layer protection.

## Support

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H2H21FMK25)

## License

This project is licensed under the [AGPL-3.0 License](./LICENSE).

---

Think of something interesting? Open issues or suggest ideas on the [Discussions](https://github.com/llm-chat/discussions) page.
