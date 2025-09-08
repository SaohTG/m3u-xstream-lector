const API = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:4000'; // 10.0.2.2 for Android emulator

export async function login(email: string, password: string){
  const res = await fetch(`${API}/auth/login`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ email, password })
  })
  return await res.json()
}

export async function parseM3U(url: string, token: string){
  const res = await fetch(`${API}/playlists/parse-m3u`, {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
    body: JSON.stringify({ url })
  })
  const data = await res.json()
  return data.items || []
}
