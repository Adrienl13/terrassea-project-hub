import { Component, type ErrorInfo, type ReactNode } from "react";
import i18n from "@/i18n";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const t = (key: string, fallback: string) => i18n.t(key, fallback);
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="text-center max-w-md">
            <h1 className="font-display text-2xl font-semibold text-foreground mb-2">
              {t("errors.errorBoundaryTitle", "Something went wrong")}
            </h1>
            <p className="font-body text-muted-foreground mb-6">
              {t("errors.errorBoundaryMessage", "An unexpected error occurred. Please try reloading the page.")}
            </p>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              {t("errors.reload", "Reload")}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
