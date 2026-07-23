-- ============================================================
-- Migração: adiciona controlo de data de pagamento
-- Corre isto no SQL Editor do teu projeto Supabase (projeto já existente)
-- ============================================================

alter table public.lojistas
  add column if not exists proximo_pagamento date;

-- Nota: esta coluna só é alterável por ti (painel do Supabase) ou por
-- funções com security definer — o lojista continua sem conseguir
-- editar isto por si próprio, tal como o status.
