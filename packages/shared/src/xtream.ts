import axios from 'axios';

export type XtreamDiscovery = {
  ok: boolean;
  endpoint?: string; // full baseUrl ending with player_api.php
  cleanUrl?: string; // scheme+host without port for display
  data?: any;
  tried: string[];
};

const PORTS = [80,8080,8000,2052,2086,2095,2179];

function toCandidates(hostOrUrl: string): string[] {
  let host = hostOrUrl.trim();
  if (host.endsWith('/')) host = host.slice(0,-1);
  host = host.replace(/\s+/g, '');
  // strip protocol if present to build both
  const withoutProto = host.replace(/^https?:\/\//i, '');
  const hosts = [`https://${withoutProto}`, `http://${withoutProto}`];
  const out: string[] = [];
  for (const base of hosts) {
    out.push(`${base}/player_api.php`);
    for (const p of PORTS) out.push(`${base.split('://')[0]}://${withoutProto.split('/')[0]}:${p}/player_api.php`);
  }
  return Array.from(new Set(out));
}

export async function discoverBase(hostOrUrl: string, username: string, password: string, ua = 'Mozilla/5.0'): Promise<XtreamDiscovery> {
  const tried: string[] = [];
  for (const candidate of toCandidates(hostOrUrl)) {
    tried.push(candidate);
    try {
      const url = `${candidate}?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
      const res = await axios.get(url, {
        timeout: 8000,
        maxRedirects: 5,
        headers: { 'User-Agent': ua },
        httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
      });
      if (res.data && res.data.user_info && res.data.server_info) {
        const u = new URL(candidate);
        return { ok: true, endpoint: candidate, cleanUrl: `${u.protocol}//${u.hostname}`, data: res.data, tried };
      }
    } catch {}
  }
  return { ok: false, tried };
}
