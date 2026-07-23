import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from './supabaseClient';
import { getDeviceId } from './lib/device';
import Auth from './Auth';
import AccessGate from './AccessGate';
import Dashboard from './Dashboard';
import { PAPER, TEAL } from './theme';

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = a verificar, null = sem sessão
  const [lojista, setLojista] = useState(null);
  const [gate, setGate] = useState(null); // null | 'pendente' | 'bloqueado' | 'dispositivo'
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const verificarAcesso = useCallback(async (userId) => {
    setChecking(true);
    setGate(null);

    const { data: perfil, error } = await supabase
      .from('lojistas')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !perfil) {
      setChecking(false);
      setGate('pendente');
      return;
    }

    if (perfil.status === 'bloqueado') {
      setLojista(perfil);
      setGate('bloqueado');
      setChecking(false);
      return;
    }

    if (perfil.status === 'pendente') {
      setLojista(perfil);
      setGate('pendente');
      setChecking(false);
      return;
    }

    // status === 'ativo' → confirma o dispositivo
    const deviceId = getDeviceId();
    const { data: deviceAtual, error: errDevice } = await supabase.rpc('registar_dispositivo', {
      p_device_id: deviceId,
    });

    if (errDevice) {
      setLojista(perfil);
      setGate('pendente'); // falha de segurança → não deixa entrar
      setChecking(false);
      return;
    }

    if (deviceAtual !== deviceId) {
      setLojista(perfil);
      setGate('dispositivo');
      setChecking(false);
      return;
    }

    setLojista(perfil);
    setGate(null);
    setChecking(false);
  }, []);

  useEffect(() => {
    if (session === undefined) return; // ainda a carregar
    if (session === null) {
      setLojista(null);
      setGate(null);
      setChecking(false);
      return;
    }
    verificarAcesso(session.user.id);
  }, [session, verificarAcesso]);

  if (session === undefined || (session && checking)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: PAPER }}>
        <Loader2 className="animate-spin" size={28} style={{ color: TEAL }} />
      </div>
    );
  }

  if (!session) return <Auth />;
  if (gate) return <AccessGate tipo={gate} />;
  if (!lojista) return <Auth />;

  return <Dashboard lojista={lojista} />;
}
