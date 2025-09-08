import React from 'react';
export default function Home() {
  return (
    <div style={{padding:16}}>
      <h2>Bienvenue 👋</h2>
      <p>Front minimal opérationnel.</p>
      <button onClick={() => { localStorage.removeItem('token'); location.replace('/login'); }}>
        Se déconnecter
      </button>
    </div>
  );
}
