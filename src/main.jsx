import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { DialogProvider } from './components/DialogProvider.jsx'
import FilmEditAccessProvider from './components/FilmEditAccessProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DialogProvider><FilmEditAccessProvider><App /></FilmEditAccessProvider></DialogProvider>
  </StrictMode>,
)
