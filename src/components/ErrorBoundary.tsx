import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last-resort safety net. Without this, ANY uncaught error anywhere in the
 * render tree - a misconfigured env var, a bad adapter response, anything -
 * takes down the whole app with a blank white screen and nothing visible
 * except whatever happens to be in the browser console (which is exactly
 * what happened here: createClient() throwing synchronously inside a
 * store's init() during a useEffect crashed the entire tree). This renders
 * a plain, dependency-free fallback with the actual error on screen instead,
 * so the person hitting it can read/screenshot it without opening devtools.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[mykonos] Uncaught render error:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        dir="rtl"
        style={{
          minHeight: "100dvh",
          padding: 24,
          background: "#F4F9FF",
          fontFamily: "sans-serif",
          color: "#0f172a",
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "#b91c1c", margin: 0 }}>
          משהו נשבר באפליקציה 😥
        </h1>
        <p style={{ marginTop: 10, color: "#334155", lineHeight: 1.5 }}>
          שגיאה טכנית מנעה מהאפליקציה לעלות. אפשר לצלם את ההודעה למטה ולשלוח למי שתומך
          באפליקציה, ואז לנסות לרענן.
        </p>
        <pre
          style={{
            marginTop: 14,
            padding: 12,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            fontSize: 12,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            direction: "ltr",
            textAlign: "left",
          }}
        >
          {error.message}
        </pre>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 18,
            padding: "12px 24px",
            background: "#1E6FD9",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          רענון
        </button>
      </div>
    );
  }
}
