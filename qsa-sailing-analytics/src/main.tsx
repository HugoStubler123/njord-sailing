/**
 * Main Application Entry Point
 * Sets up React application and renders to DOM
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Ensure we have a root element
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found. Make sure there is a <div id="root"></div> in your HTML.');
}

// Create React root and render app
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Hot module replacement (for development)
if (import.meta.hot) {
  import.meta.hot.accept();
}