// src/App.tsx
import React, { useEffect, useState } from 'react';
import { useAppStore, initStore } from './store';
import { Login } from './components/Login';
import { DashboardLayout } from './components/DashboardLayout';
import { LandingPage } from './pages/LandingPage';
import { Routes, Route, Navigate } from 'react-router-dom';

function App() {
  const { currentUser, setCurrentUser } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      import('./api/auth')
        .then(({ verifyToken }) => verifyToken(token))
        .then((user) => {
          if (user) {
            setCurrentUser(user);
            initStore(user.role);
            // Removed navigation - let the routes handle redirection
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
  }, [setCurrentUser]); // Removed navigate from dependencies

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
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/dashboard" replace />} />
      <Route path="/dashboard/*" element={currentUser ? <DashboardLayout /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
