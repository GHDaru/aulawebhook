# DDD + Hexagonal no Aula Webhook

## Objetivo

Evoluir a aplicação com uma linguagem ubíqua explícita, bounded contexts definidos e uma migração incremental para arquitetura hexagonal, começando pelo contexto de **Gestão de Conteúdo Didático**.

---

## 1. Glossário inicial do domínio

| Termo | Significado no negócio |
| --- | --- |
| **Disciplina** | Unidade curricular administrada no portal, que agrega aulas publicadas e serve de referência para matrícula, notas e progresso. |
| **Aula** | Conteúdo HTML publicado dentro de uma disciplina e acessado por rota pública do aluno. |
| **Aluno** | Pessoa matriculável que possui identificação acadêmica, progresso e histórico de avaliações. |
| **Matrícula** | Vínculo entre um aluno e uma disciplina. |
| **Nota** | Resultado numérico de uma avaliação lançada para um aluno em uma disciplina. |
| **Avaliação** | Identificação da atividade usada para registrar uma nota. |
| **Progresso** | Medição do avanço do aluno em uma disciplina, com aulas concluídas, total e percentual. |
| **Certidão** | Evidência emitida a partir dos critérios de média e progresso definidos pelo negócio. |
| **Usuário** | Identidade que acessa o sistema com credenciais e papel atribuído. |
| **Papel** | Perfil de acesso do usuário (`admin`, `professor`, `aluno`). |
| **Webhook** | Entrada de integração externa que envia eventos para atualização do sistema. |
| **Evento** | Mensagem de integração com tipo e payload processados pelo sistema. |
| **Log de Integração** | Registro do processamento de um webhook com origem, status e detalhes. |

### Sinônimos proibidos

Para reduzir ambiguidade, evitar os termos abaixo no código, na documentação e nas conversas de refinamento:

- **Curso** quando o termo correto for **Disciplina**
- **Página** ou **arquivo** quando o termo correto for **Aula**
- **Usuário acadêmico** quando o termo correto for **Aluno**
- **Inscrição** quando o termo correto for **Matrícula**
- **Perfil** quando o termo correto for **Papel**
- **Callback** quando o termo correto for **Webhook**
- **Ocorrência** quando o termo correto for **Evento**

---

## 2. Linguagem ubíqua por bounded context

### Gestão de Conteúdo Didático

**Termos centrais:** Disciplina, Aula, Publicação, Ordem da Aula, Link do Aluno, Aula Legada

- Disciplina é o agregado raiz do conteúdo.
- Aula sempre pertence a uma disciplina no fluxo atual, exceto no modo legado.
- Publicar aula significa persistir HTML e disponibilizar link de navegação para o aluno.

### Gestão Acadêmica

**Termos centrais:** Aluno, Matrícula, Nota, Avaliação, Progresso, Certidão

- Matrícula formaliza o vínculo entre aluno e disciplina.
- Nota representa um lançamento de avaliação.
- Certidão depende de critérios de média e progresso.

### Identidade e Acesso

**Termos centrais:** Usuário, Credencial, Papel, Primeiro Acesso, Troca de Senha

- Usuário autentica com usuário ou matrícula.
- Papel determina o nível de acesso.
- Primeiro acesso exige troca de senha.

### Integrações

**Termos centrais:** Webhook, Evento, Origem, Payload, Processamento, Log de Integração

- Webhook é a porta de entrada para eventos externos.
- Evento possui tipo conhecido e payload estruturado.
- Todo processamento relevante gera log.

---

## 3. Bounded contexts identificados

### 3.1 Gestão de Conteúdo Didático

**Responsabilidade:** administrar disciplinas, publicar aulas HTML, gerar links públicos e carregar navegação sequencial.

**Limite explícito:** não cuida de autenticação, matrícula, nota ou certidão.

**Integrações:**
- recebe identidade do ator via headers HTTP
- expõe disciplina para outros contextos por `disciplina_id`
- fornece links públicos consumidos por alunos

### 3.2 Gestão Acadêmica

**Responsabilidade:** administrar alunos, matrículas, notas, progresso e certidões.

**Limite explícito:** não define autenticação nem publicação de aulas.

**Integrações:**
- depende de `disciplina_id` para relacionar dados acadêmicos
- consome eventos externos para matrícula, nota e progresso

### 3.3 Identidade e Acesso

**Responsabilidade:** autenticar usuários, validar credenciais, aplicar primeiro acesso e papéis.

