import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App'

// Get base URL from Vite (for GitHub Pages deployment)
const basename = import.meta.env.BASE_URL

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
)




