-- ============================================================
-- Controlo de Fiado — esquema Supabase (Postgres)
-- Corre este ficheiro inteiro no SQL Editor do teu projeto Supabase.
-- ============================================================

-- 1) Perfil de cada lojista (1 linha por conta/utilizador)
create table if not exists public.lojistas (
  id uuid primary key references auth.users(id) on delete cascade,
  nome_loja text not null default 'Minha Loja',
  telefone text,
  status text not null default 'pendente' check (status in ('pendente','ativo','bloqueado')),
  device_id text,
  created_at timestamptz not null default now()
);

-- 2) Clientes de cada lojista
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  lojista_id uuid not null references public.lojistas(id) on delete cascade,
  nome text not null,
  telefone text,
  created_at timestamptz not null default now()
);

-- 3) Movimentos (fiado / pagamento)
create table if not exists public.transacoes (
  id uuid primary key default gen_random_uuid(),
  lojista_id uuid not null references public.lojistas(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  tipo text not null check (tipo in ('fiado','pagamento')),
  valor numeric(12,2) not null check (valor > 0),
  descricao text,
  criado_em timestamptz not null default now()
);

create index if not exists idx_clientes_lojista on public.clientes(lojista_id);
create index if not exists idx_transacoes_lojista on public.transacoes(lojista_id);
create index if not exists idx_transacoes_cliente on public.transacoes(cliente_id);

-- ============================================================
-- ROW LEVEL SECURITY — cada lojista só vê e altera os seus dados
-- ============================================================
alter table public.lojistas enable row level security;
alter table public.clientes enable row level security;
alter table public.transacoes enable row level security;

-- lojistas: cada um só LÊ o próprio perfil. Ninguém pode fazer UPDATE
-- diretamente (nem o próprio lojista) — status e device_id só mudam
-- pelo painel do Supabase (tu, o programador) ou pelas funções abaixo.
create policy "lojista vê o próprio perfil"
  on public.lojistas for select
  using (auth.uid() = id);

-- clientes
create policy "lojista vê os próprios clientes"
  on public.clientes for select using (auth.uid() = lojista_id);
create policy "lojista insere os próprios clientes"
  on public.clientes for insert with check (auth.uid() = lojista_id);
create policy "lojista atualiza os próprios clientes"
  on public.clientes for update using (auth.uid() = lojista_id);
create policy "lojista apaga os próprios clientes"
  on public.clientes for delete using (auth.uid() = lojista_id);

-- transações
create policy "lojista vê as próprias transações"
  on public.transacoes for select using (auth.uid() = lojista_id);
create policy "lojista insere as próprias transações"
  on public.transacoes for insert with check (auth.uid() = lojista_id);
create policy "lojista apaga as próprias transações"
  on public.transacoes for delete using (auth.uid() = lojista_id);

-- ============================================================
-- Cria automaticamente o perfil do lojista quando alguém se regista
-- Estado inicial: 'pendente' — TU decides quando passa a 'ativo'
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.lojistas (id, nome_loja, status)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome_loja', 'Minha Loja'), 'pendente');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Função segura para o lojista editar o NOME DA LOJA e TELEFONE
-- (nunca o status nem o device_id — isso é só teu)
-- ============================================================
create or replace function public.atualizar_perfil(p_nome_loja text, p_telefone text)
returns void as $$
begin
  update public.lojistas
  set nome_loja = coalesce(p_nome_loja, nome_loja),
      telefone = coalesce(p_telefone, telefone)
  where id = auth.uid();
end;
$$ language plpgsql security definer;

grant execute on function public.atualizar_perfil to authenticated;

-- ============================================================
-- Função de controlo de dispositivo:
-- Regista o dispositivo no primeiro login. Em logins seguintes,
-- devolve o device_id guardado para a app comparar. Só tu podes
-- "libertar" uma conta para outro dispositivo (pondo device_id = null
-- na tabela lojistas através do painel do Supabase).
-- ============================================================
create or replace function public.registar_dispositivo(p_device_id text)
returns text as $$
declare
  atual text;
begin
  select device_id into atual from public.lojistas where id = auth.uid();
  if atual is null then
    update public.lojistas set device_id = p_device_id where id = auth.uid();
    return p_device_id;
  else
    return atual;
  end if;
end;
$$ language plpgsql security definer;

grant execute on function public.registar_dispositivo to authenticated;

-- ============================================================
-- Função para o lojista consultar o próprio status + device_id
-- (necessária porque a policy de SELECT em lojistas já cobre isto,
-- esta função existe apenas por conveniência/clareza no código)
-- ============================================================
-- (não é necessária função extra — o SELECT direto com RLS já basta)
