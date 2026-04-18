import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0f172a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          color: '#f1f5f9',
          fontFamily: 'sans-serif'
        }}>
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            padding: '32px',
            borderRadius: '12px',
            maxWidth: '500px'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#ef4444', marginBottom: '16px' }}>
              Terjadi Kesalahan Aplikasi
            </h2>
            <p style={{ color: '#cbd5e1', marginBottom: '24px', fontSize: '14px' }}>
              Maaf, aplikasi tidak dapat dimuat. Pastikan koneksi internet stabil dan konfigurasi (Environment Variables) sudah benar.
            </p>
            <div style={{
              backgroundColor: '#020617',
              padding: '16px',
              borderRadius: '4px',
              textAlign: 'left',
              overflow: 'auto',
              maxHeight: '160px',
              marginBottom: '24px'
            }}>
              <code style={{ color: '#f87171', fontSize: '12px' }}>
                {this.state.error?.message || 'Error tidak diketahui'}
              </code>
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 24px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Coba Lagi
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
