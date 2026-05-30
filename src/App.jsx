import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import { MODULE_USE_CASES } from './use-cases'

const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

const MENU_ITEMS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'disciplinas', label: 'Cursos' },
  { key: 'alunos', label: 'Alunos' },
  { key: 'matriculas', label: 'Matrículas' },
  { key: 'notas', label: 'Notas' },
  { key: 'progresso', label: 'Progresso' },
  { key: 'certidoes', label: 'Certidões' },
  { key: 'integracoes', label: 'Integrações' },
]

function formatDate(value) {
  try {
    return DATE_FORMATTER.format(new Date(value))
  } catch {
    return 'Data indisponível'
  }
}

async function parseResponse(response) {
  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload.error || 'Falha na operação.')
  }
  return payload
}

function LoginView({ onLogin }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      })

      const payload = await parseResponse(response)
      onLogin(payload.user)
    } catch (loginError) {
      setError(loginError.message || 'Não foi possível entrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-shell">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <span className="eyebrow">Portal Acadêmico</span>
        <h1>Entrar</h1>
        <p className="subtitle">Acesse com usuário ou matrícula e senha.</p>
        <label htmlFor="identifier">Usuário ou matrícula</label>
        <input
          id="identifier"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="admin ou 20260001"
          required
        />

        <label htmlFor="password">Senha</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••"
          required
        />

        {error && <p className="error">{error}</p>}

        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        <p className="helper-text">
          Primeiro acesso padrão: admin/0001, professor/0002, aluno-demo/20260001 com senha <strong>Portal@2026</strong>.
        </p>
      </form>
    </main>
  )
}

function ChangePasswordView({ user, onChanged }) {
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, newPassword }),
      })
      await parseResponse(response)
      onChanged()
    } catch (changeError) {
      setError(changeError.message || 'Não foi possível trocar a senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-shell">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <span className="eyebrow">Primeiro acesso</span>
        <h1>Trocar senha</h1>
        <p className="subtitle">Olá, {user.nome}. Defina uma nova senha para continuar.</p>

        <label htmlFor="new-password">Nova senha</label>
        <input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          minLength={6}
          required
        />

        {error && <p className="error">{error}</p>}

        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Atualizando...' : 'Salvar nova senha'}
        </button>
      </form>
    </main>
  )
}

