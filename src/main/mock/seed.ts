import type { Note } from '../../shared/contracts'

const lorem =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis dapibus posuere velit aliquet. Donec ullamcorper nulla non metus auctor fringilla.'

export const seed: Note[] = (
  [
    ['Cell Respiration Overview', 'Study', 'manual'],
    ['Thesis Proposal Draft', 'Work', 'manual'],
    ['Calculus Problem Set 4', 'Assignment', 'manual'],
    ['Robotics Capstone Plan', 'Projects', 'manual'],
    ['MIT 6.006 Lecture Clips', 'Videos', 'sources'],
    ['Organic Chem Slides — Week 3', 'Study', 'sources'],
    ['Research Paper: Attention Is All You Need', 'Work', 'sources'],
    ['Lab Equipment to Buy', 'Wishlist', 'manual'],
    ['Study Guide: Thermodynamics', 'Study', 'ai'],
    ['Gap Analysis: Linear Algebra', 'Assignment', 'ai'],
    ['Auto Summary: History Readings', 'Work', 'ai']
  ] as [string, Note['category'], Note['pillar']][]
).map(([title, category, pillar], i) => ({
  id: `n${i + 1}`,
  title,
  category,
  pillar,
  content: `<h1>${title}</h1><p>${lorem}</p><ul><li>Key idea one</li><li>Key idea two</li></ul><p>${lorem}</p>`,
  updatedAt: new Date(2021, 0, 7 - i, 21, 38 - i).toISOString()
}))
