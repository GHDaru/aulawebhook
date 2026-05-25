# Aula Webhook (React + Vite)

Interface para publicar aulas em HTML e gerar endpoint para alunos responderem o conteúdo (incluindo envio via webhook já embutido no HTML).

## Requisitos

- Node.js 20+
- Conta Vercel com Blob Storage habilitado
- Variável de ambiente `BLOB_READ_WRITE_TOKEN`

## Desenvolvimento local

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`.

## Fluxo de uso

1. No painel principal, faça upload de um arquivo `.html` de aula.
2. Clique em **Publicar aula**.
3. Copie o endpoint gerado (formato `/aula/{id}`).
4. Compartilhe esse endpoint com os alunos.

## Endpoints

- `POST /api/aulas` — recebe JSON `{ filename, html }`, salva no Vercel Blob e retorna o endpoint do aluno.
- `GET /api/aulas/:id` — carrega o HTML da aula publicada.

## Deploy na Vercel

1. Configure a variável de ambiente `BLOB_READ_WRITE_TOKEN`.
2. Deploy do projeto normalmente.
3. O rewrite de `/aula/:id` para `index.html` já está em `vercel.json`.
