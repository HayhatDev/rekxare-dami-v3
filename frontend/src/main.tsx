import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import ErrorBoundary from './components/Auth/ErrorBoundary';

import App from './App';
import './i18n';

import './index.css';

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);