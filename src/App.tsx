import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { PrivateRoute } from "./components/guards/PrivateRoute";
import { GuestRoute } from "./components/guards/GuestRoute";
import { NotFoundPage } from "./pages/NotFoundPage";
import { useSocket } from "./hooks/useSocket";
import { useCallPhase } from "./store/call.selectors";

// Eagerly imported — call components are critical-path and must be ready
// immediately when a call event arrives. Lazy loading caused a race condition
// where the webrtc:offer CustomEvent fired before the chunk loaded.
import { CallOverlay } from "./components/call/CallOverlay";
import { IncomingCallDialog } from "./components/call/IncomingCallDialog";

// Lazy-loaded pages
const LoginPage = lazy(() =>
  import("./pages/auth/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const SignupPage = lazy(() =>
  import("./pages/auth/SignupPage").then((m) => ({ default: m.SignupPage })),
);
const ChatPage = lazy(() =>
  import("./pages/chat/ChatPage").then((m) => ({ default: m.ChatPage })),
);
const CallHistoryPage = lazy(() =>
  import("./pages/call/CallHistoryPage").then((m) => ({
    default: m.CallHistoryPage,
  })),
);

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-950">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
    </div>
  );
}

export default function App() {
  useSocket();

  const phase = useCallPhase();
  const showIncoming = phase === "incoming_ringing";
  const showOverlay =
    phase === "outgoing_ringing" ||
    phase === "connecting" ||
    phase === "connected" ||
    phase === "reconnecting" ||
    phase === "failed";

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Route>
          <Route element={<PrivateRoute />}>
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/:id" element={<ChatPage />} />
            <Route path="/calls" element={<CallHistoryPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>

      {/* Call UI — rendered at root level, above all routes */}
      {showIncoming ? <IncomingCallDialog /> : null}
      {showOverlay ? <CallOverlay /> : null}
    </>
  );
}
