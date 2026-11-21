import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import './styles.css'
import { getRouter } from './router'
import App from './App'

const isVerify = new URLSearchParams(window.location.search).has('verify')

if (isVerify) {
  console.info('[Verify Stage] renderer mounted proof component')
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
} else {
  const router = getRouter()

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  )
}
