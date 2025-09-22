import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';

import './host.css';
import '../web-app/src/index.css';

import { installAuthFetch } from './lib/auth-gate';
import App from '../web-app/src/App';

const ExtensionApp = () => {
  useEffect(() => {
    installAuthFetch();

    try {
      const host = document.querySelector('.mc-editor-host');
      if (host) host.setAttribute('data-hydrated', 'true');
      document.documentElement.classList.add('dark');
    } catch (error) {
      console.warn('Failed to initialize extension host state', error);
    }

    try {
      const raw = sessionStorage.getItem('mc_after_login');
      if (!raw) return;
      sessionStorage.removeItem('mc_after_login');
      const ctx = JSON.parse(raw);
      if (ctx && ctx.action === 'download' && ctx.href) {
        location.assign(ctx.href);
      }
    } catch (error) {
      console.warn('Failed to resume post-login action', error);
    }
  }, []);

  return (
    <div className="mc-full-bleed">
      <App />
    </div>
  );
};

const mountEl =
  document.querySelector<HTMLElement>('.mc-editor-host #root') ||
  document.getElementById('root');

if (!mountEl) {
  throw new Error('Moodclip uploader extension root element not found');
}

createRoot(mountEl).render(<ExtensionApp />);
