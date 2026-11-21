import type { Note } from '@/lib/noodle-api'

const stop = new Set([
  'the',
  'for',
  'my',
  'on',
  'and',
  'a',
  'to',
  'of',
  'prepare',
  'study',
  'today',
  'in',
  'with',
  'is'
])
const words = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ')
    .match(/[a-z0-9]+/g)
    ?.filter((w) => !stop.has(w)) ?? []

// Local lexical cosine fallback, not semantic embeddings or a vector database.
export function cosineMatch(query: string, text: string): number {
  const counts = (s: string): Record<string, number> =>
    words(s).reduce<Record<string, number>>((a, w) => {
      a[w] = (a[w] ?? 0) + 1
      return a
    }, {})
  const a = counts(query),
    b = counts(text)
  const dot = Object.keys(a).reduce((sum, w) => sum + (a[w] ?? 0) * (b[w] ?? 0), 0)
  const norm = Math.sqrt(
    Object.values(a).reduce((sum, v) => sum + v * v, 0) *
      Object.values(b).reduce((sum, v) => sum + v * v, 0)
  )
  return norm ? Math.round((dot / norm) * 100) : 0
}

type Match = { note: Note; score: number }

export function recommend(task: string, notes: Note[]): { sources: Match[]; manual: Match[] } {
  const matches = notes
    .filter((n) => n.pillar !== 'ai')
    .map((note) => ({ note, score: cosineMatch(task, `${note.title} ${note.content}`) }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
  return {
    sources: matches.filter((m) => m.note.pillar === 'sources').slice(0, 4),
    manual: matches.filter((m) => m.note.pillar === 'manual').slice(0, 4)
  }
}

export interface StudyBridge {
  synthesize: (input: {
    task: string
    outputFormat?: 'Study Guide' | 'Summary Cheat-Sheet' | 'Flashcard Set' | 'Practice Exam'
    materials: Pick<Note, 'id' | 'title' | 'content' | 'pillar'>[]
  }) => Promise<{ title: string; content: string }>
}
declare global {
  interface Window {
    noodleStudy?: StudyBridge
  }
}
