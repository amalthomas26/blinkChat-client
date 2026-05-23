import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[ErrorBoundary] Caught:", error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100dvh",
            background: "#0b0f19",
            color: "#e2e8f0",
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            padding: "1.5rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "rgba(239,68,68,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>
            Something went wrong
          </h1>
          <p
            style={{
              margin: "8px 0 24px",
              fontSize: 14,
              color: "#94a3b8",
              maxWidth: 400,
            }}
          >
            An unexpected error occurred. Your data is safe — try reloading the
            page.
          </p>

          <button
            onClick={this.handleReload}
            type="button"
            style={{
              padding: "10px 28px",
              borderRadius: 12,
              border: "none",
              background: "#8b5cf6",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 200ms",
            }}
            onMouseEnter={(e) =>
              ((e.target as HTMLButtonElement).style.background = "#7c3aed")
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLButtonElement).style.background = "#8b5cf6")
            }
          >
            Reload Page
          </button>

          {this.state.error && (
            <pre
              style={{
                marginTop: 24,
                padding: "12px 16px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                fontSize: 12,
                color: "#64748b",
                maxWidth: 480,
                overflow: "auto",
                textAlign: "left",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
