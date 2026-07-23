import { Clock, Ban, ShieldAlert } from 'lucide-react';
import { supabase } from './supabaseClient';
import { INK, PAPER, CARD, LINE, BRICK, GOLD } from './theme';

const CONTENT = {
  pendente: {
    icon: Clock,
    color: GOLD,
    title: 'Conta pendente de aprovação',
    text: 'A tua conta foi criada mas ainda não está ativa. Isto acontece assim que o pagamento/registo for confirmado. Contacta o suporte se achas que isto está a demorar mais do que deveria: 861482794 (WhatsApp/chamadas) ou massingue88@gmail.com.',
  },
  bloqueado: {
    icon: Ban,
    color: BRICK,
    title: 'Conta bloqueada',
    text: 'O acesso a esta conta foi suspenso. Contacta o suporte para perceber porquê e como reativar: 861482794 (WhatsApp/chamadas) ou massingue88@gmail.com.',
  },
  dispositivo: {
    icon: ShieldAlert,
    color: BRICK,
    title: 'Dispositivo não autorizado',
    text: 'Esta conta já está associada a outro dispositivo. Contacta o suporte se precisas de mudar de telemóvel/computador: 861482794 (WhatsApp/chamadas) ou massingue88@gmail.com.',
  },
};

export default function AccessGate({ tipo }) {
  const { icon: Icon, color, title, text } = CONTENT[tipo];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 font-body" style={{ background: PAPER, color: INK }}>
      <div className="w-full max-w-sm rounded-xl p-6 text-center" style={{ background: CARD, border: `1px solid ${LINE}` }}>
        <Icon size={32} style={{ color, margin: '0 auto' }} />
        <h2 className="font-display text-xl mt-3">{title}</h2>
        <p className="text-sm mt-2" style={{ color: INK, opacity: 0.7 }}>{text}</p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="mt-5 text-sm underline"
          style={{ color: INK, opacity: 0.6 }}
        >
          Sair
        </button>
      </div>
    </div>
  );
}
