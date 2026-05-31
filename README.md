# BlinkChat — Frontend Client

> The React + TypeScript web client for BlinkChat. Handles the full user interface for real-time chat, group conversations, media sharing, audio/video calls, and account settings.

---

## Table of Contents

1. [What This App Does](#1-what-this-app-does)
2. [Features at a Glance](#2-features-at-a-glance)
3. [Quick Start](#3-quick-start)
4. [Tech Stack](#4-tech-stack)
5. [How the App Is Organized](#5-how-the-app-is-organized)
6. [Architecture — How Things Connect](#6-architecture--how-things-connect)
7. [How Key Features Work](#7-how-key-features-work)
8. [Pages and Routes](#8-pages-and-routes)
9. [State Management](#9-state-management)
10. [Environment Variables](#10-environment-variables)
11. [Building for Production](#11-building-for-production)
12. [Design Decisions](#12-design-decisions)
13. [Troubleshooting](#13-troubleshooting)
14. [Screenshots](#14-screenshots)
15. [Contributing](#15-contributing)

---

## 1. What This App Does

BlinkChat's client is a single-page React application (SPA). It talks to the backend via two channels:

- **HTTP REST API** — for loading data (conversations, messages, profiles, call history)
- **Socket.IO WebSocket** — for everything that needs to be real-time (incoming messages, typing indicators, online presence, call signaling)

The app uses Vite as its build tool and proxies both channels through the dev server during local development, so there are no CORS issues when working locally.

---

## 2. Features at a Glance

**Authentication**

- Email + OTP registration flow (email is verified before account creation)
- Password login with optional two-factor authentication (2FA)
- Sign in with Google
- Forgot password via OTP email
- Silent session restore on page refresh (via HttpOnly refresh cookie)
- Session persists across browser tabs

**Messaging**

- Text messages
- Image, audio, video, and file attachments
- Voice message recording (in-browser microphone capture)
- Audio playback with progress bar and duration display
- Emoji reactions (click to add, click again to remove)
- Reply to a specific message (shows a snapshot of the quoted message)
- Forward messages to another conversation
- Soft delete (shows "deleted" to all participants)
- Full-text search within a conversation
- Read receipts and delivery status
- Infinite scroll to load older messages

**Conversations**

- Sidebar with conversation list, sorted by most recent
- Unread message badges
- Direct messages (one-on-one)
- Group conversations with avatar, description, and member management
- Pin conversations to the top of the sidebar
- Mute conversations (no notifications)
- Pin specific messages inside a conversation
- Media gallery to browse shared images/videos in a conversation

**Audio / Video Calls**

- One-click audio or video call
- Incoming call dialog with accept / decline
- Call overlay with:
  - Live call timer
  - Camera on/off and microphone on/off controls
  - Connection quality indicator
  - Hang up
- Call history page (all calls with direction and duration)
- Handles mid-call reconnection gracefully

**Notifications**

- In-app notification toaster for new messages and events
- Browser push notifications (when the tab is in the background)
- Clicking a notification navigates directly to the relevant conversation

**Settings**

- Profile editing (name, username, bio, avatar)
- Privacy settings (show/hide online status and last seen)
- Notification preferences (browser notifications, sounds, mute all)
- Security settings (change password, manage active sessions, toggle 2FA, delete account)

**Users**

- Search users by name or username
- View another user's public profile
- Block / unblock users

---

## 3. Quick Start

**Requirements:**

- Node.js 20 or later
- The BlinkChat server running locally (or a deployed backend URL)

```bash
# 1. Install dependencies
cd client
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env — at minimum set VITE_GOOGLE_CLIENT_ID

# 3. Start the dev server
npm run dev
# App opens at http://localhost:5173
```

In development, all `/api` and `/socket.io` requests are automatically proxied to `http://localhost:5000` (the backend). You do not need to configure CORS for local development.

---

## 4. Tech Stack

| Category     | What's Used                                    |
| ------------ | ---------------------------------------------- |
| Language     | TypeScript                                     |
| UI Framework | React 19                                       |
| Build Tool   | Vite 8                                         |
| Routing      | React Router v7                                |
| Styling      | Tailwind CSS v4                                |
| State        | Zustand 5 (one store per feature)              |
| Real-time    | Socket.IO client v4                            |
| Google OAuth | @react-oauth/google                            |
| Forms        | React Hook Form                                |
| Icons        | Lucide React                                   |
| Emoji Picker | emoji-mart + @emoji-mart/react                 |
| Virtual list | @tanstack/react-virtual (long message lists)   |
| Utilities    | clsx + tailwind-merge (conditional classnames) |
| Linter       | ESLint 10 + typescript-eslint                  |

---

## 5. How the App Is Organized

```
client/
├── src/
│   ├── main.tsx             ← Entry point. Bootstraps React, GoogleOAuthProvider,
│   │                          BrowserRouter, and kicks off silent auth restore.
│   ├── App.tsx              ← Route definitions + top-level call overlays
│   │
│   ├── config/
│   │   └── env.ts           ← Reads all VITE_* env vars into a typed object
│   │
│   ├── pages/
│   │   ├── auth/            ← LoginPage, SignupPage, ForgotPasswordPage
│   │   ├── chat/            ← ChatPage (main view), GroupInfoPage
│   │   ├── profile/         ← ProfilePage (own), UserProfilePage (others)
│   │   ├── call/            ← CallHistoryPage
│   │   ├── settings/        ← SettingsPage
│   │   │   └── sections/    ← NotificationSettings, PrivacySettings,
│   │   │                       SecuritySettings, DangerZoneSettings
│   │   └── NotFoundPage.tsx
│   │
│   ├── components/
│   │   ├── auth/            ← AuthLayout, GoogleAuthButton
│   │   ├── call/            ← CallOverlay, IncomingCallDialog, CallControls,
│   │   │                       VideoRenderer, ConnectionQuality
│   │   ├── chat/            ← ConversationList, ConversationItem,
│   │   │                       MessageList, MessageBubble, MessageComposer,
│   │   │                       MessageContextMenu, ChatHeader, AudioMessage,
│   │   │                       AudioRecordingBar, VideoMessage, FileMessage,
│   │   │                       CallMessage, ForwardMessageDialog, MediaGallery,
│   │   │                       SearchPanel, TypingIndicator, DateSeparator,
│   │   │                       ReactionPicker, ImageViewer, and more
│   │   ├── guards/          ← PrivateRoute (requires auth), GuestRoute (blocks auth)
│   │   ├── layout/          ← ChatLayout, Sidebar, SidebarNav
│   │   ├── notifications/   ← NotificationToaster
│   │   ├── ui/              ← Input, AvatarViewer, SettingsToggle, BlinkChatLogo
│   │   └── ErrorBoundary.tsx
│   │
│   ├── store/               ← Zustand stores (one per feature)
│   │   ├── auth.store.ts    ← User, access token, login/logout/initAuth
│   │   ├── auth.selectors.ts
│   │   ├── call.store.ts    ← Call phase, IDs, timing
│   │   ├── call.selectors.ts
│   │   ├── conversation.store.ts ← Conversation list, active conversation
│   │   ├── conversation.selectors.ts
│   │   ├── message.store.ts ← Messages per conversation, pagination, reactions
│   │   ├── message.selectors.ts
│   │   ├── notification.store.ts ← In-app notification queue
│   │   ├── notification.selectors.ts
│   │   ├── presence.store.ts    ← Online/offline status map
│   │   ├── presence.selectors.ts
│   │   ├── ui.store.ts          ← Sidebar open, active panels
│   │   ├── ui.selectors.ts
│   │   ├── upload.store.ts      ← Upload progress tracking
│   │   └── upload.selectors.ts
│   │
│   ├── hooks/
│   │   ├── useSocket.ts         ← Master socket hook: connects/disconnects socket
│   │   │                          and registers ALL event handlers
│   │   ├── useWebRTC.ts         ← Full WebRTC peer connection lifecycle
│   │   ├── useCallActions.ts    ← Call initiate/accept/reject/end actions
│   │   ├── useCallTimer.ts      ← Live call duration counter
│   │   ├── useSendMessage.ts    ← Handles all message types including upload
│   │   ├── useMessages.ts       ← Message fetching and pagination
│   │   ├── useConversations.ts  ← Conversation list loading
│   │   ├── useConversationRoom.ts ← Join/leave socket rooms
│   │   ├── useTypingIndicator.ts  ← Debounced typing events
│   │   ├── useAudioRecorder.ts  ← Microphone capture, MediaRecorder API
│   │   ├── useAudioPlayer.ts    ← Audio playback state
│   │   ├── useMediaDevices.ts   ← Camera + mic enumeration and switching
│   │   ├── useMessageSearch.ts  ← Debounced conversation search
│   │   ├── useInfiniteScroll.ts ← Intersection Observer for load-more
│   │   ├── useResponsive.ts     ← Mobile breakpoint detection
│   │   ├── useDebounce.ts       ← General-purpose debounce utility
│   │   └── useNotificationNavigation.ts ← Routes click from browser notification
│   │
│   ├── services/
│   │   ├── auth.service.ts          ← login, register, logout, refresh, googleAuth
│   │   ├── otp.service.ts           ← sendOtp, verifyOtp
│   │   ├── user.service.ts          ← profile, search, block/unblock, preferences
│   │   ├── conversation.service.ts  ← CRUD, groups, pin/mute, members
│   │   ├── message.service.ts       ← send, fetch, delete, react, forward, search
│   │   ├── call.service.ts          ← call history, ICE config
│   │   ├── upload.service.ts        ← XHR upload with progress callback
│   │   ├── socket.service.ts        ← Socket.IO connect/disconnect/token refresh
│   │   └── browserNotification.service.ts ← Notification API wrapper
│   │
│   ├── types/               ← TypeScript interfaces (auth, message, conversation,
│   │                          call, socket events, upload, etc.)
│   ├── lib/
│   │   └── api.ts           ← Central fetch wrapper with auth headers + error handling
│   └── constants/           ← Shared constant values
│
├── index.html
├── vite.config.ts           ← Dev proxy config for /api and /socket.io
├── tsconfig.app.json
├── tsconfig.json
├── .env.example             ← Copy to .env and fill in your values
└── package.json
```

---

## 6. Architecture — How Things Connect

### How a Page Load Works

```
Browser opens the app
        |
        v
  main.tsx runs
        |
        ├─ GoogleOAuthProvider wraps the app with your Google Client ID
        |
        ├─ useAuthStore.getState().initAuth() is called immediately
        |   This silently tries to refresh the access token via the
        |   HttpOnly cookie (if a previous session exists).
        |   The app waits here before rendering — no flash of /login.
        |
        v
  App.tsx renders
        |
        ├─ useSocket() → connects Socket.IO if user is authenticated
        ├─ Routes evaluated → PrivateRoute / GuestRoute guard applied
        └─ Correct page rendered
```

### How HTTP Requests Work

```
Component or Hook
        |
        v
  service layer  (e.g. conversation.service.ts)
        |
        v
  lib/api.ts  ← central fetch wrapper
        |
        ├─ Reads access token from auth store
        ├─ Sets Authorization: Bearer <token>
        ├─ Sets credentials: include (for cookie)
        ├─ Parses JSON response
        └─ Throws ApiError on non-2xx responses
        |
        v
  Vite dev proxy  →  Backend at localhost:5000
  (in production: request goes directly to VITE_API_URL)
```

### How the Socket Connection Works

```
User logs in
        |
        v
  useSocket() hook detects accessToken in auth store
        |
        v
  socketService.connect(accessToken)
        |
        ├─ Creates Socket.IO instance pointing at VITE_SOCKET_URL
        ├─ Sends { auth: { token: accessToken } } on handshake
        ├─ Reconnects automatically (infinite attempts, 1–5s backoff)
        └─ On auth error (expired token) → silently fetches a new
           access token via the refresh cookie, updates socket.auth,
           and lets Socket.IO retry automatically
        |
        v
  useSocket() registers all event handlers:
        |
        ├─ receive_message → message.store
        ├─ user_typing / user_stopped_typing → local state
        ├─ user_online / user_offline → presence.store
        ├─ group_* events → conversation.store
        ├─ message_reaction_* → message.store
        ├─ call:* events → call.store + useWebRTC hook
        └─ webrtc:* events → useWebRTC hook (SDP + ICE relay)
```

### How the Dev Proxy Works

```
Dev Browser (localhost:5173)
        |
        ├─ /api/*         → proxied to http://localhost:5000/api/*
        └─ /socket.io/*   → proxied to http://localhost:5000/socket.io/*
                            (ws: true — WebSocket upgrade supported)
```

This means in development you set `VITE_API_URL=/api` and `VITE_SOCKET_URL=/` and everything works without any CORS setup.

---

## 7. How Key Features Work

### Session Restore on Page Refresh

The access token lives only in memory (Zustand state). On a page refresh, it's gone. The app solves this without redirecting to login:

```
Page refreshes
        |
        v
  main.tsx calls initAuth() before mounting React
        |
        v
  Waits for Zustand to rehydrate from localStorage
  (user profile is cached there)
        |
        v
  Makes a POST /api/auth/refresh request
  The HttpOnly cookie is sent automatically by the browser
        |
    ┌───┴────────────────┐
    │ Cookie valid?      │
    │                    │
    Yes                  No
    │                    │
    v                    v
  New access token     Clear state → user goes to /login
  User is restored
  App renders normally
```

### File Upload with Progress

The upload service uses `XMLHttpRequest` instead of `fetch` because the Fetch API does not support upload progress events.

```
User selects a file
        |
        v
  uploadService.uploadFile(file, onProgress)
        |
        ├─ Creates FormData with the file
        ├─ Opens XHR POST to /api/upload
        ├─ Fires onProgress(0–100) via xhr.upload progress event
        └─ Returns { url, publicId, fileSize, mimeType, resourceType }
        |
        v
  UploadProgressBadge shows live % in the UI
```

### Voice Message Recording

```
User holds the mic button
        |
        v
  useAudioRecorder → navigator.mediaDevices.getUserMedia({ audio: true })
        |
        v
  MediaRecorder starts capturing chunks
        |
User releases the button
        |
        v
  MediaRecorder stops → blob assembled from chunks
        |
        v
  Blob uploaded as audio/webm → Cloudinary URL returned
        |
        v
  Message sent with type: "audio" and audioDuration
```

### Audio / Video Call Flow

The client handles all the WebRTC complexity — the server only relays the signaling messages.

```
Caller clicks "Call"
        |
        v
  useCallActions.initiateCall(userId, "video")
        |
        v
  socket emits call:initiate
        |
        v  [server relays call:incoming to receiver]
        |
        v  [receiver's IncomingCallDialog appears]
        |
  Receiver clicks Accept
        |
        v
  useWebRTC starts:
        |
        ├─ getUserMedia() → camera + mic stream
        ├─ RTCPeerConnection created with ICE servers from /api/webrtc/ice-config
        ├─ Caller creates SDP offer → socket emits webrtc:offer
        ├─ Receiver gets offer → creates answer → socket emits webrtc:answer
        └─ Both sides exchange ICE candidates
        |
        v
  Peer-to-peer media established
  (audio/video goes directly between browsers, not via server)
        |
        v
  CallOverlay shows:
  ├─ Remote video / audio
  ├─ Local video preview (picture-in-picture style)
  ├─ Live call timer
  ├─ Connection quality indicator
  └─ Camera / mic / hang-up controls
```

### Typing Indicators

```
User types in MessageComposer
        |
        v
  useTypingIndicator detects keystroke
        |
        v
  socket emits "typing_start" (once per burst, not per keystroke)
  Debounced — stops being sent after user pauses
        |
        v
  Other participants see TypingIndicator component appear
        |
        v
  When user stops or sends:
  socket emits "typing_stop"
  TypingIndicator disappears
```

### Notification Click Navigation

Browser notifications (shown when the tab is in the background) use a `CustomEvent` on `window` to communicate with the React app:

```
User clicks a browser notification
        |
        v
  Notification onclick fires
        |
        v
  window.dispatchEvent(new CustomEvent("app:notification-click", { detail: { route } }))
        |
        v
  useNotificationNavigation() listener catches it
        |
        v
  React Router navigates to the conversation
  Window is focused
```

---

## 8. Pages and Routes

| Path               | Page               | Access        | Description                                   |
| ------------------ | ------------------ | ------------- | --------------------------------------------- |
| `/`                | —                  | Any           | Redirects to `/chat`                          |
| `/login`           | LoginPage          | Guest only    | Email/password login, Google login            |
| `/signup`          | SignupPage         | Guest only    | OTP-verified email registration               |
| `/forgot-password` | ForgotPasswordPage | Guest only    | OTP-based password reset                      |
| `/chat`            | ChatPage           | Auth required | Conversation list + empty state               |
| `/chat/:id`        | ChatPage           | Auth required | Conversation list + open conversation         |
| `/chat/:id/info`   | GroupInfoPage      | Auth required | Group members, description, admin tools       |
| `/user/:id`        | UserProfilePage    | Auth required | Another user's public profile                 |
| `/calls`           | CallHistoryPage    | Auth required | All past calls with duration + direction      |
| `/profile`         | ProfilePage        | Auth required | Edit own profile, avatar, username            |
| `/settings`        | SettingsPage       | Auth required | Notifications, privacy, security, danger zone |
| `*`                | NotFoundPage       | Any           | 404 page                                      |

**Route guards:**

- `GuestRoute` — wraps `/login`, `/signup`, `/forgot-password`. Redirects to `/chat` if already authenticated.
- `PrivateRoute` — wraps all authenticated pages. Redirects to `/login` if not authenticated.

---

## 9. State Management

The app uses **Zustand** for all global state. There is one store per feature area, with selectors in separate files to keep components from doing too much in one place.

| Store                | What it holds                                                  |
| -------------------- | -------------------------------------------------------------- |
| `auth.store`         | Logged-in user, access token, auth status, loading/error state |
| `conversation.store` | Conversation list, active conversation, unread counts          |
| `message.store`      | Messages per conversation, pagination cursors, reactions       |
| `call.store`         | Current call phase, call ID, peer user, timing                 |
| `presence.store`     | Map of userId → online/offline                                 |
| `notification.store` | Queue of in-app notifications                                  |
| `upload.store`       | Active upload progress per file                                |
| `ui.store`           | Sidebar open/closed, active UI panels                          |

**Auth store persistence:**

The `auth.store` uses Zustand's `persist` middleware to save the user profile to `localStorage` under the key `"blinkchat-auth"`. Only the `user` object is persisted — the access token is **never** written to localStorage. When the tab opens, `initAuth()` fetches a fresh access token using the HttpOnly cookie.

A `storage` event listener watches for changes in other tabs and re-hydrates the store automatically, so logging out in one tab propagates to all open tabs.

---

## 10. Environment Variables

All environment variables must be prefixed with `VITE_` to be exposed to the browser by Vite.

Copy `.env.example` to `.env` and fill in your values:

```bash
# ─────────────────────────────────────────────────────────────────────────────
# API / BACKEND
# ─────────────────────────────────────────────────────────────────────────────

VITE_API_URL=/api
# The base URL for all HTTP API requests.
#
# LOCAL DEVELOPMENT:
#   Use /api (relative path). Vite's dev proxy forwards it to localhost:5000.
#   This avoids CORS issues entirely — you never need to configure CORS locally.
#
# PRODUCTION:
#   Set this to the full URL of your backend.
#   Example: https://api.yourapp.com/api
#   Make sure this domain is in FRONTEND_ORIGINS on the server side.

VITE_SOCKET_URL=/
# The URL that Socket.IO connects to.
#
# LOCAL DEVELOPMENT:
#   Use / (root). Vite's dev proxy handles /socket.io/* → localhost:5000.
#
# PRODUCTION:
#   Set this to the root URL of your backend (not the /api path).
#   Example: https://api.yourapp.com
#   Socket.IO appends /socket.io/ automatically.

# ─────────────────────────────────────────────────────────────────────────────
# GOOGLE OAUTH
# ─────────────────────────────────────────────────────────────────────────────

VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
# REQUIRED for the "Sign in with Google" button to work.
# Must be the same Client ID configured on the server (GOOGLE_CLIENT_ID).
# Get it from: https://console.cloud.google.com → APIs & Services → Credentials
#
# In the Google Cloud Console, add your frontend URLs to the
# "Authorised JavaScript origins" list:
#   - http://localhost:5173  (for development)
#   - https://yourapp.com   (for production)
```

### All three variables at a glance

| Variable                | Development value     | Production value              | Required     |
| ----------------------- | --------------------- | ----------------------------- | ------------ |
| `VITE_API_URL`          | `/api`                | `https://api.yourapp.com/api` | **Required** |
| `VITE_SOCKET_URL`       | `/`                   | `https://api.yourapp.com`     | **Required** |
| `VITE_GOOGLE_CLIENT_ID` | Your Google Client ID | Same                          | **Required** |

> **Important:** In development, the Vite proxy handles all backend routing. Do not set `VITE_API_URL` to `http://localhost:5000/api` in development — that will bypass the proxy and cause CORS errors. Always use the relative `/api` form locally.

---

## 11. Building for Production

```bash
# Compile TypeScript + bundle with Vite
npm run build

# Output goes to dist/
# Serve the dist/ folder from any static file host or CDN
```

The build is split into chunks by Vite:

- **vendor chunk** — React, React DOM, Zustand, React Router (things that rarely change)
- **page chunks** — each page is lazy-loaded as its own chunk (code-splitting)
- **call components** — `CallOverlay` and `IncomingCallDialog` are eagerly loaded because a WebRTC offer can arrive at any time and must be handled instantly

**Preview the production build locally:**

```bash
npm run preview
# Serves the dist/ folder at http://localhost:4173
```

**Deployment checklist:**

1. Set `VITE_API_URL` and `VITE_SOCKET_URL` to your production backend URL in your CI/CD environment variables
2. Set `VITE_GOOGLE_CLIENT_ID` to your Google Client ID
3. Add your production domain to "Authorised JavaScript origins" in Google Cloud Console
4. Add your production domain to `FRONTEND_ORIGINS` on the server
5. If frontend and backend are on different domains, configure `COOKIE_SAME_SITE=none` and `COOKIE_SECURE=true` on the server
6. Serve the `dist/` folder — configure your web server to return `index.html` for all routes (SPA fallback)

**Nginx SPA fallback example:**

```nginx
server {
    listen 443 ssl;
    server_name yourapp.com;
    root /path/to/client/dist;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 12. Design Decisions

### Zustand instead of Redux

Zustand was chosen for its minimal boilerplate and simple API. Each feature (auth, messages, conversations, calls) has its own store file. This keeps the stores focused and easy to follow. Selectors live in separate files so components import only what they need, which limits unnecessary re-renders.

### Access token in memory, not localStorage

The access token is kept only in Zustand state (in-memory). It is never written to `localStorage` or a regular cookie. This prevents XSS attacks from stealing the token via `document.cookie` or `localStorage.getItem`. The refresh token is an HttpOnly cookie controlled entirely by the server.

### Silent auth restore on page refresh

Instead of sending users to `/login` on every page refresh, the app silently calls `POST /api/auth/refresh` before rendering. The HttpOnly cookie is sent automatically by the browser. If the cookie is valid, a new access token is returned and the session is restored invisibly. This feels exactly like a normal authenticated web app.

### Vite dev proxy for local development

The proxy in `vite.config.ts` means you only need one origin (`localhost:5173`) during development. Both `/api` HTTP requests and `/socket.io` WebSocket connections are forwarded to the backend. The `cookieDomainRewrite: ""` setting ensures the refresh token cookie is stored for the frontend origin, not the backend origin — without this, the cookie is silently dropped and every page refresh logs you out.

### Call components are eagerly loaded

`CallOverlay` and `IncomingCallDialog` are **not** lazy-loaded even though most pages are. If they were lazy, there would be a race condition: the server sends a `call:incoming` or `webrtc:offer` event and the client hasn't loaded the chunk yet. By eagerly importing them, they are always ready.

### XHR for file uploads (not fetch)

The browser's Fetch API does not expose upload progress events. `XMLHttpRequest` does via `xhr.upload.addEventListener("progress", ...)`. The upload service uses XHR specifically to show a real-time percentage in the UI.

### Tanstack Virtual for message lists

Long conversations can have thousands of messages. Rendering all of them as DOM nodes is slow. `@tanstack/react-virtual` renders only the visible messages into the DOM, keeping scroll performance smooth regardless of conversation length.

---

## 13. Troubleshooting

### App is stuck on loading spinner after page refresh

The `initAuth()` call is probably failing. Check:

1. Is the backend server running?
2. Is `VITE_API_URL` pointing to the right backend URL?
3. Open browser DevTools → Network → look for `POST /api/auth/refresh` — what does it return?

---

### "Sign in with Google" button does nothing or shows an error

1. Check `VITE_GOOGLE_CLIENT_ID` in your `.env` — is it set and correct?
2. Open the Google Cloud Console and verify that your frontend origin (`http://localhost:5173` or your production URL) is in the "Authorised JavaScript origins" list.

---

### API requests fail with CORS errors in development

You are probably setting `VITE_API_URL` to `http://localhost:5000/api` instead of `/api`. Use the relative path in development — the Vite proxy handles the rest.

---

### Refresh cookie not being sent (login works, but next refresh fails)

In production with frontend and backend on different domains:

1. Make sure the server is running with `COOKIE_SAME_SITE=none` and `COOKIE_SECURE=true`
2. Make sure the backend is served over HTTPS (required for Secure cookies)
3. The `VITE_API_URL` and `VITE_SOCKET_URL` must both point to the backend domain

---

### Audio/video calls not connecting between users on different networks

See the server README — this is a TURN server configuration issue on the backend side, not a frontend issue.

---

### No browser notifications appearing

1. The user must grant notification permission. Check `Notification.permission` in the browser console.
2. If permission is `"denied"`, the user needs to manually unblock notifications in browser settings.
3. Notifications only appear when the tab is in the background. If the tab is focused, in-app notifications are shown instead.

---

### TypeScript errors when building

```bash
# Make sure you're on Node.js 20+
node --version

# Fresh install
rm -rf node_modules
npm install

# Build
npm run build
```

---

### Changes to .env are not picked up

Vite reads `.env` at startup. After changing any `VITE_*` variable, stop the dev server and restart it:

```bash
# Stop with Ctrl+C, then:
npm run dev
```

---

## 14. Screenshots

> Screenshots have not been added to the repository yet. Below are placeholders showing where they should go.

To add a screenshot, save it to `docs/screenshots/` and update the paths below.

| Screen                                | File                               |
| ------------------------------------- | ---------------------------------- |
| Login / sign up screen                | `docs/screenshots/auth.png`        |
| Main chat interface                   | `docs/screenshots/chat-main.png`   |
| Group conversation with members panel | `docs/screenshots/group-chat.png`  |
| Audio / video call overlay            | `docs/screenshots/call-screen.png` |
| Settings page                         | `docs/screenshots/settings.png`    |
| Mobile / responsive view              | `docs/screenshots/mobile.png`      |

---

## 15. Contributing

1. Fork the repo and create a branch from `main`
2. Keep pull requests focused — one feature or fix per PR
3. Run the linter before submitting: `npm run lint`
4. Run the TypeScript compiler to check for type errors: `npm run build`
5. Write a clear PR description explaining what changed and why

For larger changes, open an issue first to discuss the approach.
