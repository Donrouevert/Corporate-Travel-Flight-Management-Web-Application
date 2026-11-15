import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
const SocketContext = createContext({ connected: false, mode: 'Local session', broadcast: (_message: string) => {} });
export function SocketProvider({ children }: { children: ReactNode }) {
  const query = useQueryClient(), channel = useRef<BroadcastChannel | null>(null);
  const [mode, setMode] = useState('Local session');
  useEffect(() => {
    if(supabase){setMode('Connecting…');const remote=supabase.channel('travel-workspace').on('postgres_changes',{event:'*',schema:'public'},()=>{void query.invalidateQueries();}).subscribe(status=>setMode(status==='SUBSCRIBED'?'Cloud sync':status==='CHANNEL_ERROR'?'Sync unavailable':'Connecting…'));const focus=()=>{void query.invalidateQueries();};window.addEventListener('focus',focus);return()=>{void supabase!.removeChannel(remote);window.removeEventListener('focus',focus);};}

    const receive = (message: unknown) => { if (typeof message !== 'object' || !message || !('message' in message) || typeof message.message !== 'string') return; void query.invalidateQueries(); toast.success(message.message); };
    try { channel.current = new BroadcastChannel('unilever-tms-realtime'); channel.current.onmessage = e => receive(e.data); setMode('Live sync'); } catch { setMode('Storage sync'); }
    const storage = (e: StorageEvent) => { if (e.key === 'unilever-tms-realtime' && e.newValue) try { receive(JSON.parse(e.newValue)); } catch { /* Ignore unrelated storage. */ } };
    const focus = () => { void query.invalidateQueries(); };
    window.addEventListener('storage', storage); window.addEventListener('focus', focus);
    return () => { channel.current?.close(); channel.current = null; window.removeEventListener('storage', storage); window.removeEventListener('focus', focus); };
  }, [query]);
  const broadcast = (message: string) => { const event = { message, id: crypto.randomUUID() }; if (channel.current) channel.current.postMessage(event); else try { localStorage.setItem('unilever-tms-realtime', JSON.stringify(event)); } catch { setMode('Local session'); } };
  return <SocketContext.Provider value={{ connected: ['Cloud sync','Live sync','Storage sync'].includes(mode), mode, broadcast }}>{children}</SocketContext.Provider>;
}
export const useSocket = () => useContext(SocketContext);
