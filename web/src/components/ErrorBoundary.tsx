import React from 'react';

type State = { hasError: boolean; error?: any };

function stringifyError(err: any) {
  if (!err) return 'Unknown error';
  if (err.stack) return String(err.stack);
  if (err.message) return String(err.message);
  try { return JSON.stringify(err); } catch { return String(err); }
}

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error('[UI ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      const msg = stringifyError(this.state.error);
      return (
        <div className="p-6 max-w-2xl mx-auto">
          <h1 className="text-xl mb-3">Oups… une erreur côté interface</h1>
          <pre className="text-xs whitespace-pre-wrap bg-neutral-900 p-3 rounded">{msg}</pre>
          <button
            className="btn mt-4"
            onClick={() => { this.setState({ hasError: false, error: undefined }); location.reload(); }}
          >
            Recharger
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
