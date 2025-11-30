import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@/index.css';

// Initialize PWA functionality
import { register, initInstallPrompt, initNetworkStatus } from '@/lib/pwa';

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);

// Register service worker and PWA features
if (process.env.NODE_ENV === 'production') {
  register();
}

initInstallPrompt();
initNetworkStatus();