import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'
import App from './App.tsx'
import { useAuthStore } from './store/auth.store'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// On page refresh, the access token is gone (memory-only).
// Silently obtain a fresh one via the httpOnly refresh cookie
// before mounting the app so protected routes work immediately.
useAuthStore.getState().initAuth();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <App />
        </GoogleOAuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
