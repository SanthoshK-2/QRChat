// import './polyfills-forced'; // Removed to avoid conflict with vite-plugin-node-polyfills
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

console.log('Main.jsx executing...');

try {
  const root = createRoot(document.getElementById('root'));
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  console.log('React Root rendered');
} catch (e) {
  console.error('React Root render failed:', e);
}
