import React from 'react';

export default class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { error?: any }> {
  state = { error: null as any };

  static getDerivedStateFromError(error: any) {
    return { error };
  }

  componentDidCatch(error: any, info: any) {
    console.error('UI crash:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', background: '#110', color: '#fff', padding: 16 }}>
          <h2>Une erreur s’est produite dans l’interface</h2>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#200', padding: 8, borderRadius: 8 }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button onClick={() => location.reload()} style={{ marginTop: 8, padding: '8px 12px' }}>
            Recharger
          </button>
        </div>
      );
    }
    return this.props.children as any;
  }
}
