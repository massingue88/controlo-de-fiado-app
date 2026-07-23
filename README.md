# Controlo de Fiado — app independente

App real, multi-lojista, com login próprio por utilizador e controlo de acesso
feito por ti (o programador/dono do produto). Cada lojista cria a sua conta,
mas só ganha acesso depois de tu confirmares o pagamento/registo.

⚠️ **Importante:** este código não corre dentro do Claude — é um projeto
Vite + React real que precisas de instalar e correr no teu computador (ou
publicar num serviço como a Vercel/Netlify). Eu não consigo criar a tua conta
Supabase nem publicar o site por ti; os passos abaixo mostram exatamente
como o fazer.

## O que está incluído

- Login e registo por email/password (Supabase Auth)
- Cada lojista só vê os seus próprios clientes e movimentos (Row Level Security)
- Estado de conta controlado por ti: `pendente` / `ativo` / `bloqueado`
- Controlo de dispositivo: a conta fica associada ao primeiro telemóvel/computador que fizer login
- Registo de fiado e pagamentos, saldo automático, alerta de dívidas esquecidas
- Exportação do histórico em CSV
- Lembrete por WhatsApp com um toque (abre conversa já preenchida)

## Passo 1 — Criar o backend (Supabase, grátis para começar)

1. Cria conta em https://supabase.com e um novo projeto.
2. No projeto, vai a **SQL Editor** → cola todo o conteúdo de `sql/schema.sql` → **Run**.
3. Vai a **Project Settings → API** e copia:
   - `Project URL`
   - `anon public key`
4. (Opcional mas recomendado no início) Em **Authentication → Providers → Email**,
   desativa "Confirm email" enquanto testas, para não teres de confirmar emails manualmente.

## Passo 2 — Configurar o projeto localmente

Precisas de ter o [Node.js](https://nodejs.org) instalado (versão 18+).

```bash
cd controlo-de-fiado-app
cp .env.example .env
# edita o .env e cola o Project URL e a anon key do passo 1
npm install
npm run dev
```

Abre o endereço que aparecer no terminal (normalmente `http://localhost:5173`).

## Passo 3 — Aprovar (ou bloquear) lojistas

Quando alguém se regista, a conta fica automaticamente com `status = 'pendente'`.
Para dar acesso depois de confirmares o pagamento:

1. No Supabase, vai a **Table Editor → lojistas**.
2. Encontra a linha da pessoa (pelo email, em Authentication → Users, para saberes o ID certo).
3. Muda a coluna `status` de `pendente` para `ativo`.

Para bloquear alguém (ex: deixou de pagar): muda `status` para `bloqueado`.
Para libertar uma conta presa a um dispositivo antigo (ex: telemóvel trocado):
apaga o valor da coluna `device_id` (deixa em branco/null) — no próximo login,
o novo dispositivo é registado automaticamente.

Isto significa que, por agora, a aprovação é manual, feita por ti diretamente
na tabela. Para uma operação com muitos lojistas, o passo natural seguinte é
construir um pequeno painel de administração — não incluído aqui para manter
o projeto simples, mas é uma extensão direta do que já existe.

## Passo 4 — Publicar o site (para os lojistas acederem)

O caminho mais simples é a [Vercel](https://vercel.com) ou [Netlify](https://netlify.com):

1. Cria uma conta e liga o teu repositório Git (GitHub/GitLab) com este código.
2. Nas variáveis de ambiente do projeto na Vercel/Netlify, adiciona
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os mesmos valores do `.env`.
3. Publica. Vais receber um endereço tipo `https://o-teu-projeto.vercel.app`
   — é esse link que partilhas com os lojistas.

## Limitações honestas desta versão

- **Aprovação manual:** ainda não há um botão "aprovar" — fazes isso na tabela do Supabase. Funciona bem até uma dezena de lojistas; a partir daí vale a pena um painel de administração dedicado.
- **Bloqueio de dispositivo é leve, não é DRM real:** se um lojista limpar os dados do navegador, o dispositivo "esquece-se" e pode tentar registar-se como novo — a conta continua protegida (não consegue entrar sem password), mas o bloqueio por dispositivo por si só não é à prova de utilizadores tecnicamente sofisticados. O controlo verdadeiramente forte continua a ser o `status` da conta.
- **Sem app nas lojas (App Store / Play Store):** isto é um site responsivo, não uma app nativa. Funciona muito bem no telemóvel a partir do browser (e pode ser "adicionado ao ecrã principal"), mas não passa por revisão de loja nem tem ícone próprio automaticamente — isso seria um passo adicional (transformar em PWA ou app nativa).
- **Sem cobrança automática:** confirmar pagamento continua a ser um processo à parte (ex: M-Pesa manual) — a app só reflete o resultado dessa confirmação através do `status`.
