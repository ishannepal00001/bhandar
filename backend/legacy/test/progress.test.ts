import { describe, expect, test } from 'bun:test'
import { parseProgressLine, progressTemplate } from '../src/progress'

const line = (data: object) =>
  progressTemplate.replace('download:', '').replace('%(progress)j', JSON.stringify(data))

describe('parseProgressLine', () => {
  test('computes progress from bytes', () => {
    const p = parseProgressLine(
      line({ status: 'downloading', downloaded_bytes: 250, total_bytes: 1000, speed: 50.5, eta: 15 }),
    )
    expect(p).toEqual({
      status: 'downloading',
      progress: 25,
      bytesDone: 250,
      bytesTotal: 1000,
      speed: 50.5,
      eta: 15,
    })
  })

  test('falls back to the estimated total', () => {
    const p = parseProgressLine(
      line({ status: 'downloading', downloaded_bytes: 1, total_bytes_estimate: 3 }),
    )
    expect(p?.progress).toBe(33.3)
    expect(p?.bytesTotal).toBe(3)
  })

  test('finished means 100%', () => {
    expect(parseProgressLine(line({ status: 'finished', downloaded_bytes: 10 }))?.progress).toBe(100)
  })

  test('handles missing numbers', () => {
    const p = parseProgressLine(line({ status: 'downloading', speed: null, eta: null }))
    expect(p).toMatchObject({ progress: null, speed: null, eta: null, bytesDone: null })
  })

  test('ignores non-progress output', () => {
    expect(parseProgressLine('[facebook] 123: Downloading webpage')).toBeNull()
    expect(parseProgressLine('bhandar-progress:{not json')).toBeNull()
  })
})
