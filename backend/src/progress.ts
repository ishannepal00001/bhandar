export type ProgressLine = {
  status: string
  progress: number | null
  bytesDone: number | null
  bytesTotal: number | null
  speed: number | null
  eta: number | null
}

const PREFIX = 'bhandar-progress:'

/** yt-dlp is started with `--progress-template "download:bhandar-progress:%(progress)j"`. */
export const progressTemplate = `download:${PREFIX}%(progress)j`

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** Parses one stdout line from yt-dlp. Returns null for anything that isn't a progress line. */
export function parseProgressLine(line: string): ProgressLine | null {
  const start = line.indexOf(PREFIX)
  if (start === -1) return null
  let data: Record<string, unknown>
  try {
    data = JSON.parse(line.slice(start + PREFIX.length))
  } catch {
    return null
  }
  if (!data || typeof data !== 'object') return null

  const bytesDone = num(data.downloaded_bytes)
  const bytesTotal = num(data.total_bytes) ?? num(data.total_bytes_estimate)
  let progress: number | null = null
  if (data.status === 'finished') progress = 100
  else if (bytesDone !== null && bytesTotal) progress = Math.min(100, (bytesDone / bytesTotal) * 100)
  else if (typeof data._percent === 'number') progress = data._percent

  return {
    status: typeof data.status === 'string' ? data.status : 'unknown',
    progress: progress === null ? null : Math.round(progress * 10) / 10,
    bytesDone,
    bytesTotal,
    speed: num(data.speed),
    eta: num(data.eta),
  }
}
