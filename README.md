# Aula Webhook (React + Vite)

Interface para administrar disciplinas, incluir aulas em HTML e compartilhar links públicos com navegação sequencial entre aulas.

Agora o projeto também inclui um **Portal Acadêmico** com login, sidebar por módulos, cadastro de alunos, matrículas, notas, progresso, certidões e integrações por webhook.

## Requisitos

- Node.js 20+
- Banco PostgreSQL (Neon recomendado)
- Variável de ambiente `DATABASE_URL`

## Estrutura do banco de dados

O banco já fica **OK automaticamente** quando os endpoints da API são usados, porque `initDb()` cria/ajusta a estrutura necessária na inicialização.

### Tabela `disciplinas`

- `id` (`TEXT`, chave primária)
- `title` (`TEXT`, obrigatório)
- `created_at` (`TIMESTAMPTZ`, padrão `NOW()`)

### Tabela `aulas`

- `id` (`TEXT`, chave primária)
- `html` (`TEXT`, obrigatório)
- `created_at` (`TIMESTAMPTZ`, padrão `NOW()`)
- `disciplina_id` (`TEXT`, opcional)
- `lesson_order` (`INTEGER`, opcional)
- `title` (`TEXT`, opcional)

### Índices

- `aulas_disciplina_id_idx` em (`disciplina_id`, `lesson_order`)
- `aulas_disciplina_lesson_order_unique_idx` único em (`disciplina_id`, `lesson_order`) quando `disciplina_id` não é `NULL`

### Compatibilidade legada

- Se `aulas.id` estiver em tipo antigo, a aplicação converte para `TEXT` automaticamente.

## Desenvolvimento local

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`.

## Fluxo de uso

1. Acesse a aplicação e faça login no Portal Acadêmico.
2. No primeiro acesso, troque a senha padrão.
3. Cadastre disciplinas e publique aulas HTML em sequência.
4. Cadastre alunos (individual ou em massa), realize matrículas e lance notas.
5. Atualize progresso e emita certidões conforme critérios mínimos.
6. Use o módulo de Integrações para consumir `/api/webhook` ou simular evento interno.
7. Compartilhe os links no formato `/student/{disciplina}/{aula}`.

### Usuários padrão (primeiro acesso)

- `admin` ou matrícula `0001` (perfil `admin`)
- `professor` ou matrícula `0002` (perfil `professor`)
- `aluno-demo` ou matrícula `20260001` (perfil `aluno`)
- Senha inicial para todos: `Portal@2026`

## Endpoints

- `GET /api/aulas` — lista disciplinas e aulas ordenadas.
- `POST /api/aulas` — cadastra disciplina com JSON `{ title }`.
- `POST /api/aulas/:id` — inclui aula na disciplina `:id` com JSON `{ filename, html, title? }`.
- `GET /api/aulas/:id?lesson=:lessonId` — carrega uma aula de disciplina com metadados de navegação.
- `DELETE /api/aulas/:id` — remove disciplina (e suas aulas) ou uma aula legada.
- `GET /api/aulas/:id` — compatibilidade para carregar aulas legadas publicadas no formato antigo.
- `POST /api/auth/login` — autentica por usuário/matrícula e senha.
- `POST /api/auth/change-password` — troca senha no primeiro acesso.
- `GET /api/academico?resource=...` — consulta dados acadêmicos (`dashboard`, `alunos`, `matriculas`, `notas`, `progresso`, `certidoes`, `integracoes`).
- `POST /api/academico` — cria alunos, matrículas, notas, progresso e certidões.
- `POST /api/webhook` — recebe eventos externos (`nota`, `progresso`, `matricula`) e grava no banco.
- `POST /api/webhook/simulate` — simula um webhook de nota para ambiente sem integração externa.

## Deploy na Vercel

1. Configure a variável de ambiente `DATABASE_URL`.
2. Deploy do projeto normalmente.
3. Os rewrites de `/student/:path*` e `/aula/:path*` para `index.html` já estão em `vercel.json`.
