import { describe, it, expect } from 'vitest'
import { blobPath, fileNameFromPath, sanitizeFileName, uniqueFileName } from './paths'

describe('paths', () => {
  it('builds a per-user blob path', () => {
    expect(blobPath('oid-1', 'report.pdf')).toBe('oid-1/report.pdf')
  })

  it('strips folder separators and leading dots from file names', () => {
    expect(sanitizeFileName('../../etc/passwd')).toBe('_.._etc_passwd')
    expect(sanitizeFileName('a\\b.txt')).toBe('a_b.txt')
    expect(sanitizeFileName('   ')).toBe('untitled')
  })

  it('extracts the file name from a blob path', () => {
    expect(fileNameFromPath('oid-1/report.pdf')).toBe('report.pdf')
  })

  it('suffixes a counter before the extension on collision', () => {
    expect(uniqueFileName('report.pdf', [])).toBe('report.pdf')
    expect(uniqueFileName('report.pdf', ['Report.PDF'])).toBe('report (1).pdf')
    expect(uniqueFileName('report.pdf', ['report.pdf', 'report (1).pdf'])).toBe('report (2).pdf')
    expect(uniqueFileName('README', ['README'])).toBe('README (1)')
    expect(uniqueFileName('.env', ['.env'])).toBe('.env (1)')
  })
})
