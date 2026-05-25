import { useEffect, useMemo, useState } from 'react'
import './App.css'

function TeacherView() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const canSubmit = useMemo(() => Boolean(file) && !loading, [file, loading])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setResult(null)

    if (!file) {
      setError('Selecione um arquivo HTML para publicar a aula.')
      return
    }

    setLoading(true)
    try {
      const html = await file.text()

      const response = await fetch('/api/aulas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          html,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Falha ao publicar a aula.')
      }

      setResult(payload)
    } catch (uploadError) {
      setError(uploadError.message || 'Não foi possível publicar a aula.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="container">
      <h1>Painel de Publicação de Aulas</h1>
      <p className="subtitle">
        Faça upload do HTML da aula e gere um endpoint para os alunos responderem e enviarem o webhook.
      </p>

      <form className="card" onSubmit={handleSubmit}>
        <label htmlFor="html-file">Arquivo HTML da aula</label>
        <input
          id="html-file"
          type="file"
          accept=".html,text/html"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />

        <button className="btn" type="submit" disabled={!canSubmit}>
          {loading ? 'Publicando...' : 'Publicar aula'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {result && (
        <section className="card success">
          <h2>Aula publicada com sucesso</h2>
          <p>
            Endpoint dos alunos: <a href={result.studentUrl}>{result.studentUrl}</a>
          </p>
          <div className="actions">
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => navigator.clipboard.writeText(result.studentUrl)}
            >
              Copiar endpoint
            </button>
            <a className="btn btn-secondary" href={result.studentUrl} target="_blank" rel="noreferrer">
              Abrir aula
            </a>
          </div>
        </section>
      )}
    </main>
  )
}

function StudentView({ lessonId }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [html, setHtml] = useState('')

  useEffect(() => {
    let active = true

    const loadLesson = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(`/api/aulas/${lessonId}`)
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload.error || 'Aula não encontrada.')
        }

        if (active) {
          setHtml(payload.html)
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
  }, [lessonId])

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
    <main className="full-lesson">
      <iframe
        title="Aula interativa"
        srcDoc={html}
        sandbox="allow-scripts allow-forms allow-downloads allow-modals allow-popups"
      />
    </main>
  )
}

function App() {
  const path = window.location.pathname
  const match = path.match(/^\/aula\/([^/]+)$/)

  if (match) {
    return <StudentView lessonId={decodeURIComponent(match[1])} />
  }

  return <TeacherView />
}

export default App
