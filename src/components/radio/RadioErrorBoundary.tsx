import { Component, type ErrorInfo, type ReactNode } from "react";

type RadioErrorBoundaryProps = {
  children: ReactNode;
};

type RadioErrorBoundaryState = {
  error: Error | null;
};

export class RadioErrorBoundary extends Component<RadioErrorBoundaryProps, RadioErrorBoundaryState> {
  state: RadioErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RadioErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("RadioStudio crashed", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <section className="radio-error-fallback card" role="alert">
          <p className="kicker">Mamute FM</p>
          <h2>Rádio temporariamente indisponível</h2>
          <p className="radio-error-fallback-note">
            O player encontrou um erro inesperado. Recarregue a página para tentar novamente.
          </p>
          <button type="button" className="radio-dj-back" onClick={() => window.location.reload()}>
            Recarregar rádio
          </button>
        </section>
      );
    }

    return this.props.children;
  }
}
