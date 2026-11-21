import { describe, expect, it } from 'vitest'
import { NoteFileParseError, computeContentHash, createNoteFile, parseNoteFile } from './noteFile'

describe('note file', () => {
  it('creates a UUID v4 note with a hash of the content', () => {
    const note = createNoteFile({ title: 'Empty note' })
    expect(note.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
    expect(note.content).toEqual({ type: 'doc', content: [] })
    expect(note.contentHash).toBe(computeContentHash(note.content))
  })

  it('computes a stable hash across object key reordering', () => {
    const first = { type: 'doc' as const, attrs: { z: 1, a: 2 }, content: [{ type: 'paragraph' }] }
    const second = { content: [{ type: 'paragraph' }], attrs: { a: 2, z: 1 }, type: 'doc' as const }
    expect(computeContentHash(first)).toBe(computeContentHash(second))
  })

  it('changes the hash when content changes', () => {
    const first = { type: 'doc' as const, content: [{ type: 'paragraph' }] }
    const second = { type: 'doc' as const, content: [{ type: 'heading', attrs: { level: 1 } }] }
    expect(computeContentHash(first)).not.toBe(computeContentHash(second))
  })

  it('parses valid JSON and rejects malformed JSON with a typed error', () => {
    const note = createNoteFile({ title: 'Parse me' })
    expect(parseNoteFile(JSON.stringify(note))).toEqual(note)
    expect(() => parseNoteFile('{')).toThrowError(NoteFileParseError)
    try {
      parseNoteFile('{')
    } catch (error) {
      expect(error).toMatchObject({ code: 'invalid-json', name: 'NoteFileParseError' })
    }
  })

  it.each([
    ['not an object', 'null'],
    ['missing required fields', JSON.stringify({ type: 'doc' })],
    ['non-v4 ID', JSON.stringify({ id: 'not-a-uuid' })]
  ])('rejects %s with a typed shape error', (_name, input) => {
    expect(() => parseNoteFile(input)).toThrowError(NoteFileParseError)
    try {
      parseNoteFile(input)
    } catch (error) {
      expect(error).toMatchObject({ code: 'invalid-shape' })
    }
  })

  it('rejects content tampering with a typed hash error', () => {
    const note = createNoteFile({ title: 'Tamper me' })
    const tampered = JSON.stringify({
      ...note,
      content: { type: 'doc', content: [{ type: 'paragraph' }] }
    })
    expect(() => parseNoteFile(tampered)).toThrowError(NoteFileParseError)
    try {
      parseNoteFile(tampered)
    } catch (error) {
      expect(error).toMatchObject({ code: 'content-hash-mismatch' })
    }
  })
})
