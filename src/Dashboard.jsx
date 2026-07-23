import { useState, useEffect, useCallback } from 'react';
import {
  Plus, ArrowLeft, Search, X, Store, Phone, CircleAlert,
  Trash2, HelpCircle, LogOut, Download, MessageCircle,
  BarChart3, AlertTriangle, Pencil,
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { INK, PAPER, CARD, TEAL, BRICK, GOLD, LINE } from './theme';

export default function Dashboard({ lojista, onProfileChange }) {
  const [clientes, setClientes] = useState([]);
  const [transacoes, setTransacoes] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [view, setView] = useState('dashboard');
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newLimite, setNewLimite] = useState('');
  const [showTxForm, setShowTxForm] = useState(null);
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [editingLimite, setEditingLimite] = useState(false);
  const [limiteValue, setLimiteValue] = useState('');
  const [periodoRelatorio, setPeriodoRelatorio] = useState('hoje');

  const carregarDados = useCallback(async () => {
    setLoadingData(true);
    const [{ data: c, error: e1 }, { data: t, error: e2 }] = await Promise.all([
      supabase.from('clientes').select('*').order('created_at', { ascending: true }),
      supabase.from('transacoes').select('*').order('criado_em', { ascending: true }),
    ]);
    if (e1 || e2) setErrorMsg('Não foi possível carregar os dados. Verifica a tua ligação e tenta novamente.');
    setClientes(c || []);
    setTransacoes(t || []);
    setLoadingData(false);
  }, []);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  function balanceFor(clienteId) {
    return transacoes
      .filter((t) => t.cliente_id === clienteId)
      .reduce((sum, t) => sum + (t.tipo === 'fiado' ? Number(t.valor) : -Number(t.valor)), 0);
  }

  function lastMovement(clienteId) {
    const txs = transacoes.filter((t) => t.cliente_id === clienteId);
    if (txs.length === 0) return null;
    return txs.reduce((a, b) => (a.criado_em > b.criado_em ? a : b));
  }

  function daysSince(iso) {
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  }

  function formatMT(n) {
    return (Math.round(n * 100) / 100).toLocaleString('pt-PT', { maximumFractionDigits: 2 }) + ' MT';
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function avisoPagamento() {
    if (!lojista.proximo_pagamento) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const venc = new Date(lojista.proximo_pagamento + 'T00:00:00');
    const dias = Math.round((venc - hoje) / 86400000);

    if (dias < 0) {
      return { cor: BRICK, fundo: '#F7E9E7', texto: `Mensalidade vencida há ${Math.abs(dias)} dia${Math.abs(dias) !== 1 ? 's' : ''}. Contacte o suporte para regularizar: 861482794 (WhatsApp/chamadas) ou massingue88@gmail.com.` };
    }
    if (dias === 0) {
      return { cor: GOLD, fundo: '#F6EFDD', texto: 'A mensalidade vence hoje. Suporte: 861482794 (WhatsApp/chamadas) ou massingue88@gmail.com.' };
    }
    if (dias <= 5) {
      return { cor: GOLD, fundo: '#F6EFDD', texto: `A mensalidade vence em ${dias} dia${dias !== 1 ? 's' : ''}. Suporte: 861482794 (WhatsApp/chamadas) ou massingue88@gmail.com.` };
    }
    return null;
  }

  async function addCustomer() {
    if (!newName.trim()) return;
    setBusy(true);
    const limite = newLimite.trim() ? parseFloat(newLimite.replace(',', '.')) : null;
    const { error } = await supabase.from('clientes').insert({
      lojista_id: lojista.id,
      nome: newName.trim(),
      telefone: newPhone.trim() || null,
      limite_credito: limite && limite > 0 ? limite : null,
    });
    setBusy(false);
    if (error) { setErrorMsg('Não foi possível guardar o cliente.'); return; }
    setNewName(''); setNewPhone(''); setNewLimite(''); setShowAddCustomer(false);
    carregarDados();
  }

  async function guardarLimite() {
    if (!selectedId) return;
    const limite = limiteValue.trim() ? parseFloat(limiteValue.replace(',', '.')) : null;
    setBusy(true);
    const { error } = await supabase
      .from('clientes')
      .update({ limite_credito: limite && limite > 0 ? limite : null })
      .eq('id', selectedId);
    setBusy(false);
    if (error) { setErrorMsg('Não foi possível guardar o limite.'); return; }
    setEditingLimite(false);
    carregarDados();
  }

  async function removeCustomer(id) {
    setBusy(true);
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    setBusy(false);
    if (error) { setErrorMsg('Não foi possível remover o cliente.'); return; }
    setView('dashboard'); setSelectedId(null);
    carregarDados();
  }

  async function addTransaction(tipo) {
    const valor = parseFloat(txAmount.replace(',', '.'));
    if (!valor || valor <= 0 || !selectedId) return;
    setBusy(true);
    const { error } = await supabase.from('transacoes').insert({
      lojista_id: lojista.id,
      cliente_id: selectedId,
      tipo,
      valor,
      descricao: txDesc.trim() || null,
    });
    setBusy(false);
    if (error) { setErrorMsg('Não foi possível guardar o movimento.'); return; }
    setTxAmount(''); setTxDesc(''); setShowTxForm(null);
    carregarDados();
  }

  function exportarCSV() {
    const linhas = [['Cliente', 'Telefone', 'Tipo', 'Valor (MT)', 'Descrição', 'Data']];
    transacoes
      .slice()
      .sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em))
      .forEach((t) => {
        const cli = clientes.find((c) => c.id === t.cliente_id);
        linhas.push([
          cli ? cli.nome : '—',
          cli?.telefone || '',
          t.tipo === 'fiado' ? 'Fiado' : 'Pagamento',
          t.valor,
          t.descricao || '',
          formatDate(t.criado_em),
        ]);
      });
    const csv = linhas.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fiado-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function linkWhatsApp(cliente, saldo) {
    const numero = (cliente.telefone || '').replace(/\D/g, '');
    const msg = `Olá ${cliente.nome}, este é um lembrete de que tem um saldo de ${formatMT(saldo)} em aberto na ${lojista.nome_loja}. Obrigado!`;
    return `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`;
  }

  function dadosRelatorio(periodo) {
    const agora = new Date();
    let inicio;
    if (periodo === 'hoje') {
      inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    } else if (periodo === 'semana') {
      inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 6);
    } else {
      inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
    }
    const txsPeriodo = transacoes.filter((t) => new Date(t.criado_em) >= inicio);
    const totalFiado = txsPeriodo.filter((t) => t.tipo === 'fiado').reduce((s, t) => s + Number(t.valor), 0);
    const totalPagamento = txsPeriodo.filter((t) => t.tipo === 'pagamento').reduce((s, t) => s + Number(t.valor), 0);
    return { totalFiado, totalPagamento, saldoLiquido: totalFiado - totalPagamento, count: txsPeriodo.length };
  }

  const totalOwed = clientes.reduce((sum, c) => sum + Math.max(0, balanceFor(c.id)), 0);

  const filteredCustomers = clientes
    .filter((c) => c.nome.toLowerCase().includes(search.toLowerCase()))
    .map((c) => ({ ...c, balance: balanceFor(c.id), last: lastMovement(c.id) }))
    .sort((a, b) => b.balance - a.balance);

  const selectedCustomer = clientes.find((c) => c.id === selectedId);
  const selectedBalance = selectedId ? balanceFor(selectedId) : 0;
  const selectedTxs = transacoes
    .filter((t) => t.cliente_id === selectedId)
    .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));

  return (
    <div className="min-h-screen font-body" style={{ background: PAPER, color: INK }}>
      <div className="max-w-lg mx-auto min-h-screen">
        {view === 'dashboard' && (
          <div className="pb-24">
            <div className="px-5 pt-6 pb-4" style={{ borderBottom: `2px solid ${INK}` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store size={18} style={{ color: TEAL }} />
                  <h1 className="font-display text-xl">{lojista.nome_loja}</h1>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setView('relatorio')} className="p-1.5" style={{ color: INK, opacity: 0.6 }} aria-label="Relatório">
                    <BarChart3 size={19} />
                  </button>
                  <button onClick={() => setShowHelp(true)} className="p-1.5" style={{ color: INK, opacity: 0.6 }} aria-label="Ajuda">
                    <HelpCircle size={20} />
                  </button>
                  <button onClick={() => supabase.auth.signOut()} className="p-1.5" style={{ color: INK, opacity: 0.6 }} aria-label="Sair">
                    <LogOut size={19} />
                  </button>
                </div>
              </div>
              <p className="text-xs mt-1" style={{ color: INK, opacity: 0.55 }}>Livro de fiado digital</p>
            </div>

            {avisoPagamento() && (
              <div className="mx-5 mt-3 text-xs rounded-md px-3 py-2" style={{ background: avisoPagamento().fundo, color: avisoPagamento().cor }}>
                {avisoPagamento().texto}
              </div>
            )}

            <div className="mx-5 mt-5 rounded-lg p-4" style={{ background: CARD, border: `1px solid ${LINE}` }}>
              <div className="text-xs uppercase tracking-wide" style={{ color: INK, opacity: 0.55 }}>Total por receber</div>
              <div className="font-mono text-3xl font-semibold mt-1" style={{ color: totalOwed > 0 ? BRICK : TEAL }}>
                {formatMT(totalOwed)}
              </div>
              <div className="text-xs mt-1" style={{ color: INK, opacity: 0.5 }}>
                {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registado{clientes.length !== 1 ? 's' : ''}
              </div>
            </div>

            {errorMsg && (
              <div className="mx-5 mt-3 text-xs rounded-md px-3 py-2" style={{ background: '#F7E9E7', color: BRICK }}>
                {errorMsg}
              </div>
            )}

            <div className="mx-5 mt-4 flex gap-2">
              <div className="flex-1 flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: CARD, border: `1px solid ${LINE}` }}>
                <Search size={16} style={{ color: INK, opacity: 0.4 }} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Procurar cliente..." className="flex-1 bg-transparent outline-none text-sm" />
              </div>
              <button onClick={() => setShowAddCustomer(true)} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-white" style={{ background: TEAL }}>
                <Plus size={16} /> Novo
              </button>
            </div>

            <div className="mx-5 mt-3">
              <button onClick={exportarCSV} className="flex items-center gap-1.5 text-xs" style={{ color: INK, opacity: 0.6 }}>
                <Download size={13} /> Exportar histórico (CSV)
              </button>
            </div>

            <div className="mx-5 mt-4 space-y-2">
              {loadingData && <div className="text-center text-sm py-8" style={{ color: INK, opacity: 0.5 }}>A carregar...</div>}
              {!loadingData && filteredCustomers.length === 0 && clientes.length === 0 && (
                <div className="text-center py-10 rounded-lg" style={{ background: CARD, border: `1px dashed ${LINE}` }}>
                  <p className="font-display text-lg">Ainda não tem clientes</p>
                  <p className="text-sm mt-1" style={{ color: INK, opacity: 0.6 }}>Toque em "Novo" para registar o primeiro cliente fiado.</p>
                </div>
              )}
              {!loadingData && filteredCustomers.map((c) => {
                const overdue = c.balance > 0 && c.last && daysSince(c.last.criado_em) > 20;
                const overLimit = c.limite_credito && c.balance > Number(c.limite_credito);
                return (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedId(c.id); setView('detail'); }}
                    className="w-full flex items-center justify-between rounded-lg px-4 py-3 text-left"
                    style={{
                      background: CARD,
                      borderTop: `1px solid ${LINE}`, borderRight: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`,
                      borderLeft: `4px solid ${c.balance > 0 ? BRICK : TEAL}`,
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm">{c.nome}</span>
                        {overdue && <CircleAlert size={14} style={{ color: GOLD }} />}
                        {overLimit && <AlertTriangle size={14} style={{ color: BRICK }} />}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: INK, opacity: 0.5 }}>
                        {c.last ? `há ${daysSince(c.last.criado_em)} dia${daysSince(c.last.criado_em) !== 1 ? 's' : ''}` : 'sem movimentos'}
                        {overLimit && <span style={{ color: BRICK }}> · acima do limite</span>}
                      </div>
                    </div>
                    <div className="font-mono text-sm font-semibold" style={{ color: c.balance > 0 ? BRICK : c.balance < 0 ? GOLD : TEAL }}>
                      {c.balance === 0 ? 'Quite' : formatMT(Math.abs(c.balance))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {view === 'relatorio' && (
          <div className="pb-10">
            <div className="px-5 pt-6 pb-4" style={{ borderBottom: `2px solid ${INK}` }}>
              <button onClick={() => setView('dashboard')} className="flex items-center gap-1 text-sm mb-3" style={{ color: TEAL }}>
                <ArrowLeft size={16} /> Voltar
              </button>
              <h2 className="font-display text-2xl">Relatório</h2>
            </div>

            <div className="mx-5 mt-4 flex gap-2">
              {[
                { id: 'hoje', label: 'Hoje' },
                { id: 'semana', label: '7 dias' },
                { id: 'mes', label: 'Este mês' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriodoRelatorio(p.id)}
                  className="flex-1 rounded-lg py-2 text-sm font-medium"
                  style={{
                    background: periodoRelatorio === p.id ? TEAL : CARD,
                    color: periodoRelatorio === p.id ? '#fff' : INK,
                    border: `1px solid ${periodoRelatorio === p.id ? TEAL : LINE}`,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {(() => {
              const r = dadosRelatorio(periodoRelatorio);
              return (
                <div className="mx-5 mt-4 space-y-3">
                  <div className="rounded-lg p-4" style={{ background: CARD, border: `1px solid ${LINE}` }}>
                    <div className="text-xs uppercase tracking-wide" style={{ color: INK, opacity: 0.55 }}>Vendido a fiado</div>
                    <div className="font-mono text-2xl font-semibold mt-1" style={{ color: BRICK }}>{formatMT(r.totalFiado)}</div>
                  </div>
                  <div className="rounded-lg p-4" style={{ background: CARD, border: `1px solid ${LINE}` }}>
                    <div className="text-xs uppercase tracking-wide" style={{ color: INK, opacity: 0.55 }}>Recebido em pagamentos</div>
                    <div className="font-mono text-2xl font-semibold mt-1" style={{ color: TEAL }}>{formatMT(r.totalPagamento)}</div>
                  </div>
                  <div className="rounded-lg p-4" style={{ background: CARD, border: `1px solid ${LINE}` }}>
                    <div className="text-xs uppercase tracking-wide" style={{ color: INK, opacity: 0.55 }}>Saldo líquido do período</div>
                    <div className="font-mono text-2xl font-semibold mt-1" style={{ color: r.saldoLiquido > 0 ? BRICK : GOLD }}>
                      {r.saldoLiquido > 0 ? '+' : ''}{formatMT(r.saldoLiquido)}
                    </div>
                    <div className="text-xs mt-1" style={{ color: INK, opacity: 0.5 }}>
                      {r.saldoLiquido > 0
                        ? 'Vendeu mais a fiado do que recebeu neste período.'
                        : 'Recebeu mais do que vendeu a fiado neste período.'}
                    </div>
                  </div>
                  <div className="text-xs text-center" style={{ color: INK, opacity: 0.45 }}>
                    {r.count} movimento{r.count !== 1 ? 's' : ''} neste período
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {view === 'detail' && selectedCustomer && (
          <div className="pb-10">
            <div className="px-5 pt-6 pb-4" style={{ borderBottom: `2px solid ${INK}` }}>
              <button onClick={() => { setView('dashboard'); setSelectedId(null); setShowTxForm(null); }} className="flex items-center gap-1 text-sm mb-3" style={{ color: TEAL }}>
                <ArrowLeft size={16} /> Voltar
              </button>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-2xl">{selectedCustomer.nome}</h2>
                  {selectedCustomer.telefone && (
                    <div className="flex items-center gap-1 text-sm mt-1" style={{ color: INK, opacity: 0.6 }}>
                      <Phone size={13} /> {selectedCustomer.telefone}
                    </div>
                  )}
                </div>
                <button onClick={() => removeCustomer(selectedCustomer.id)} aria-label="Remover cliente">
                  <Trash2 size={18} style={{ color: BRICK, opacity: 0.6 }} />
                </button>
              </div>
            </div>

            <div className="mx-5 mt-5 rounded-lg p-4" style={{ background: CARD, border: `1px solid ${LINE}` }}>
              <div className="text-xs uppercase tracking-wide" style={{ color: INK, opacity: 0.55 }}>
                {selectedBalance > 0 ? 'Deve' : selectedBalance < 0 ? 'Saldo a favor do cliente' : 'Saldo'}
              </div>
              <div className="font-mono text-3xl font-semibold mt-1" style={{ color: selectedBalance > 0 ? BRICK : selectedBalance < 0 ? GOLD : TEAL }}>
                {selectedBalance === 0 ? 'Quite (0 MT)' : formatMT(Math.abs(selectedBalance))}
              </div>
              {selectedBalance > 0 && selectedCustomer.telefone && (
                <a href={linkWhatsApp(selectedCustomer, selectedBalance)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs mt-2" style={{ color: TEAL }}>
                  <MessageCircle size={13} /> Enviar lembrete por WhatsApp
                </a>
              )}
            </div>

            <div className="mx-5 mt-3 rounded-lg p-3 flex items-center justify-between" style={{ background: CARD, border: `1px solid ${LINE}` }}>
              {editingLimite ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    autoFocus
                    value={limiteValue}
                    onChange={(e) => setLimiteValue(e.target.value)}
                    placeholder="Sem limite"
                    inputMode="decimal"
                    className="flex-1 rounded-md px-2 py-1.5 text-sm outline-none font-mono"
                    style={{ border: `1px solid ${LINE}` }}
                  />
                  <button disabled={busy} onClick={guardarLimite} className="text-xs font-medium rounded-md px-2 py-1.5 text-white" style={{ background: TEAL }}>Guardar</button>
                  <button onClick={() => setEditingLimite(false)} className="text-xs px-2 py-1.5" style={{ color: INK, opacity: 0.6 }}>Cancelar</button>
                </div>
              ) : (
                <>
                  <div className="text-xs" style={{ color: INK, opacity: 0.6 }}>
                    Limite de crédito: <span className="font-mono">{selectedCustomer.limite_credito ? formatMT(Number(selectedCustomer.limite_credito)) : 'sem limite definido'}</span>
                  </div>
                  <button
                    onClick={() => { setLimiteValue(selectedCustomer.limite_credito ? String(selectedCustomer.limite_credito) : ''); setEditingLimite(true); }}
                    className="flex items-center gap-1 text-xs"
                    style={{ color: TEAL }}
                  >
                    <Pencil size={12} /> Editar
                  </button>
                </>
              )}
            </div>

            {selectedCustomer.limite_credito && selectedBalance > Number(selectedCustomer.limite_credito) && (
              <div className="mx-5 mt-2 flex items-start gap-2 text-xs rounded-md px-3 py-2" style={{ background: '#F7E9E7', color: BRICK }}>
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>Este cliente já ultrapassou o limite de crédito definido ({formatMT(Number(selectedCustomer.limite_credito))}).</span>
              </div>
            )}

            <div className="mx-5 mt-3 flex gap-2">
              <button onClick={() => setShowTxForm('fiado')} className="flex-1 rounded-lg py-2.5 text-sm font-medium text-white" style={{ background: BRICK }}>+ Registar fiado</button>
              <button onClick={() => setShowTxForm('pagamento')} className="flex-1 rounded-lg py-2.5 text-sm font-medium text-white" style={{ background: TEAL }}>+ Registar pagamento</button>
            </div>

            {showTxForm && (
              <div className="mx-5 mt-3 rounded-lg p-4" style={{ background: CARD, border: `1px solid ${LINE}` }}>
                <div className="text-sm font-medium mb-2">{showTxForm === 'fiado' ? 'Nova venda a fiado' : 'Novo pagamento recebido'}</div>
                <input autoFocus value={txAmount} onChange={(e) => setTxAmount(e.target.value)} placeholder="Valor em MT" inputMode="decimal" className="w-full rounded-md px-3 py-2 text-sm outline-none mb-2 font-mono" style={{ border: `1px solid ${LINE}` }} />
                <input value={txDesc} onChange={(e) => setTxDesc(e.target.value)} placeholder={showTxForm === 'fiado' ? 'O que levou (opcional)' : 'Observação (opcional)'} className="w-full rounded-md px-3 py-2 text-sm outline-none mb-3" style={{ border: `1px solid ${LINE}` }} />
                {showTxForm === 'fiado' && selectedCustomer.limite_credito && (() => {
                  const valorNum = parseFloat(txAmount.replace(',', '.'));
                  if (!valorNum || valorNum <= 0) return null;
                  const projetado = selectedBalance + valorNum;
                  if (projetado <= Number(selectedCustomer.limite_credito)) return null;
                  return (
                    <div className="flex items-start gap-2 text-xs rounded-md px-3 py-2 mb-3" style={{ background: '#F6EFDD', color: GOLD }}>
                      <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>Este fiado deixa o saldo em {formatMT(projetado)}, acima do limite de {formatMT(Number(selectedCustomer.limite_credito))} deste cliente.</span>
                    </div>
                  );
                })()}
                <div className="flex gap-2">
                  <button disabled={busy} onClick={() => addTransaction(showTxForm)} className="flex-1 rounded-md py-2 text-sm font-medium text-white" style={{ background: showTxForm === 'fiado' ? BRICK : TEAL, opacity: busy ? 0.6 : 1 }}>Guardar</button>
                  <button onClick={() => { setShowTxForm(null); setTxAmount(''); setTxDesc(''); }} className="rounded-md px-4 py-2 text-sm" style={{ border: `1px solid ${LINE}` }}>Cancelar</button>
                </div>
              </div>
            )}

            <div className="mx-5 mt-5">
              <div className="text-xs uppercase tracking-wide mb-2" style={{ color: INK, opacity: 0.55 }}>Histórico</div>
              {selectedTxs.length === 0 && <div className="text-sm py-6 text-center" style={{ color: INK, opacity: 0.5 }}>Sem movimentos registados ainda.</div>}
              <div className="space-y-0">
                {selectedTxs.map((t, i) => (
                  <div key={t.id} className="flex items-center justify-between py-2.5" style={{ borderBottom: i < selectedTxs.length - 1 ? `1px solid ${LINE}` : 'none' }}>
                    <div>
                      <div className="text-sm">
                        {t.tipo === 'fiado' ? 'Fiado' : 'Pagamento'}
                        {t.descricao && <span style={{ color: INK, opacity: 0.5 }}> — {t.descricao}</span>}
                      </div>
                      <div className="text-xs" style={{ color: INK, opacity: 0.45 }}>{formatDate(t.criado_em)}</div>
                    </div>
                    <div className="font-mono text-sm font-medium" style={{ color: t.tipo === 'fiado' ? BRICK : TEAL }}>
                      {t.tipo === 'fiado' ? '+' : '−'}{formatMT(t.valor)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {showAddCustomer && (
        <Modal onClose={() => setShowAddCustomer(false)} title="Novo cliente">
          <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome do cliente" className="w-full rounded-md px-3 py-2 text-sm outline-none mb-2" style={{ border: `1px solid ${LINE}` }} />
          <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Contacto (opcional, com código de país p/ WhatsApp)" className="w-full rounded-md px-3 py-2 text-sm outline-none mb-2" style={{ border: `1px solid ${LINE}` }} />
          <input value={newLimite} onChange={(e) => setNewLimite(e.target.value)} placeholder="Limite de crédito em MT (opcional)" inputMode="decimal" className="w-full rounded-md px-3 py-2 text-sm outline-none mb-4 font-mono" style={{ border: `1px solid ${LINE}` }} />
          <button disabled={busy} onClick={addCustomer} className="w-full rounded-md py-2.5 text-sm font-medium text-white" style={{ background: TEAL, opacity: busy ? 0.6 : 1 }}>Guardar cliente</button>
        </Modal>
      )}

      {showHelp && (
        <Modal onClose={() => setShowHelp(false)} title="Como funciona">
          <ol className="text-sm space-y-2">
            <li><strong>1. Adicione o cliente.</strong> Toque em "Novo" e guarde o nome (e contacto, se quiser).</li>
            <li><strong>2. Registe o fiado.</strong> Sempre que vender a crédito, abra o cliente e toque em "Registar fiado".</li>
            <li><strong>3. Registe o pagamento.</strong> Quando o cliente pagar, toque em "Registar pagamento".</li>
            <li><strong>O saldo atualiza-se sozinho</strong> e a lista mostra sempre quem deve mais primeiro.</li>
            <li><strong>Limite de crédito (opcional).</strong> Defina um limite por cliente para ser avisado quando ele se aproxima ou ultrapassa esse valor.</li>
            <li><strong>Relatório.</strong> Toque no ícone de gráfico no topo para ver o total vendido a fiado e recebido em pagamentos, por dia, semana ou mês.</li>
          </ol>
          <p className="text-xs mt-3" style={{ color: INK, opacity: 0.5 }}>Os seus dados ficam guardados de forma segura e privada — só a sua conta tem acesso a eles.</p>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(34,48,60,0.4)' }}>
      <div className="w-full max-w-sm rounded-xl p-5" style={{ background: CARD }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg">{title}</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
