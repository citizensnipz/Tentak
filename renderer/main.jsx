import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from '@/auth/AuthContext';
import { AuthOverlay } from '@/views/AuthOverlay';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
      <AuthOverlay />
    </AuthProvider>
  </React.StrictMode>
);
