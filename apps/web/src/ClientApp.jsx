import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { InitialDataContext } from './site/initialData.js';
import App from './App.jsx';

/**
 * The browser's element tree. Mirrors src/entry-server.jsx (StrictMode →
 * InitialDataContext → I18nextProvider → router → App), which hydration needs.
 */
export default function ClientApp({ data, i18n }) {
  return (
    <React.StrictMode>
      <InitialDataContext.Provider value={{ data, ssr: false }}>
        <I18nextProvider i18n={i18n}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </I18nextProvider>
      </InitialDataContext.Provider>
    </React.StrictMode>
  );
}
