import { Outlet, Link, useNavigate } from 'react-router-dom'
import './styles.css'

export default function App() {
  const navigate = useNavigate();
  const logout = () => { localStorage.removeItem('token'); navigate('/login'); }
  return (
    <div>
      <header className="header px-4 py-3 flex gap-6 items-center">
        <Link to="/" className="font-bold text-xl">IPTV One</Link>
        <nav className="flex gap-4 text-sm">
          <Link to="/movies">Films</Link>
          <Link to="/series">Séries</Link>
          <Link to="/live">TV en direct</Link>
          <Link to="/my-list">Ma liste</Link>
        </nav>
        <div className="ml-auto">
          <button className="btn" onClick={logout}>Déconnexion</button>
        </div>
      </header>
      <main className="p-4">
        <Outlet/>
      </main>
    </div>
  )
}
