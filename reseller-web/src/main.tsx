import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import './styles.css';

if ('serviceWorker' in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  void navigator.serviceWorker
    .getRegistrations()
    .then(async (registrations) => {
      if (registrations.length === 0) return;
      const results = await Promise.all(registrations.map((registration) => registration.unregister()));
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }
      if (hadController && results.some(Boolean) && !sessionStorage.getItem('reseller_sw_cleaned')) {
        sessionStorage.setItem('reseller_sw_cleaned', '1');
        window.location.reload();
      }
    })
    .catch(() => {
      // Ignore service worker cleanup failures in restricted browser contexts.
    });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