**Limite explícito:** não administra conteúdo nem registros acadêmicos.

**Integrações:**
- publica `userId` e `userRole` para os demais contextos
- atende login e troca de senha

### 3.4 Integrações

**Responsabilidade:** receber webhooks, validar tipo de evento, despachar processamento e registrar logs.

**Limite explícito:** não decide regras acadêmicas além de encaminhar ao caso de uso apropriado.

**Integrações:**
- consome eventos externos
- publica efeitos em Gestão Acadêmica
- persiste Log de Integração

---

## 4. Agregados, entidades e objetos de valor

### Gestão de Conteúdo Didático

#### Agregado: Disciplina
- **Raiz:** Disciplina
- **Entidades:** Disciplina, Aula
- **Objetos de valor:** DisciplinaId, AulaId, Título da Disciplina, Título da Aula, Ordem da Aula, HTML da Aula, URL do Aluno
- **Limite de consistência:** cadastro da disciplina e publicação de aula em ordem válida para a disciplina

### Gestão Acadêmica

#### Agregado: Aluno
- **Raiz:** Aluno
- **Entidades:** Aluno
- **Objetos de valor:** AlunoId, MatrículaAcadêmica, E-mail, Status do Aluno

#### Agregado: Matrícula
- **Raiz:** Matrícula
- **Entidades:** Matrícula
- **Objetos de valor:** MatrículaId, Status da Matrícula, DisciplinaId, AlunoId

#### Agregado: Avaliação
- **Raiz:** Nota
- **Entidades:** Nota
- **Objetos de valor:** NotaId, Valor da Nota, Nome da Avaliação

#### Agregado: Progresso
- **Raiz:** Progresso
- **Entidades:** Progresso
- **Objetos de valor:** Quantidade Concluída, Quantidade Total, Percentual

#### Agregado: Certidão
- **Raiz:** Certidão
- **Entidades:** Certidão
- **Objetos de valor:** Média, Progresso Mínimo, Nota Mínima, Status da Certidão

### Identidade e Acesso

#### Agregado: Usuário
- **Raiz:** Usuário
- **Entidades:** Usuário
- **Objetos de valor:** UsuárioId, Matrícula, Hash de Senha, Papel, Indicador de Primeiro Acesso

### Integrações

#### Agregado: Log de Integração
- **Raiz:** Evento de Integração
- **Entidades:** EventoWebhook, LogIntegração
- **Objetos de valor:** Tipo de Evento, Origem, Payload, Status de Processamento, Detalhes

---

## 5. Tradução para arquitetura hexagonal

### Camada de domínio

Mantém regras puras, sem `req`, `res`, SQL ou detalhes de framework.

No contexto de Conteúdo Didático, o domínio agora explicita:

- validação de slugs
- validação de HTML
- regras de permissão do ator
- formação de título de aula
- limites de consistência da disciplina e da aula

### Camada de aplicação

Coordena casos de uso:

- listar disciplinas
- cadastrar disciplina
- publicar aula
- carregar aula
- carregar aula legada
- remover disciplina ou aula legada

### Portas

**Entrada**
- HTTP para `/api/aulas`
- HTTP para `/api/aulas/:id`

**Saída**
- repositório de conteúdo didático
- construção de URLs públicas

### Adaptadores

**Adaptadores de entrada**
- handlers Vercel em `/api/aulas.js`
- handlers Vercel em `/api/aulas/[id].js`

**Adaptadores de saída**
- repositório SQL baseado em Neon/PostgreSQL

---

## 6. Implementação incremental realizada

Foi iniciado o primeiro ciclo da migração no contexto de **Gestão de Conteúdo Didático**:

1. criação do domínio explícito em `server/content/domain`
2. criação de casos de uso em `server/content/application`
3. criação do adaptador de persistência em `server/content/infrastructure`
4. simplificação dos handlers `/api/aulas` e `/api/aulas/[id]`, que agora funcionam como adaptadores HTTP finos

Essa migração preserva os contratos HTTP existentes e prepara o mesmo modelo para os próximos contextos:

- Gestão Acadêmica
- Identidade e Acesso
- Integrações

---

## 7. Próximos incrementos recomendados

1. migrar Identidade e Acesso para domínio e portas próprias
2. migrar Gestão Acadêmica por agregado
3. migrar Integrações para despacho por caso de uso
4. adicionar testes automatizados por contexto e contrato HTTP
