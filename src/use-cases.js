const MODULE_USE_CASES = {
  dashboard: [
    { id: 'uc-dashboard-1', title: 'Monitorar operação acadêmica', actor: 'Admin/Professor', goal: 'Acompanhar indicadores de disciplinas, alunos e avaliações.' },
    { id: 'uc-dashboard-2', title: 'Consultar situação por disciplina', actor: 'Admin/Professor', goal: 'Ver médias consolidadas de notas e progresso por disciplina.' },
  ],
  disciplinas: [
    { id: 'uc-disc-1', title: 'Cadastrar disciplina', actor: 'Professor/Admin', goal: 'Criar uma disciplina para centralizar aulas do conteúdo didático.' },
    { id: 'uc-disc-2', title: 'Publicar aula', actor: 'Professor/Admin', goal: 'Incluir aula HTML em disciplina e compartilhar link do aluno.' },
  ],
  alunos: [
    { id: 'uc-aluno-1', title: 'Cadastrar aluno', actor: 'Admin/Professor', goal: 'Registrar aluno de forma individual com matrícula acadêmica.' },
    { id: 'uc-aluno-2', title: 'Cadastrar alunos em lote', actor: 'Admin/Professor', goal: 'Importar alunos via CSV para acelerar início de período.' },
  ],
  matriculas: [
    { id: 'uc-mat-1', title: 'Matricular aluno', actor: 'Admin/Professor', goal: 'Vincular aluno a uma disciplina com status inicial.' },
  ],
  notas: [
    { id: 'uc-nota-1', title: 'Lançar nota', actor: 'Professor/Admin', goal: 'Registrar resultado de avaliação para um aluno na disciplina.' },
  ],
  progresso: [
    { id: 'uc-prog-1', title: 'Atualizar progresso', actor: 'Professor/Admin', goal: 'Informar aulas concluídas e percentual de avanço por aluno.' },
  ],
  certidoes: [
    { id: 'uc-cert-1', title: 'Emitir certidão', actor: 'Admin/Professor', goal: 'Gerar resultado de conclusão com critérios de média e progresso.' },
    { id: 'uc-cert-2', title: 'Baixar certidão', actor: 'Admin/Professor', goal: 'Exportar certidão em arquivo para compartilhamento.' },
  ],
  integracoes: [
    { id: 'uc-int-1', title: 'Processar webhook', actor: 'Sistema Externo/Admin', goal: 'Receber eventos acadêmicos e registrar processamento.' },
    { id: 'uc-int-2', title: 'Simular integração', actor: 'Admin', goal: 'Validar fluxo de webhook sem dependência externa.' },
  ],
}

export { MODULE_USE_CASES }
