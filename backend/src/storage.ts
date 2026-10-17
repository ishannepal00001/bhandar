import { S3Client } from 'bun'
import { env } from './env'

const s3 = new S3Client({
  accessKeyId: env.B2_KEY_ID,
  secretAccessKey: env.B2_APP_KEY,
  bucket: env.B2_BUCKET,
  endpoint: env.B2_ENDPOINT,
  region: env.B2_REGION,
})

const contentTypes: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  opus: 'audio/ogg',
}

export function contentTypeFor(ext: string) {
  return contentTypes[ext.toLowerCase()] ?? 'application/octet-stream'
}

/** Streams a local file to B2. Bun switches to multipart upload for large files. */
export async function uploadFile(key: string, path: string) {
  const ext = key.split('.').pop() ?? ''
  await s3.write(key, Bun.file(path), { type: contentTypeFor(ext) })
}

/** Short-lived link to a private object. Pass `filename` to make the browser save it. */
export function presignedUrl(key: string, filename?: string) {
  return s3.presign(key, {
    expiresIn: 60 * 60,
    contentDisposition: filename
      ? `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
      : 'inline',
  })
}

export async function deleteFile(key: string) {
  await s3.delete(key)
}
