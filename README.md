<!-- ===================== HEADER ===================== -->
<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,20,24&height=200&section=header&text=Nova%20Chat&fontSize=70&fontColor=ffffff&fontAlignY=35&desc=AI%20chat%20with%20500%2B%20models%20%E2%80%94%20no%20API%20key,%20no%20backend&descSize=18&descAlignY=58&animation=fadeIn" alt="Nova Chat" width="100%" />

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=22&pause=1000&color=4F46E5&center=true&vCenter=true&width=600&lines=Pick+a+model.+Start+chatting.;500%2B+models+from+OpenAI%2C+Anthropic%2C+Google;Streaming+replies+in+real+time;Powered+by+Puter+%E2%80%94+zero+infra+cost" alt="typing" />

<br/><br/>

<!-- Badges -->
<img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
<img src="https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
<img src="https://img.shields.io/badge/Puter.js-v2-4F46E5?style=for-the-badge&logo=icloud&logoColor=white" alt="Puter" />
<img src="https://img.shields.io/badge/No_API_Key-required-22C55E?style=for-the-badge" alt="No API Key" />

<br/>

<img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT" />
<img src="https://img.shields.io/badge/PRs-welcome-ff69b4?style=flat-square" alt="PRs welcome" />
<img src="https://img.shields.io/badge/made%20with-%E2%9D%A4-red?style=flat-square" alt="made with love" />

</div>

<!-- ===================== DEMO ===================== -->
<div align="center">

### ✨ Demo

<!-- 👉 Drop a screen-recording GIF at docs/demo.gif to show it live -->
<img src="docs/demo.gif" alt="Nova Chat demo" width="80%" onerror="this.style.display='none'" />

<img src="https://user-images.githubusercontent.com/74038190/212284100-561aa473-3905-4a80-b561-0d28506553ee.gif" alt="animated divider" width="100%" />

</div>

---

## 🪄 Overview

**Nova Chat** is a clean, minimal AI chatbot built with **React + Vite** on top of [**Puter.js**](https://docs.puter.com).
One `<script>` tag gives you access to **500+ AI models** — OpenAI, Anthropic, Google, xAI, Mistral, DeepSeek and more — with **no API keys, no backend, and no infra bills**.

> 💡 **User-pays model:** each end-user signs in with their free Puter account and pays only for their own usage beyond the free tier. You ship AI for **$0** infrastructure cost.

---

## 🚀 Features

| | Feature | Description |
|:--:|:--|:--|
| 🤖 | **500+ Models** | Auto-loaded dropdown with search from `puter.ai.listModels()` |
| 🌊 | **Live Streaming** | Tokens stream in real time — toggle on/off |
| 🧠 | **Multi-turn Memory** | Full conversation context sent each turn |
| 🎯 | **Haiku by Default** | Smart-picks the best Claude Haiku model on load |
| 🎨 | **Glassmorphism UI** | Frosted glass composer, gradient accents, smooth animations |
| 🔑 | **No API Key** | Powered entirely by Puter.js |
| 💾 | **Chat Persistence** | Messages survive page refresh via localStorage |
| 🆕 | **New Chat** | Start fresh conversations without losing history |
| 📜 | **Scroll-to-Bottom** | Floating button appears when scrolled up |
| 🌗 | **Dark / Light Theme** | Toggle with persisted preference |
| 🔐 | **Puter Auth** | Sign in/out with Puter account, user avatar in header |
| 📱 | **Responsive** | Works on desktop & mobile |

<div align="center">
<img src="https://user-images.githubusercontent.com/74038190/212744287-91faf6dd-67d8-4e69-963a-0bbe6b7b8b58.gif" width="40%" alt="features" />
</div>

---

## 🛠️ Tech Stack

<div align="center">

<img src="https://skillicons.dev/icons?i=react,vite,js,html,css" alt="stack" />

</div>

- **React 18** — UI with modular component architecture
- **Vite 5** — dev server + build
- **Puter.js v2** — AI, auth, billing (CDN)
- **Vanilla CSS** — design system with glassmorphism, gradients, animations
- **LocalStorage** — chat history & settings persistence

---

## 📦 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev

# 3. Open the app
#    http://localhost:5173  (Vite auto-bumps the port if taken)
```

> ⚠️ **Must be served over HTTP** (Vite handles this) — Puter.js will not run from a `file://` URL.

### Build for production

```bash
npm run build      # → dist/
npm run preview    # preview the production build
```

---

## 🧩 How It Works

```mermaid
flowchart LR
    A[User types message] --> B{Stream on?}
    B -- yes --> C[puter.ai.chat<br/>stream: true]
    B -- no --> D[puter.ai.chat]
    C --> E[Append tokens live]
    D --> F[Append full reply]
    E --> G[Update chat history]
    F --> G
    G --> A
```

On the first message, Puter shows a **one-time login popup** (free account) to attach usage to the user — then replies stream in.

---

## 📁 Project Structure

```
Puter/
├── index.html                # Vite entry + Puter.js <script>
├── vite.config.js            # Vite + React config
├── postcss.config.js         # CSS isolation
├── package.json
└── src/
    ├── main.jsx              # React mount
    ├── App.jsx               # State management, AI integration, keyboard shortcuts
    ├── utils.js              # formatTime, parseThinking, downloadChat helpers
    ├── index.css             # Full design system (themes, glassmorphism, animations)
    └── components/
        ├── Header.jsx               # Brand, new chat, theme toggle, settings
        ├── ChatArea.jsx             # Scrollable message list with auto-scroll
        ├── Message.jsx              # Individual message bubble (user, AI, error, actions)
        ├── Composer.jsx             # Textarea input with send/stop buttons
        ├── SettingsDrawer.jsx       # Slide-in panel for all settings
        ├── WelcomeScreen.jsx        # Animated landing with prompt suggestions
        ├── ScrollToBottom.jsx       # Floating scroll-to-bottom button
        ├── AiMessageWithThinking.jsx# Collapsible <thinking> tag renderer
        └── MarkdownRenderer.jsx     # Syntax-highlighted code blocks + markdown
```

---

## ⚙️ Core API

```js
// List all models for the dropdown
const models = await puter.ai.listModels();

// Chat with streaming
const resp = await puter.ai.chat(messages, {
  model: 'claude-haiku-4-5',
  stream: true,
});
for await (const part of resp) {
  console.log(part?.text);
}
```

---

## 🗺️ Roadmap

- [x] Markdown + code-block rendering of replies
- [x] Light / dark theme toggle
- [x] Persist chat history (localStorage)
- [x] Message timestamps & avatars
- [x] New chat & conversation management
- [x] Glassmorphism UI with animations
- [x] Header sign-in button with Puter auth (sign in/out, user avatar)
- [ ] Image input (vision models)
- [ ] Multiple conversation threads

---

<!-- ===================== FOOTER ===================== -->
<div align="center">

<img src="https://user-images.githubusercontent.com/74038190/212284158-e840e285-664b-44d7-b79b-e264b5e54825.gif" width="100%" alt="footer divider" />

### Powered by [Puter](https://developer.puter.com) ✦

<sub>Built with React + Vite • MIT License</sub>

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,20,24&height=100&section=footer" width="100%" alt="footer" />

</div>
