import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { PrivateRoute } from "./components/guards/PrivateRoute";
import { GuestRoute } from "./components/guards/GuestRoute";
import { NotFoundPage } from "./pages/NotFoundPage";
import { useSocket } from "./hooks/useSocket";
import { useCallPhase } from "./store/call.selectors";
import { useIsInitializing } from "./store/auth.selectors";

// Eagerly imported — call components are critical-path and must be ready
// immediately when a call event arrives. Lazy loading caused a race condition
// where the webrtc:offer CustomEvent fired before the chunk loaded.
import { CallOverlay } from "./components/call/CallOverlay";
import { IncomingCallDialog } from "./components/call/IncomingCallDialog";
import { useNotificationNavigation } from "./hooks/useNotificationNavigation";
import { NotificationToaster } from "./components/notifications/NotificationToaster";
// Lazy-loaded pages
const SettingsPage = lazy(() =>
  import("./pages/settings/SettingsPage").then((m) => ({
    default: m.SettingsPage,
  })),
);
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

const ForgotPasswordPage = lazy(() =>
  import("./pages/auth/ForgotPasswordPage").then((m) => ({
    default: m.ForgotPasswordPage
  })),

);

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-950">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
    </div>
  );
}

const ProfilePage = lazy(() =>
  import("./pages/profile/ProfilePage").then((m) => ({
    default: m.ProfilePage,
  })),
);

const GroupInfoPage = lazy(() =>
  import("./pages/chat/GroupInfoPage").then((m) => ({
    default: m.GroupInfoPage,
  })),
);

const UserProfilePage = lazy(() =>
  import("./pages/profile/UserProfilePage").then((m) => ({
    default: m.UserProfilePage,
  })),
);

export default function App() {
  useSocket();
  useNotificationNavigation();

  const isInitializing = useIsInitializing();
  const phase = useCallPhase();
  const showIncoming = phase === "incoming_ringing";
  const showOverlay =
    phase === "outgoing_ringing" ||
    phase === "connecting" ||
    phase === "connected" ||
    phase === "reconnecting" ||
    phase === "failed";

  // Block rendering while initAuth() is restoring the session on page refresh.
  // Without this, protected pages mount before the access token is available.
  if (isInitializing) {
    return <PageLoader />;
  }

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>
          <Route element={<PrivateRoute />}>
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/:id" element={<ChatPage />} />
            <Route path="/chat/:id/info" element={<GroupInfoPage />} />
            <Route path="/user/:id" element={<UserProfilePage />} />
            <Route path="/calls" element={<CallHistoryPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>

      <NotificationToaster />
      {showIncoming ? <IncomingCallDialog /> : null}
      {showOverlay ? <CallOverlay /> : null}
    </>
  );
}
