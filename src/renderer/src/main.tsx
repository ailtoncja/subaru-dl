import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { iniciarEstado } from './estado'
import './estilos.css'

void iniciarEstado()

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
