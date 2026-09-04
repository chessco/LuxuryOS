import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Auto-recover from dynamic import / outdated deployment chunk errors
window.addEventListener('vite:preloadError', (event) => {
    console.warn('Vite preload error detected, reloading to get latest bundle...', event);
    window.location.reload();
});

// Auto-update Service Worker so new versions activate immediately without blank screens
registerSW({
    immediate: true,
    onNeedRefresh() {
        console.log('New content available, refreshing...');
        window.location.reload();
    },
    onOfflineReady() {
        console.log('App ready to work offline');
    }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
