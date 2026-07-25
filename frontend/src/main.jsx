import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { FingerprintProvider } from './context/FingerprintContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FingerprintProvider>
      <App />
    </FingerprintProvider>
  </StrictMode>,
)
