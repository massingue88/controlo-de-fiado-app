import { useState } from 'react';
import { Store, Loader2 } from 'lucide-react';
import { supabase } from './supabaseClient';
import { INK, TEAL, BRICK, CARD, LINE, PAPER } from './theme';

export default function Auth() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nomeLoja, setNomeLoja] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signupDone, setSignupDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Preenche o email e a palavra-passe.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
      } else {
        if (password.length < 6) {
          setError('A palavra-passe precisa de pelo menos 6 caracteres.');
          setLoading(false);
          return;
        }
        const { error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { nome_loja: nomeLoja.trim() || 'Minha Loja' } },
        });
        if (err) throw err;
        setSignupDone(true);
      }
    } catch (err) {
      setError(traduzErro(err.message));
    } finally {
      setLoading(false);
    }
  }

  function traduzErro(msg) {
    if (/already registered/i.test(msg)) return 'Este email já está registado. Tenta iniciar sessão.';
    if (/invalid login credentials/i.test(msg)) return 'Email ou palavra-passe incorretos.';
    if (/email not confirmed/i.test(msg)) return 'Confirma o teu email antes de entrar (verifica a caixa de entrada).';
    return msg;
  }

  if (signupDone) {
    return (
      <Shell>
        <div className="text-center">
          <h2 className="font-display text-xl mb-2">Conta criada</h2>
          <p className="text-sm" style={{ color: INK, opacity: 0.7 }}>
            Verifica o teu email para confirmar a conta. Depois de confirmares, a tua conta fica <strong>pendente de aprovação</strong> até o pagamento/registo ser confirmado — vais receber acesso assim que isso acontecer.
          </p>
          <button
            onClick={() => { setSignupDone(false); setMode('login'); }}
            className="mt-4 text-sm underline"
            style={{ color: TEAL }}
          >
            Voltar ao login
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-center gap-2 justify-center mb-1">
        <Store size={20} style={{ color: TEAL }} />
        <h1 className="font-display text-2xl">Controlo de Fiado</h1>
      </div>
      <p className="text-xs text-center mb-5" style={{ color: INK, opacity: 0.55 }}>
        {mode === 'login' ? 'Entra na tua conta' : 'Cria a tua conta de lojista'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'signup' && (
          <input
            value={nomeLoja}
            onChange={(e) => setNomeLoja(e.target.value)}
            placeholder="Nome da loja"
            className="w-full rounded-md px-3 py-2 text-sm outline-none"
            style={{ border: `1px solid ${LINE}` }}
          />
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          className="w-full rounded-md px-3 py-2 text-sm outline-none"
          style={{ border: `1px solid ${LINE}` }}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Palavra-passe"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          className="w-full rounded-md px-3 py-2 text-sm outline-none"
          style={{ border: `1px solid ${LINE}` }}
        />

        {error && <p className="text-xs" style={{ color: BRICK }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md py-2.5 text-sm font-medium text-white flex items-center justify-center gap-2"
          style={{ background: TEAL, opacity: loading ? 0.7 : 1 }}
        >
          {loading && <Loader2 size={15} className="animate-spin" />}
          {mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>
      </form>

      <p className="text-xs text-center mt-4" style={{ color: INK, opacity: 0.6 }}>
        {mode === 'login' ? (
          <>Ainda não tens conta?{' '}
            <button onClick={() => { setMode('signup'); setError(''); }} className="underline" style={{ color: TEAL }}>
              Regista a tua loja
            </button>
          </>
        ) : (
          <>Já tens conta?{' '}
            <button onClick={() => { setMode('login'); setError(''); }} className="underline" style={{ color: TEAL }}>
              Iniciar sessão
            </button>
          </>
        )}
      </p>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 font-body" style={{ background: PAPER, color: INK }}>
      <div className="w-full max-w-sm rounded-xl p-6" style={{ background: CARD, border: `1px solid ${LINE}` }}>
        {children}
      </div>
    </div>
  );
}