function StudentView({ disciplineId, lessonId }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [html, setHtml] = useState('')
  const [metadata, setMetadata] = useState(null)

  useEffect(() => {
    let active = true

    const loadLesson = async () => {
      setLoading(true)
      setError('')

      try {
        const hasDisciplineId = typeof disciplineId === 'string' && disciplineId.trim().length > 0
        const endpoint = hasDisciplineId
          ? `/api/aulas/${encodeURIComponent(disciplineId)}?lesson=${encodeURIComponent(lessonId)}`
          : `/api/aulas/${encodeURIComponent(lessonId)}`

        const response = await fetch(endpoint)
        const payload = await parseResponse(response)

        if (active) {
          setHtml(payload.html)
          setMetadata(payload.navigation ? payload : null)
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || 'Erro ao carregar aula.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadLesson()

    return () => {
      active = false
    }
  }, [disciplineId, lessonId])

  if (loading) {
    return (
      <main className="container">
        <p>Carregando aula...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="container">
        <h1>Aula indisponível</h1>
        <p className="error">{error}</p>
      </main>
    )
  }

  return (
    <main className="lesson-wrapper">
      {metadata && (
        <header className="lesson-nav">
          <div>
            <strong>{metadata.course?.title || metadata.discipline.title}</strong>
            <p className="portal-meta">
              {metadata.lesson.title} ({metadata.navigation.index}/{metadata.navigation.total})
            </p>
          </div>

          <div className="actions">
            {metadata.navigation.previousUrl ? (
              <a className="btn btn-secondary" href={metadata.navigation.previousUrl}>
                Aula anterior
              </a>
            ) : (
              <button className="btn btn-secondary btn-disabled" type="button" disabled>
                Aula anterior
              </button>
            )}
            {metadata.navigation.nextUrl ? (
              <a className="btn btn-secondary" href={metadata.navigation.nextUrl}>
                Próxima aula
              </a>
            ) : (
              <button className="btn btn-secondary btn-disabled" type="button" disabled>
                Próxima aula
              </button>
            )}
          </div>
        </header>
      )}

      <section className="full-lesson">
        <iframe
          title="Aula interativa"
          srcDoc={html}
          sandbox="allow-scripts allow-forms allow-downloads allow-modals allow-popups"
        />
      </section>
    </main>
  )
}


function UseCasePanel({ moduleKey }) {
  const items = MODULE_USE_CASES[moduleKey] || []
  if (!items.length) return null

  return (
    <section className="card use-case-panel">
      <h2>Casos de uso do módulo</h2>
      <div className="use-case-grid">
        {items.map((item) => (
          <article key={item.id} className="use-case-card">
            <strong>{item.title}</strong>
            <p className="helper-text">Ator: {item.actor}</p>
            <p>{item.goal}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function PortalView({ user, onLogout }) {
  const [activeModule, setActiveModule] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [dashboard, setDashboard] = useState({})
  const [disciplines, setDisciplines] = useState([])
  const [alunos, setAlunos] = useState([])
  const [matriculas, setMatriculas] = useState([])
  const [notas, setNotas] = useState([])
  const [progresso, setProgresso] = useState([])
  const [certidoes, setCertidoes] = useState([])
  const [integracoes, setIntegracoes] = useState([])

  const [quickStudentSearch, setQuickStudentSearch] = useState('')

  const [disciplineTitle, setDisciplineTitle] = useState('')
  const [selectedDiscipline, setSelectedDiscipline] = useState('')
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonFile, setLessonFile] = useState(null)
  const [lessonType, setLessonType] = useState('html')
  const [lessonHtmlContent, setLessonHtmlContent] = useState('')
  const [lessonVideoUrl, setLessonVideoUrl] = useState('')
  const [editingLessonId, setEditingLessonId] = useState('')
  const [editingCourseId, setEditingCourseId] = useState('')
  const [editingLessonTitle, setEditingLessonTitle] = useState('')
  const [editingLessonType, setEditingLessonType] = useState('html')
  const [editingLessonHtml, setEditingLessonHtml] = useState('')
  const [editingLessonVideoUrl, setEditingLessonVideoUrl] = useState('')
  const [loadingLessonEditor, setLoadingLessonEditor] = useState(false)

  const [alunoNome, setAlunoNome] = useState('')
  const [alunoMatricula, setAlunoMatricula] = useState('')
  const [alunoEmail, setAlunoEmail] = useState('')
  const [alunoSenhaPadrao, setAlunoSenhaPadrao] = useState('Portal@2026')
  const [bulkCsv, setBulkCsv] = useState('')

  const [matriculaAlunoId, setMatriculaAlunoId] = useState('')
  const [matriculaDisciplinaId, setMatriculaDisciplinaId] = useState('')

  const [notaAlunoId, setNotaAlunoId] = useState('')
  const [notaDisciplinaId, setNotaDisciplinaId] = useState('')
  const [avaliacao, setAvaliacao] = useState('')
  const [notaValor, setNotaValor] = useState('')

  const [progAlunoId, setProgAlunoId] = useState('')
  const [progDisciplinaId, setProgDisciplinaId] = useState('')
  const [progConcluido, setProgConcluido] = useState('')
  const [progTotal, setProgTotal] = useState('')

  const [certAlunoId, setCertAlunoId] = useState('')
  const [certDisciplinaId, setCertDisciplinaId] = useState('')
  const [notaMinima, setNotaMinima] = useState('6')
  const [progressoMinimo, setProgressoMinimo] = useState('75')

  const visibleMenu = useMemo(() => {
    if (user.role === 'aluno') {
      return MENU_ITEMS.filter((item) => ['dashboard', 'matriculas', 'progresso', 'certidoes'].includes(item.key))
    }

    if (user.role === 'professor') {
      return MENU_ITEMS.filter((item) => item.key !== 'integracoes')
    }

    return MENU_ITEMS
  }, [user.role])

  const consolidatedByDiscipline = useMemo(() => {
    const map = new Map()

    notas.forEach((item) => {
      const key = item.disciplina_title
      const current = map.get(key) || { disciplina: key, notas: [], progressos: [] }
      const parsedNota = Number(item.nota)
      if (Number.isFinite(parsedNota)) {
        current.notas.push(parsedNota)
      }
      map.set(key, current)
    })

    progresso.forEach((item) => {
      const key = item.disciplina_title
      const current = map.get(key) || { disciplina: key, notas: [], progressos: [] }
      const parsedPercentual = Number(item.percentual)
      if (Number.isFinite(parsedPercentual)) {
        current.progressos.push(parsedPercentual)
      }
      map.set(key, current)
    })

    return Array.from(map.values()).map((item) => ({
      disciplina: item.disciplina,
      mediaNotas: item.notas.length ? (item.notas.reduce((acc, n) => acc + n, 0) / item.notas.length).toFixed(2) : '0.00',
      mediaProgresso: item.progressos.length
        ? (item.progressos.reduce((acc, n) => acc + n, 0) / item.progressos.length).toFixed(2)
        : '0.00',
    }))
  }, [notas, progresso])

  const filteredStudents = useMemo(() => {
    const query = quickStudentSearch.trim().toLowerCase()
    if (!query) return alunos
    return alunos.filter(
      (aluno) =>
        String(aluno.nome || '').toLowerCase().includes(query) ||
        String(aluno.matricula || '').toLowerCase().includes(query),
    )
  }, [alunos, quickStudentSearch])

  const visibleMatriculas = useMemo(() => {
    if (user.role !== 'aluno') return matriculas
    return matriculas.filter((item) => item.aluno_matricula === user.matricula)
  }, [matriculas, user.matricula, user.role])

  const visibleProgresso = useMemo(() => {
    if (user.role !== 'aluno') return progresso
    return progresso.filter((item) => item.aluno_matricula === user.matricula)
  }, [progresso, user.matricula, user.role])

  const visibleCertidoes = useMemo(() => {
    if (user.role !== 'aluno') return certidoes
    return certidoes.filter((item) => item.aluno_matricula === user.matricula)
  }, [certidoes, user.matricula, user.role])

  const loadResource = useCallback(async (resource, headers) => {
    const response = await fetch(`/api/academico?resource=${encodeURIComponent(resource)}`, { headers })
    const payload = await parseResponse(response)
    return payload.items
  }, [])

  const authHeaders = useMemo(() => {
    const userId = typeof user.id === 'string' ? user.id : ''
    const userRole = typeof user.role === 'string' ? user.role : ''
    const userMatricula = typeof user.matricula === 'string' ? user.matricula : ''
    const headers = { 'Content-Type': 'application/json' }
    if (userId) headers['x-user-id'] = userId
    if (userRole) headers['x-user-role'] = userRole
    if (userMatricula) headers['x-user-matricula'] = userMatricula
    return headers
  }, [user.id, user.matricula, user.role])

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [dashboardItems, disciplinasPayload, alunosItems, matriculasItems, notasItems, progressoItems, certidoesItems, integracoesItems] = await Promise.all([
        loadResource('dashboard', authHeaders),
        fetch('/api/aulas', { headers: authHeaders }).then(parseResponse),
        loadResource('alunos', authHeaders),
        loadResource('matriculas', authHeaders),
        loadResource('notas', authHeaders),
        loadResource('progresso', authHeaders),
        loadResource('certidoes', authHeaders),
        loadResource('integracoes', authHeaders),
      ])

      setDashboard(dashboardItems)
      setDisciplines(disciplinasPayload.courses || disciplinasPayload.lessons || [])
      setAlunos(alunosItems || [])
      setMatriculas(matriculasItems || [])
      setNotas(notasItems || [])
      setProgresso(progressoItems || [])
      setCertidoes(certidoesItems || [])
      setIntegracoes(integracoesItems || [])
    } catch (loadError) {
      setError(loadError.message || 'Falha ao carregar dados do portal.')
    } finally {
      setLoading(false)
    }
  }, [authHeaders, loadResource])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadAll()
    }, 0)

    return () => clearTimeout(timer)
  }, [loadAll])

  const runAction = useCallback(async (request, successModule) => {
    setError('')
    try {
      await request()
      await loadAll()
      if (successModule) {
        setActiveModule(successModule)
      }
    } catch (actionError) {
      setError(actionError.message || 'Falha ao executar ação.')
    }
  }, [loadAll])

  const handleCreateDiscipline = (event) => {
    event.preventDefault()
    runAction(async () => {
      const response = await fetch('/api/aulas', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ title: disciplineTitle }),
      })
      await parseResponse(response)
      setDisciplineTitle('')
    }, 'disciplinas')
  }

  const resetLessonForm = useCallback(() => {
    setLessonTitle('')
    setLessonFile(null)
    setLessonHtmlContent('')
    setLessonVideoUrl('')
    setLessonType('html')
  }, [])

  const resetLessonEditor = useCallback(() => {
    setEditingCourseId('')
    setEditingLessonId('')
    setEditingLessonTitle('')
    setEditingLessonType('html')
    setEditingLessonHtml('')
    setEditingLessonVideoUrl('')
  }, [])

  const handleUploadLesson = (event) => {
    event.preventDefault()

    runAction(async () => {
      if (!selectedDiscipline) {
        throw new Error('Selecione um curso.')
      }
      if (lessonType === 'html' && !lessonFile && !lessonHtmlContent.trim()) {
        throw new Error('Informe o HTML da aula ou envie um arquivo.')
      }
      const html = lessonType === 'html'
        ? (lessonFile ? await lessonFile.text() : lessonHtmlContent)
        : ''
      const response = await fetch(`/api/aulas/${selectedDiscipline}`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          filename: lessonFile?.name,
          html,
          title: lessonTitle || undefined,
          lessonType,
          videoUrl: lessonType === 'video' ? lessonVideoUrl : undefined,
        }),
      })
      await parseResponse(response)
      resetLessonForm()
    }, 'disciplinas')
  }

  const handleEditLesson = async (courseId, lessonId) => {
    setLoadingLessonEditor(true)
    setError('')

    try {
      const response = await fetch(`/api/aulas/${courseId}?lesson=${encodeURIComponent(lessonId)}`, { headers: authHeaders })
      const payload = await parseResponse(response)
      setEditingCourseId(courseId)
      setEditingLessonId(lessonId)
      setEditingLessonTitle(payload.lesson.title || '')
      setEditingLessonType(payload.lesson.lessonType || 'html')
      setEditingLessonHtml(payload.lesson.lessonType === 'html' ? payload.html : '')
      setEditingLessonVideoUrl(payload.lesson.videoUrl || '')
      setSelectedDiscipline(courseId)
    } catch (actionError) {
      setError(actionError.message || 'Falha ao carregar a aula.')
    } finally {
      setLoadingLessonEditor(false)
    }
  }

  const handleUpdateLesson = (event) => {
    event.preventDefault()

    runAction(async () => {
      if (!editingCourseId || !editingLessonId) {
        throw new Error('Selecione a aula que será atualizada.')
      }
      if (editingLessonType === 'html' && !editingLessonHtml.trim()) {
        throw new Error('Informe o HTML atualizado da aula.')
      }

      const response = await fetch(`/api/aulas/${editingCourseId}?lesson=${encodeURIComponent(editingLessonId)}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          title: editingLessonTitle,
          html: editingLessonType === 'html' ? editingLessonHtml : '',
          lessonType: editingLessonType,
          videoUrl: editingLessonType === 'video' ? editingLessonVideoUrl : undefined,
        }),
      })
      await parseResponse(response)
      resetLessonEditor()
    }, 'disciplinas')
  }

  const handleDeleteLesson = (courseId, lessonId) => {
    if (!window.confirm('Deseja excluir esta aula?')) {
      return
    }

    runAction(async () => {
      const response = await fetch(`/api/aulas/${courseId}?lesson=${encodeURIComponent(lessonId)}`, {
        method: 'DELETE',
        headers: authHeaders,
      })
      await parseResponse(response)
      if (editingLessonId === lessonId) {
        resetLessonEditor()
      }
    }, 'disciplinas')
  }

  const handleMoveLesson = (courseId, lessonId, direction) => {
    runAction(async () => {
      const response = await fetch(`/api/aulas/${courseId}?lesson=${encodeURIComponent(lessonId)}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ direction }),
      })
      await parseResponse(response)
    }, 'disciplinas')
  }

  const handleDeleteDiscipline = (courseId) => {
    if (!window.confirm('Deseja excluir este curso e todas as aulas?')) {
      return
    }

    runAction(async () => {
      const response = await fetch(`/api/aulas/${courseId}`, {
        method: 'DELETE',
        headers: authHeaders,
      })
      await parseResponse(response)
      if (selectedDiscipline === courseId) {
        setSelectedDiscipline('')
      }
      if (editingCourseId === courseId) {
        resetLessonEditor()
      }
    }, 'disciplinas')
  }

  const handleCreateAluno = (event) => {
    event.preventDefault()
    runAction(async () => {
      const response = await fetch('/api/academico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource: 'alunos',
          nome: alunoNome,
          matricula: alunoMatricula,
          email: alunoEmail || null,
          defaultPassword: alunoSenhaPadrao,
        }),
      })
      await parseResponse(response)
      setAlunoNome('')
      setAlunoMatricula('')
      setAlunoEmail('')
    }, 'alunos')
  }

  const handleBulkCadastro = (event) => {
    event.preventDefault()
    runAction(async () => {
      const response = await fetch('/api/academico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource: 'alunos',
          mode: 'bulk',
          csvText: bulkCsv,
          defaultPassword: alunoSenhaPadrao,
        }),
      })
      await parseResponse(response)
      setBulkCsv('')
    }, 'alunos')
  }

  const handleCreateMatricula = (event) => {
    event.preventDefault()
    runAction(async () => {
      const response = await fetch('/api/academico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource: 'matriculas',
          alunoId: matriculaAlunoId,
          disciplinaId: matriculaDisciplinaId,
        }),
      })
      await parseResponse(response)
    }, 'matriculas')
  }

  const handleLaunchGrade = (event) => {
    event.preventDefault()
    runAction(async () => {
      const response = await fetch('/api/academico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource: 'notas',
          alunoId: notaAlunoId,
          disciplinaId: notaDisciplinaId,
          avaliacao,
          nota: Number(notaValor),
        }),
      })
      await parseResponse(response)
      setAvaliacao('')
      setNotaValor('')
    }, 'notas')
  }

  const handleUpdateProgress = (event) => {
    event.preventDefault()
    runAction(async () => {
      const response = await fetch('/api/academico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource: 'progresso',
          alunoId: progAlunoId,
          disciplinaId: progDisciplinaId,
          concluido: Number(progConcluido),
          total: Number(progTotal),
        }),
      })
      await parseResponse(response)
    }, 'progresso')
  }

  const handleEmitCertificate = (event) => {
    event.preventDefault()
    runAction(async () => {
      const response = await fetch('/api/academico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource: 'certidoes',
          alunoId: certAlunoId,
          disciplinaId: certDisciplinaId,
          notaMinima: Number(notaMinima),
          progressoMinimo: Number(progressoMinimo),
        }),
      })
      await parseResponse(response)
    }, 'certidoes')
  }

  const handleSimulateWebhook = () => {
    runAction(async () => {
      const response = await fetch('/api/webhook/simulate', { method: 'POST' })
      await parseResponse(response)
    }, 'integracoes')
  }

  const handleDownloadCert = (item) => {
    const content = [
      'CERTIDÃO DE CONCLUSÃO',
      `Aluno: ${item.aluno_nome}`,
      `Matrícula: ${item.aluno_matricula}`,
      `Curso: ${item.disciplina_title}`,
      `Média: ${item.media}`,
      `Progresso: ${item.progresso}%`,
      `Status: ${item.status}`,
      `Emitida em: ${formatDate(item.issued_at)}`,
    ].join('\n')

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `certidao-${item.id}.txt`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const sectionTitle = visibleMenu.find((item) => item.key === activeModule)?.label || 'Dashboard'

  return (
    <div className="portal-layout">
      <aside className="sidebar">
        <div>
          <p className="sidebar-brand">Portal Acadêmico</p>
          <p className="helper-text">{user.nome} · {user.role}</p>
        </div>

        <nav className="sidebar-nav" aria-label="Menu principal">
          {visibleMenu.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`sidebar-item ${activeModule === item.key ? 'sidebar-item-active' : ''}`}
              onClick={() => setActiveModule(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button className="btn btn-secondary" type="button" onClick={onLogout}>
          Sair
        </button>
      </aside>

      <main className="portal-main">
        <header className="topbar card">
          <div>
            <h1>{sectionTitle}</h1>
            <p className="subtitle">Gestão acadêmica com fluxo consolidado por curso.</p>
          </div>

          {user.role !== 'aluno' && (
            <div className="quick-actions">
              <input
                type="text"
                placeholder="Buscar aluno por nome/matrícula"
                value={quickStudentSearch}
                onChange={(event) => setQuickStudentSearch(event.target.value)}
              />
              <button className="btn btn-secondary" type="button" onClick={() => setActiveModule('disciplinas')}>
                Criar curso
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => setActiveModule('notas')}>
                Lançar nota
              </button>
            </div>
          )}
        </header>

        {error && <p className="error">{error}</p>}

        {loading ? (
          <p>Carregando dados do portal...</p>
        ) : (
          <>
            <UseCasePanel moduleKey={activeModule} />
            {activeModule === 'dashboard' && (
              <section className="card">
                {user.role === 'aluno' ? (
                  <>
                    <div className="kpi-grid">
                      <article className="kpi-card"><span>Matrículas ativas</span><strong>{visibleMatriculas.length}</strong></article>
                      <article className="kpi-card"><span>Progresso lançado</span><strong>{visibleProgresso.length}</strong></article>
                      <article className="kpi-card"><span>Certidões</span><strong>{visibleCertidoes.length}</strong></article>
                    </div>

                    <h2>Meus cursos</h2>
                    {visibleMatriculas.length === 0 ? (
                      <p className="helper-text">Você ainda não possui matrículas visíveis.</p>
                    ) : (
                      <div className="matriculas-grid">
                        {visibleMatriculas.map((item) => (
                          <article key={item.id} className="matricula-card">
                            <span className="eyebrow">Curso</span>
                            <h3>{item.disciplina_title}</h3>
                            <p className="portal-meta">Status da matrícula: {item.status}</p>
                          </article>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="kpi-grid">
                      <article className="kpi-card"><span>Cursos</span><strong>{dashboard.disciplinas || 0}</strong></article>
                      <article className="kpi-card"><span>Aulas</span><strong>{dashboard.aulas || 0}</strong></article>
                      <article className="kpi-card"><span>Alunos</span><strong>{dashboard.alunos || 0}</strong></article>
                      <article className="kpi-card"><span>Matrículas</span><strong>{dashboard.matriculas || 0}</strong></article>
                      <article className="kpi-card"><span>Notas</span><strong>{dashboard.notas || 0}</strong></article>
                      <article className="kpi-card"><span>Certidões</span><strong>{dashboard.certidoes || 0}</strong></article>
                    </div>

                    <h2>Visão consolidada do curso</h2>
                    {consolidatedByDiscipline.length === 0 ? (
                      <p className="helper-text">Sem dados consolidados no momento.</p>
                    ) : (
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Curso</th>
                            <th>Média de notas</th>
                            <th>Média de progresso</th>
                          </tr>
                        </thead>
                        <tbody>
                          {consolidatedByDiscipline.map((item) => (
                            <tr key={item.disciplina}>
                              <td>{item.disciplina}</td>
                              <td>{item.mediaNotas}</td>
                              <td>{item.mediaProgresso}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    <h2>Busca rápida de aluno</h2>
                    <ul className="list-simple">
                      {filteredStudents.slice(0, 10).map((aluno) => (
                        <li key={aluno.id}>{aluno.nome} · {aluno.matricula}</li>
                      ))}
                      {filteredStudents.length === 0 && <li>Nenhum aluno encontrado.</li>}
                    </ul>
                  </>
                )}
              </section>
            )}

            {activeModule === 'disciplinas' && (
              <section className="card">
                <h2>Cadastrar curso</h2>
                <form className="form-grid" onSubmit={handleCreateDiscipline}>
                  <input
                    type="text"
                    placeholder="Nome do curso"
                    value={disciplineTitle}
                    onChange={(event) => setDisciplineTitle(event.target.value)}
                    required
                  />
                  <button className="btn" type="submit">Cadastrar</button>
                </form>

                <h2>Incluir aula no curso</h2>
                <form className="form-grid" onSubmit={handleUploadLesson}>
                  <select
                    value={selectedDiscipline}
                    onChange={(event) => setSelectedDiscipline(event.target.value)}
                    required
                  >
                    <option value="">Selecione curso</option>
                    {disciplines.map((discipline) => (
                      <option key={discipline.id} value={discipline.id}>{discipline.title}</option>
                    ))}
                  </select>
                  <select value={lessonType} onChange={(event) => setLessonType(event.target.value)}>
                    <option value="html">Recurso HTML</option>
                    <option value="video">Link de vídeo</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Título da aula"
                    value={lessonTitle}
                    onChange={(event) => setLessonTitle(event.target.value)}
                    required
                  />
                  {lessonType === 'html' ? (
                    <>
                      <input
                        type="file"
                        accept=".html,text/html"
                        onChange={(event) => setLessonFile(event.target.files?.[0] ?? null)}
                      />
                      <textarea
                        rows={6}
                        placeholder="Cole o HTML aqui caso não queira enviar arquivo"
                        value={lessonHtmlContent}
                        onChange={(event) => setLessonHtmlContent(event.target.value)}
                      />
                    </>
                  ) : (
                    <input
                      type="url"
                      placeholder="https://youtube.com/watch?v=..."
                      aria-label="URL do vídeo da aula"
                      value={lessonVideoUrl}
                      onChange={(event) => setLessonVideoUrl(event.target.value)}
                      required
                    />
                  )}
                  <button className="btn" type="submit">Publicar aula</button>
                </form>

                <h2>Atualizar conteúdo educacional</h2>
                {editingLessonId ? (
                  <form className="form-grid" onSubmit={handleUpdateLesson}>
                    <input
                      type="text"
                      placeholder="Título da aula"
                      value={editingLessonTitle}
                      onChange={(event) => setEditingLessonTitle(event.target.value)}
                      required
                    />
                    <select value={editingLessonType} onChange={(event) => setEditingLessonType(event.target.value)}>
                      <option value="html">Recurso HTML</option>
                      <option value="video">Link de vídeo</option>
                    </select>
                    {editingLessonType === 'html' ? (
                      <textarea
                        rows={8}
                        placeholder="Atualize o HTML da aula"
                        value={editingLessonHtml}
                        onChange={(event) => setEditingLessonHtml(event.target.value)}
                        required
                      />
                    ) : (
                      <input
                        type="url"
                        placeholder="https://youtube.com/watch?v=..."
                        aria-label="URL do vídeo da aula"
                        value={editingLessonVideoUrl}
                        onChange={(event) => setEditingLessonVideoUrl(event.target.value)}
                        required
                      />
                    )}
                    <div className="inline-actions">
                      <button className="btn" type="submit">Salvar alterações</button>
                      <button className="btn btn-secondary" type="button" onClick={resetLessonEditor}>
                        Cancelar edição
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="helper-text">
                    Selecione uma aula abaixo para editar HTML, trocar vídeo, remover ou reorganizar.
                  </p>
                )}
                {loadingLessonEditor && <p className="helper-text">Carregando aula para edição...</p>}

                <h2>Cursos ativos</h2>
                {disciplines.length === 0 ? (
                  <p className="helper-text">Nenhum curso disponível para o seu perfil.</p>
                ) : (
                  <div className="course-grid">
                    {disciplines.map((discipline) => (
                      <article key={discipline.id} className="course-card">
                        <div className="course-card-header">
                          <div>
                            <span className="eyebrow">Curso</span>
                            <h3>{discipline.title}</h3>
                            <p className="portal-meta">{discipline.lessons.length} aulas publicadas</p>
                          </div>
                          <div className="inline-actions">
                            <button
                              className="btn btn-secondary"
                              type="button"
                              onClick={() => setSelectedDiscipline(discipline.id)}
                            >
                              Nova aula
                            </button>
                            <button
                              className="btn btn-secondary"
                              type="button"
                              onClick={() => handleDeleteDiscipline(discipline.id)}
                            >
                              Excluir curso
                            </button>
                          </div>
                        </div>
                        <div className="course-card-body">
                          <button
                            className="btn btn-secondary"
                            type="button"
                            onClick={() => setSelectedDiscipline(discipline.id)}
                          >
                            Selecionar para publicar aula
                          </button>
                          {discipline.lessons.length > 0 ? (
                            <div className="lessons-grid">
                              {discipline.lessons.map((lesson, index) => (
                                <article key={lesson.id} className="lesson-card">
                                  <div className="lesson-card-header">
                                    <span className={`lesson-badge ${lesson.lessonType === 'video' ? 'lesson-badge-video' : ''}`}>
                                      {lesson.lessonType === 'video' ? 'Vídeo' : 'HTML'}
                                    </span>
                                    <strong>{lesson.order}. {lesson.title}</strong>
                                  </div>
                                  <a href={lesson.studentUrl} target="_blank" rel="noreferrer">Abrir experiência do aluno</a>
                                  <div className="lesson-card-actions">
                                    <button className="btn btn-secondary" type="button" onClick={() => handleEditLesson(discipline.id, lesson.id)}>
                                      Editar
                                    </button>
                                    <button className="btn btn-secondary" type="button" onClick={() => handleDeleteLesson(discipline.id, lesson.id)}>
                                      Excluir
                                    </button>
                                    <button
                                      className="btn btn-secondary"
                                      type="button"
                                      aria-label="Mover aula para cima"
                                      onClick={() => handleMoveLesson(discipline.id, lesson.id, 'up')}
                                      disabled={index === 0}
                                    >
                                      ↑
                                    </button>
                                    <button
                                      className="btn btn-secondary"
                                      type="button"
                                      aria-label="Mover aula para baixo"
                                      onClick={() => handleMoveLesson(discipline.id, lesson.id, 'down')}
                                      disabled={index === discipline.lessons.length - 1}
                                    >
                                      ↓
                                    </button>
                                  </div>
                                </article>
                              ))}
                            </div>
                          ) : (
                            <p className="helper-text">Sem aulas cadastradas neste curso.</p>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeModule === 'alunos' && (
              <section className="card">
                <h2>Cadastro individual</h2>
                <form className="form-grid" onSubmit={handleCreateAluno}>
                  <input type="text" placeholder="Nome" value={alunoNome} onChange={(event) => setAlunoNome(event.target.value)} required />
                  <input type="text" placeholder="Matrícula" value={alunoMatricula} onChange={(event) => setAlunoMatricula(event.target.value)} required />
                  <input type="email" placeholder="E-mail" value={alunoEmail} onChange={(event) => setAlunoEmail(event.target.value)} />
                  <input type="text" placeholder="Senha padrão" value={alunoSenhaPadrao} onChange={(event) => setAlunoSenhaPadrao(event.target.value)} />
                  <button className="btn" type="submit">Cadastrar aluno</button>
                </form>

                <h2>Cadastro em massa (CSV simples)</h2>
                <form className="form-grid" onSubmit={handleBulkCadastro}>
                  <textarea
                    rows={5}
                    placeholder={'nome,matricula,email\nMaria,20260003,maria@mail.com'}
                    value={bulkCsv}
                    onChange={(event) => setBulkCsv(event.target.value)}
                  />
                  <button className="btn btn-secondary" type="submit">Importar em massa</button>
                </form>

                <h2>Alunos</h2>
                <table className="table">
                  <thead><tr><th>Nome</th><th>Matrícula</th><th>Status</th></tr></thead>
                  <tbody>
                    {alunos.map((aluno) => (
                      <tr key={aluno.id}><td>{aluno.nome}</td><td>{aluno.matricula}</td><td>{aluno.status}</td></tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {activeModule === 'matriculas' && (
              <section className="card">
                {user.role !== 'aluno' && (
                  <>
                    <h2>Vincular aluno ao curso</h2>
                    <form className="form-grid" onSubmit={handleCreateMatricula}>
                      <select value={matriculaAlunoId} onChange={(event) => setMatriculaAlunoId(event.target.value)} required>
                        <option value="">Selecione aluno</option>
                        {alunos.map((aluno) => (
                          <option key={aluno.id} value={aluno.id}>{aluno.nome} · {aluno.matricula}</option>
                        ))}
                      </select>
                      <select value={matriculaDisciplinaId} onChange={(event) => setMatriculaDisciplinaId(event.target.value)} required>
                        <option value="">Selecione curso</option>
                        {disciplines.map((discipline) => (
                          <option key={discipline.id} value={discipline.id}>{discipline.title}</option>
                        ))}
                      </select>
                      <button className="btn" type="submit">Matricular</button>
                    </form>
                  </>
                )}

                <h2>{user.role === 'aluno' ? 'Minhas matrículas' : 'Matrículas ativas'}</h2>
                {visibleMatriculas.length === 0 ? (
                  <p className="helper-text">Nenhuma matrícula encontrada.</p>
                ) : (
                  <div className="matriculas-grid">
                    {visibleMatriculas.map((item) => (
                      <article key={item.id} className="matricula-card">
                        <span className="eyebrow">{item.status}</span>
                        <h3>{item.disciplina_title}</h3>
                        <p>{item.aluno_nome}</p>
                        <p className="portal-meta">Matrícula acadêmica: {item.aluno_matricula}</p>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeModule === 'notas' && (
              <section className="card">
                <h2>Lançamento de notas</h2>
                <form className="form-grid" onSubmit={handleLaunchGrade}>
                  <select value={notaAlunoId} onChange={(event) => setNotaAlunoId(event.target.value)} required>
                    <option value="">Aluno</option>
                    {alunos.map((aluno) => <option key={aluno.id} value={aluno.id}>{aluno.nome}</option>)}
                  </select>
                  <select value={notaDisciplinaId} onChange={(event) => setNotaDisciplinaId(event.target.value)} required>
                    <option value="">Curso</option>
                    {disciplines.map((discipline) => <option key={discipline.id} value={discipline.id}>{discipline.title}</option>)}
                  </select>
                  <input type="text" placeholder="Avaliação" value={avaliacao} onChange={(event) => setAvaliacao(event.target.value)} required />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    placeholder="Nota"
                    aria-label="Nota da avaliação"
                    value={notaValor}
                    onChange={(event) => setNotaValor(event.target.value)}
                    required
                  />
                  <button className="btn" type="submit">Salvar nota</button>
                </form>

                <table className="table">
                  <thead><tr><th>Aluno</th><th>Curso</th><th>Avaliação</th><th>Nota</th></tr></thead>
                  <tbody>
                    {notas.map((item) => (
                      <tr key={item.id}><td>{item.aluno_nome}</td><td>{item.disciplina_title}</td><td>{item.avaliacao}</td><td>{item.nota}</td></tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {activeModule === 'progresso' && (
              <section className="card">
                <h2>Progresso por aluno</h2>
                {user.role !== 'aluno' && (
                  <form className="form-grid" onSubmit={handleUpdateProgress}>
                    <select value={progAlunoId} onChange={(event) => setProgAlunoId(event.target.value)} required>
                      <option value="">Aluno</option>
                      {alunos.map((aluno) => <option key={aluno.id} value={aluno.id}>{aluno.nome}</option>)}
                    </select>
                    <select value={progDisciplinaId} onChange={(event) => setProgDisciplinaId(event.target.value)} required>
                      <option value="">Curso</option>
                      {disciplines.map((discipline) => <option key={discipline.id} value={discipline.id}>{discipline.title}</option>)}
                    </select>
                    <input type="number" min="0" placeholder="Aulas concluídas" value={progConcluido} onChange={(event) => setProgConcluido(event.target.value)} required />
                    <input type="number" min="0" placeholder="Total de aulas" value={progTotal} onChange={(event) => setProgTotal(event.target.value)} required />
                    <button className="btn" type="submit">Atualizar progresso</button>
                  </form>
                )}

                <table className="table">
                  <thead><tr><th>Aluno</th><th>Curso</th><th>Concluído</th><th>Progresso</th></tr></thead>
                  <tbody>
                    {visibleProgresso.map((item) => (
                      <tr key={item.id}>
                        <td>{item.aluno_nome}</td>
                        <td>{item.disciplina_title}</td>
                        <td>{item.concluido}/{item.total}</td>
                        <td>{item.percentual}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {activeModule === 'certidoes' && (
              <section className="card">
                <h2>Certidão de conclusão</h2>
                {user.role !== 'aluno' && (
                  <form className="form-grid" onSubmit={handleEmitCertificate}>
                    <select value={certAlunoId} onChange={(event) => setCertAlunoId(event.target.value)} required>
                      <option value="">Aluno</option>
                      {alunos.map((aluno) => <option key={aluno.id} value={aluno.id}>{aluno.nome}</option>)}
                    </select>
                    <select value={certDisciplinaId} onChange={(event) => setCertDisciplinaId(event.target.value)} required>
                      <option value="">Curso</option>
                      {disciplines.map((discipline) => <option key={discipline.id} value={discipline.id}>{discipline.title}</option>)}
                    </select>
                    <input type="number" step="0.01" min="0" max="10" value={notaMinima} onChange={(event) => setNotaMinima(event.target.value)} />
                    <input type="number" step="0.01" min="0" max="100" value={progressoMinimo} onChange={(event) => setProgressoMinimo(event.target.value)} />
                    <button className="btn" type="submit">Emitir certidão</button>
                  </form>
                )}

                <table className="table">
                  <thead><tr><th>Aluno</th><th>Curso</th><th>Status</th><th>Ação</th></tr></thead>
                  <tbody>
                    {visibleCertidoes.map((item) => (
                      <tr key={item.id}>
                        <td>{item.aluno_nome}</td>
                        <td>{item.disciplina_title}</td>
                        <td>{item.status}</td>
                        <td><button className="btn btn-secondary" type="button" onClick={() => handleDownloadCert(item)}>Download</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {activeModule === 'integracoes' && (
              <section className="card">
                <h2>Integrações e webhook</h2>
                <p>Endpoint para webhook externo: <span className="inline-code">/api/webhook</span></p>
                <button className="btn" type="button" onClick={handleSimulateWebhook}>Simular webhook sem integração externa</button>

                <h3>Logs</h3>
                <table className="table">
                  <thead><tr><th>Origem</th><th>Evento</th><th>Status</th><th>Data</th></tr></thead>
                  <tbody>
                    {integracoes.map((item) => (
                      <tr key={item.id}>
                        <td>{item.source}</td>
                        <td>{item.event_type}</td>
                        <td>{item.status}</td>
                        <td>{formatDate(item.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [mustChangePassword, setMustChangePassword] = useState(false)

  const path = window.location.pathname
  const fullMatch = path.match(/^\/(?:aula|student)\/([^/]+)\/([^/]+)$/)

  if (fullMatch) {
    return (
      <StudentView
        disciplineId={decodeURIComponent(fullMatch[1])}
        lessonId={decodeURIComponent(fullMatch[2])}
      />
    )
  }

  const legacyMatch = path.match(/^\/(?:aula|student)\/([^/]+)$/)
  if (legacyMatch) {
    return <StudentView lessonId={decodeURIComponent(legacyMatch[1])} />
  }

  if (!user) {
    return <LoginView onLogin={(nextUser) => {
      setUser(nextUser)
      setMustChangePassword(Boolean(nextUser.firstAccess))
    }} />
  }

  if (mustChangePassword) {
    return <ChangePasswordView user={user} onChanged={() => setMustChangePassword(false)} />
  }

  return <PortalView user={user} onLogout={() => {
    setUser(null)
    setMustChangePassword(false)
  }} />
}

export default App
