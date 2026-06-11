import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Unknown screen error.'
    };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('Mythic Quest recovered from a render error:', error, info);
  }

  clearLocalSaves = () => {
    const prefix = 'mythic-quest:saves';
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(prefix)) localStorage.removeItem(key);
    });
    sessionStorage.clear();
    window.location.href = '/';
  };

  reload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="auth-screen safe-top safe-bottom">
        <div className="panel auth-card centered">
          <p className="eyebrow">Recovery Mode</p>
          <h1>Screen failed to load</h1>
          <p className="muted">
            A corrupted old save or browser cache caused the blank screen. Use Reset Local Saves once, then create a fresh slot.
          </p>
          <div className="notice danger">{this.state.message}</div>
          <div className="stacked-actions">
            <button className="primary" onClick={this.clearLocalSaves}>Reset Local Saves</button>
            <button className="ghost" onClick={this.reload}>Reload</button>
          </div>
        </div>
      </main>
    );
  }
}
