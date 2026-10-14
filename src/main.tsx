import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { StoreProvider } from './store';
import { GoogleProvider } from './lib/useGoogle';
import { GoogleSyncProvider } from './lib/useGoogleSync';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <GoogleProvider>
        <GoogleSyncProvider>
          <HashRouter>
            <App />
          </HashRouter>
        </GoogleSyncProvider>
      </GoogleProvider>
    </StoreProvider>
  </StrictMode>,
);
