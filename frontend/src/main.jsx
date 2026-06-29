import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// IMPORTANT: Import theme.css first
import './styles/theme.css';
import './index.css'; // Your Tailwind imports

// Apply persisted theme before first paint
const persisted = localStorage.getItem('pharmacypos-theme');
let theme = 'light';
try {
  const parsed = JSON.parse(persisted || '{}');
  if (parsed?.state?.theme) theme = parsed.state.theme;
} catch { }
document.documentElement.setAttribute('data-theme', theme);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);