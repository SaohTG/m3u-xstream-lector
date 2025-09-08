import { useState } from 'react'
import { login, register } from '../api'
import { useNavigate } from 'react-router-dom'

export default function Login(){
  const [email,setEmail]=useState('demo@user.com')
  const [password,setPassword]=useState('demo123')
  const [mode,setMode]=useState<'login'|'register'>('login')
  const [name,setName]=useState('Demo')
  const [err,setErr]=useState<string|null>(null)
  const navigate = useNavigate()

  const submit = async (e:any)=>{
    e.preventDefault()
    try{
      if(mode==='login') await login(email,password)
      else await register(email,password,name)
      navigate('/')
    }catch(e:any){ setErr(e.response?.data?.message || 'Erreur') }
  }

  return (
    <div className="max-w-md mx-auto mt-16 card p-6">
      <h1 className="text-2xl font-semibold mb-4">{mode==='login'?'Connexion':'Créer un compte'}</h1>
      <form onSubmit={submit} className="space-y-3">
        {mode==='register' && (
          <input className="w-full p-3 rounded bg-neutral-800" placeholder="Nom affiché" value={name} onChange={e=>setName(e.target.value)}/>
        )}
        <input className="w-full p-3 rounded bg-neutral-800" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/>
        <input className="w-full p-3 rounded bg-neutral-800" type="password" placeholder="Mot de passe" value={password} onChange={e=>setPassword(e.target.value)}/>
        {err && <div className="text-red-400 text-sm">{err}</div>}
        <button className="btn w-full">{mode==='login'?'Se connecter':'Créer et se connecter'}</button>
      </form>
      <div className="text-sm mt-3">
        {mode==='login' ? (
          <button onClick={()=>setMode('register')} className="underline">Pas de compte ? Inscrivez-vous</button>
        ) : (
          <button onClick={()=>setMode('login')} className="underline">Déjà inscrit ? Connectez-vous</button>
        )}
      </div>
    </div>
  )
}
