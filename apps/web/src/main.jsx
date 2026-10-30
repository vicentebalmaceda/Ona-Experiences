import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import { createI18n } from './i18n';
import { langFromPath } from './routes.js';
import App from './App.jsx';

// The content language comes only from the URL ('/en…' → en, else es).
const i18n = createI18n(langFromPath(window.location.pathname));

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </I18nextProvider>
  </React.StrictMode>
);
