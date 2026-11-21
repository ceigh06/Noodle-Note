import { describe, expect, it } from 'vitest'
import { cosineMatch, recommend } from '@/lib/study'
import type { Note } from '@/lib/noodle-api'
const note = (id: string, pillar: Note['pillar'], title: string): Note => ({
  id,
  pillar,
  title,
  content: '',
  category: 'Study',
  updatedAt: '2026-10-31'
})
describe('local recommendations', () => {
  it('computes cosine percentages from actual matching terms', () => {
    expect(cosineMatch('calculus derivatives', 'calculus derivatives')).toBe(100)
    expect(cosineMatch('calculus', 'biology')).toBe(0)
  })
  it('separates source and manual matches without retrieving AI outputs', () => {
    const result = recommend('calculus', [
      note('s', 'sources', 'calculus'),
      note('m', 'manual', 'calculus'),
      note('a', 'ai', 'calculus')
    ])
    expect(result.sources.map((m) => m.note.id)).toEqual(['s'])
    expect(result.manual.map((m) => m.note.id)).toEqual(['m'])
  })
})
