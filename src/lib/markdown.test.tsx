import { describe, it, expect } from 'vitest'
import { looksLikeMarkdown } from './markdown'

describe('looksLikeMarkdown', () => {
  it('detects headings and tables', () => {
    expect(looksLikeMarkdown('# Title')).toBeTruthy()
    expect(looksLikeMarkdown('| a | b |')).toBeTruthy()
    expect(looksLikeMarkdown('plain text')).toBeFalsy()
  })
})
