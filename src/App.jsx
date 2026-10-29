import { useCallback, useState } from 'react'
import Auth from './Auth.jsx'
import Dashboard from './Dashboard.jsx'

function App() {
  const [account, setAccount] = useState(null)
  const authenticated = useCallback((nextAccount) => setAccount(nextAccount), [])

  async function logout() {
    await fetch('/api/auth/session', { method: 'DELETE', credentials: 'include' })
    setAccount(null)
  }

  if (!account) return <Auth onAuthenticated={authenticated} />
  return <Dashboard account={account} onLogout={logout} />
}

export default App
