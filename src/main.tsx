import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Polyfills for simple-peer compatibility
if (typeof global === 'undefined') {
  (window as any).global = window;
}

// Add process polyfill
if (typeof (window as any).process === 'undefined') {
  (window as any).process = {
    env: {},
    nextTick: (fn: () => void) => setTimeout(fn, 0),
    version: '',
    versions: { node: '' }
  };
}

// Add Buffer polyfill
if (typeof (window as any).Buffer === 'undefined') {
  try {
    const { Buffer } = require('buffer');
    (window as any).Buffer = Buffer;
  } catch (e) {
    // Fallback if buffer is not available
    console.warn('Buffer polyfill not available');
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
