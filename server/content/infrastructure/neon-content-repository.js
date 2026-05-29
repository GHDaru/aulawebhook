import { initDb } from '../../../api/db.js'

async function createContentRepository() {
  const sql = await initDb()

  return {
    async listDisciplines({ professorId } = {}) {
      const rows = professorId
        ? await sql`
            SELECT id, title, professor_id, created_at
            FROM disciplinas
            WHERE professor_id = ${professorId}
            ORDER BY created_at DESC
          `
        : await sql`
            SELECT id, title, professor_id, created_at
            FROM disciplinas
            ORDER BY created_at DESC
          `

      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        professorId: row.professor_id || null,
        createdAt: row.created_at,
      }))
    },

    async listLessonsByDisciplineIds(disciplineIds) {
      if (!disciplineIds.length) return []

      const rows = await sql`
        SELECT id, disciplina_id, title, lesson_order, created_at
        FROM aulas
        WHERE disciplina_id = ANY(${disciplineIds})
        ORDER BY disciplina_id ASC, lesson_order ASC
      `

      return rows.map((row) => ({
        id: row.id,
        disciplineId: row.disciplina_id,
        title: row.title,
        order: row.lesson_order,
        createdAt: row.created_at,
      }))
    },

    async hasDisciplineWithId(id) {
      const existing = await sql`SELECT 1 FROM disciplinas WHERE id = ${id} LIMIT 1`
      return existing.length > 0
    },

    async listDisciplineSlugs(baseSlug) {
      const rows = await sql`
        SELECT id
        FROM disciplinas
        WHERE id = ${baseSlug}
          OR id LIKE ${`${baseSlug}-%`}
      `

      return rows.map((row) => row.id)
    },

    async createDiscipline(discipline) {
      await sql`
        INSERT INTO disciplinas (id, title, professor_id)
        VALUES (${discipline.id}, ${discipline.title}, ${discipline.professorId})
      `
    },

    async findDisciplineById(id) {
      const rows = await sql`
        SELECT id, title, professor_id, created_at
        FROM disciplinas
        WHERE id = ${id}
        LIMIT 1
      `

      if (!rows.length) return null

      return {
        id: rows[0].id,
        title: rows[0].title,
        professorId: rows[0].professor_id || null,
        createdAt: rows[0].created_at,
      }
    },

    async hasLessonWithId(id) {
      const existing = await sql`SELECT 1 FROM aulas WHERE id = ${id} LIMIT 1`
      return existing.length > 0
    },

    async listLessonSlugs(baseSlug) {
      const rows = await sql`
        SELECT id
        FROM aulas
        WHERE id = ${baseSlug}
          OR id LIKE ${`${baseSlug}-%`}
      `

      return rows.map((row) => row.id)
    },

    async getNextLessonOrder(disciplineId) {
      const rows = await sql`
        SELECT COALESCE(MAX(lesson_order), 0) AS max_order
        FROM aulas
        WHERE disciplina_id = ${disciplineId}
      `

      return Number(rows[0]?.max_order ?? 0) + 1
    },

    async createLesson(lesson) {
      let lastError = null

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          const rows = await sql`
            INSERT INTO aulas (id, html, disciplina_id, lesson_order, title)
            SELECT
              ${lesson.id},
              ${lesson.html},
              ${lesson.disciplineId},
              COALESCE((SELECT MAX(lesson_order) FROM aulas WHERE disciplina_id = ${lesson.disciplineId}), 0) + 1,
              ${lesson.title}
            RETURNING lesson_order
          `

          return Number(rows[0]?.lesson_order ?? 0)
        } catch (error) {
          lastError = error
          const message = String(error?.message || '')
          const isOrderCollision = message.includes('aulas_disciplina_lesson_order_unique_idx')

          if (attempt < 3 && isOrderCollision) {
            continue
          }

          throw error
        }
      }

      throw lastError
    },

    async listLessonsByDiscipline(disciplineId) {
      const rows = await sql`
        SELECT id, html, title, lesson_order
        FROM aulas
        WHERE disciplina_id = ${disciplineId}
        ORDER BY lesson_order ASC
      `

      return rows.map((row) => ({
        id: row.id,
        html: row.html,
        title: row.title,
        order: row.lesson_order,
      }))
    },

    async findLegacyLessonById(id) {
      const rows = await sql`
        SELECT html
        FROM aulas
        WHERE id = ${id}
          AND disciplina_id IS NULL
        LIMIT 1
      `

      if (!rows.length) return null
      return { id, html: rows[0].html }
    },

    async deleteDiscipline(id) {
      await sql`
        WITH deleted_lessons AS (
          DELETE FROM aulas
          WHERE disciplina_id = ${id}
          RETURNING id
        ),
        deleted_discipline AS (
          DELETE FROM disciplinas
          WHERE id = ${id}
          RETURNING id
        )
        SELECT COUNT(*)::int AS total
        FROM deleted_discipline
      `
    },

    async deleteLegacyLesson(id) {
      const deleted = await sql`
        DELETE FROM aulas
        WHERE id = ${id}
          AND disciplina_id IS NULL
        RETURNING id
      `

      return deleted.length > 0
    },
  }
}

export { createContentRepository }
