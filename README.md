# ChatGPT Security Extension

Protects ChatGPT from malicious files and prompt injection attacks.

## What It Does

- **Blocks malicious files** using VirusTotal (70+ antivirus engines)
- **Prevents prompt injection** attacks with AI detection
- **Protects sensitive files** (blocks .env, keys, credentials)
- **Real-time monitoring** of uploads and prompts

## Quick Install

1. **Build extension:**
   ```bash
   pnpm install && pnpm dev
   ```

2. **Load in Chrome:**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" → select `build/chrome-mv3-dev`

## Setup API Keys

1. **Get VirusTotal API key** (free): [virustotal.com/gui/my-apikey](https://www.virustotal.com/gui/my-apikey)
2. **Get Gemini API key** (free): [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
3. **Add keys:** Click extension icon → paste keys → Save

## Works On

- chatgpt.com
- chat.openai.com

## Commands

```bash
pnpm dev      # Development
pnpm build    # Production
pnpm package  # Create ZIP
```