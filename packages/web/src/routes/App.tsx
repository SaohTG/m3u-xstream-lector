import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { clearToken } from '../lib/api';

export default function App() {
  const nav = useNavigate();
  return (
    <div style={{fontFamily:'system-ui, sans-serif', color:'#eee', background:'#111', minHeight:'100vh'}}>
      <header style={{display:'flex',gap:16,alignItems:'center',padding:'10px 16px',borderBottom:'1px solid #333'}}>
        <div style={{fontWeight:700}}>NovaStream</div>
        <nav style={{display:'flex',gap:12}}>
          <NavLink to="/movies">Films</NavLink>
          <NavLink to="/shows">Séries</NavLink>
          <NavLink to="/live">TV en direct</NavLink>
          <NavLink to="/list">Ma liste</NavLink>
        </nav>
        <div style={{marginLeft:'auto'}}>
          <button onClick={()=>{ clearToken(); nav('/auth'); }}>Se déconnecter</button>
        </div>
      </header>
      <main style={{padding:16}}>
        <Outlet/>
      </main>
    </div>
  );
}
