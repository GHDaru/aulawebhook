# Aula Webhook (React + Vite)

Interface para publicar aulas em HTML, gerar portais acadêmicos com visual Esmeralda e compartilhar links públicos para os alunos responderem o conteúdo (incluindo envio via webhook já embutido no HTML).

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

1. No painel principal, faça upload de um arquivo `.html` de aula.
2. Clique em **Publicar disciplina**.
3. Copie o link público gerado no formato `/student/{slug}`.
4. Use a aba **Portais Ativos** para listar, copiar e apagar portais publicados.
5. Compartilhe o link com os alunos.

## Endpoints

- `GET /api/aulas` — lista os portais acadêmicos publicados.
- `POST /api/aulas` — recebe JSON `{ filename, html }`, salva no PostgreSQL e retorna o link público do aluno.
- `GET /api/aulas/:id` — carrega o HTML da aula publicada.
- `DELETE /api/aulas/:id` — remove um portal publicado.

## Deploy na Vercel

1. Configure a variável de ambiente `DATABASE_URL`.
2. Deploy do projeto normalmente.
3. Os rewrites de `/student/:id` e `/aula/:id` para `index.html` já estão em `vercel.json`.
