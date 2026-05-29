# Aula Webhook (React + Vite)

Interface para administrar disciplinas, incluir aulas em HTML e compartilhar links públicos com navegação sequencial entre aulas.

## Requisitos

- Node.js 20+
- Banco PostgreSQL (Neon recomendado)
- Variável de ambiente `DATABASE_URL`

## Desenvolvimento local

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`.

## Fluxo de uso

1. No painel principal, cadastre uma disciplina.
2. Selecione a disciplina e faça upload de um arquivo `.html` para incluir uma aula.
3. Repita o processo para adicionar mais aulas em sequência.
4. Use a aba **Disciplinas Ativas** para listar conteúdos, copiar links públicos e apagar disciplinas.
5. Compartilhe os links no formato `/student/{disciplina}/{aula}`.

## Endpoints

- `GET /api/aulas` — lista disciplinas e aulas ordenadas.
- `POST /api/aulas` — cadastra disciplina com JSON `{ title }`.
- `POST /api/aulas/:id` — inclui aula na disciplina `:id` com JSON `{ filename, html, title? }`.
- `GET /api/aulas/:id?lesson=:lessonId` — carrega uma aula de disciplina com metadados de navegação.
- `DELETE /api/aulas/:id` — remove disciplina (e suas aulas) ou uma aula legada.
- `GET /api/aulas/:id` — compatibilidade para carregar aulas legadas publicadas no formato antigo.

## Deploy na Vercel

1. Configure a variável de ambiente `DATABASE_URL`.
2. Deploy do projeto normalmente.
3. Os rewrites de `/student/:path*` e `/aula/:path*` para `index.html` já estão em `vercel.json`.
