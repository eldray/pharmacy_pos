// src/App.tsx
import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { useAppStore, initStore } from './store';
import { Login } from './components/Login';
import { DashboardLayout } from './components/DashboardLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LandingPage } from './pages/LandingPage';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useRuntimeMode } from './utils/runtimeMode';
import './App.css'; 

function App() {
  // initErrors lives in the store because initStore also runs from Login.tsx —
  // a sign-in during a backend outage shows this same banner, not an empty dashboard.
  const { currentUser, setCurrentUser, initErrors, setInitErrors } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  // A live till opens on the sign-in screen, not on the marketing page.
  const { production } = useRuntimeMode();

  const runInit = (role: string) => initStore(role);

  // The desktop application menu opens pages that belong to the SPA rather than
  // to Electron, so it asks for them here instead of loading a second window.
  const navigate = useNavigate();
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.onNavigate) return;
    return api.onNavigate((path: string) => navigate(path));
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      import('./api/auth')
        .then(({ verifyToken }) => verifyToken(token))
        .then(async (user) => {
          if (user) {
            setCurrentUser(user);
            await runInit(user.role);
          } else {
            localStorage.removeItem('auth_token');
          }
        })
        .catch(() => {
          localStorage.removeItem('auth_token');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [setCurrentUser]);

  const handleRetryInit = async () => {
    if (!currentUser) return;
    setInitErrors([]);
    setIsLoading(true);
    await runInit(currentUser.role);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-lg font-medium text-gray-700">Loading PharmacyPOS...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {initErrors.length > 0 && (
        <div
          role="alert"
          className="fixed left-1/2 -translate-x-1/2 flex items-start gap-3"
          style={{
            top: 12,
            zIndex: 'var(--z-modal)',
            background: 'var(--color-danger-light)',
            border: '1px solid var(--color-danger)',
            borderRadius: 10,
            boxShadow: 'var(--shadow-xl)',
            padding: '10px 14px',
            maxWidth: '92vw',
            width: 'min(560px, 92vw)',
          }}
        >
          <AlertCircle style={{ width: 18, height: 18, flexShrink: 0, color: 'var(--color-danger-text)', marginTop: 2 }} />
          <div style={{ color: 'var(--color-danger-text)', fontSize: '0.78rem', lineHeight: 1.5 }}>
            <strong>Some data couldn&apos;t be loaded.</strong> The connection to the server may be down.
            <ul style={{ margin: '4px 0 0', paddingLeft: 16, listStyle: 'disc' }}>
              {initErrors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
          <div className="flex items-center gap-2" style={{ marginLeft: 'auto', flexShrink: 0 }}>
            <button
              onClick={handleRetryInit}
              aria-label="Retry loading data"
              className="btn-ghost flex items-center gap-1"
              style={{ fontSize: '0.72rem', padding: '5px 10px', color: 'var(--color-danger-text)' }}
            >
              <RefreshCw style={{ width: 12, height: 12 }} /> Retry
            </button>
            <button
              onClick={() => setInitErrors([])}
              aria-label="Dismiss error"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger-text)' }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      )}
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={production ? <Navigate to="/login" replace /> : <LandingPage />} />
          <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/dashboard" replace />} />
          <Route path="/dashboard/*" element={currentUser ? <DashboardLayout /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </>
  );
}

export default App;
