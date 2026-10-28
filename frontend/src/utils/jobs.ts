import type { FinalStatus, FinishedJob, Job, QueuedJob } from '../types/downloads'

export const statusLabels: Record<FinalStatus, string> = {
  completed: 'Done',
  failed: 'Failed',
  cancelled: 'Cancelled',
}

export const isQueued = (job: Job): job is QueuedJob => job.status === 'queued'

export const isFinished = (job: Job): job is FinishedJob => job.status !== 'queued'

export function jobTitle(job: Job): string {
  return ('title' in job && job.title) || job.source_url.replace(/^https?:\/\//, '')
}
