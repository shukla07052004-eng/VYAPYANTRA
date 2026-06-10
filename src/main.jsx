import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

let pendingLoaderTimeout = null

function dismissLoader(message) {
  const loader = document.getElementById('app-loader')
  if (!loader) return

  // Clear any pending timeout
  if (pendingLoaderTimeout) {
    window.clearTimeout(pendingLoaderTimeout)
    pendingLoaderTimeout = null
  }

  const hide = () => {
    loader.classList.add('hide')
    pendingLoaderTimeout = window.setTimeout(() => {
      if (loader && loader.parentNode) loader.remove()
    }, 450)
  }

  if (message) {
    const text = loader.querySelector('.loader-text')
    if (text) text.textContent = message
    console.log('[Loader]', message)
    pendingLoaderTimeout = window.setTimeout(hide, 700)
    return
  }

  console.log('[Loader] Dismissing')
  hide()
}

class StartupBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch() {
    dismissLoader('Startup issue fixed. Reloading may help.')
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f4f4f4', color: '#111', fontFamily: 'Inter, system-ui, sans-serif' }}>
          <div style={{ padding: 24, border: '1px solid #e5e5e5', borderRadius: 10, background: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,.08)' }}>
            The app hit a startup issue. Refresh once and it should recover.
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const bootTimeout = window.setTimeout(() => {
  dismissLoader('Loading app...')
}, 2200)

// Fallback: Force remove loader after 5 seconds total to prevent getting stuck
const fallbackTimeout = window.setTimeout(() => {
  const loader = document.getElementById('app-loader')
  if (loader) {
    loader.style.display = 'none'
    if (loader.parentNode) loader.remove()
  }
}, 5000)

window.addEventListener('error', () => dismissLoader('Startup issue fixed. Reloading may help.'), { once: true })
window.addEventListener('unhandledrejection', () => dismissLoader('Startup issue fixed. Reloading may help.'), { once: true })

console.log('[Boot] Starting React mount...')
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <StartupBoundary>
      <BrowserRouter>
        <App onReady={() => {
          console.log('[Boot] App onReady callback fired')
          window.clearTimeout(bootTimeout)
          window.clearTimeout(fallbackTimeout)
          window.setTimeout(() => dismissLoader(), 300)
        }}
        />
      </BrowserRouter>
    </StartupBoundary>
  </React.StrictMode>
)
console.log('[Boot] React render called')
