// Backblaze B2 storage through its S3-compatible API. Files are keyed by a generated id.
// Storage(): Takes the Worker bindings from wrangler.jsonc, e.g. `new Storage(c.env)`.
// Storage.upload(): Streams need `size`, since B2 rejects uploads without a Content-Length.
// Storage.getFile(): Returns the file's metadata and a short-lived download link. Pass `filename` to make the
//   browser save it.
// Storage.signUrl(): Only signs, with no request to B2, so it's cheap enough for every item in a list. It doesn't check
//   the file exists.
// encodeKey(): Encodes each segment so the slashes in a key like downloads/<client>/<id>/<file> stay path
//   separators.
import { AwsClient } from 'aws4fetch'
import type { StorageEnv, StoredFile, StoredFileWithUrl } from './storage.types'
import { StorageError } from './storage.error'

export class Storage {
  private readonly client: AwsClient
  private readonly base: string
  private readonly urlTtlSeconds: number

  constructor(env: StorageEnv) {
    const { B2_KEY_ID, B2_APP_KEY, B2_BUCKET, B2_ENDPOINT, B2_REGION, STORAGE_URL_TTL_SECONDS } = env
    if (!B2_KEY_ID || !B2_APP_KEY || !B2_BUCKET || !B2_ENDPOINT || !B2_REGION) {
      throw new StorageError('Storage is not configured')
    }
    this.client = new AwsClient({
      accessKeyId: B2_KEY_ID,
      secretAccessKey: B2_APP_KEY,
      region: B2_REGION,
      service: 's3',
    })
    this.base = `${B2_ENDPOINT.replace(/\/$/, '')}/${B2_BUCKET}`
    this.urlTtlSeconds = STORAGE_URL_TTL_SECONDS
  }

  async upload(body: ReadableStream | ArrayBuffer, contentType: string, size?: number): Promise<{ id: string }> {
    const id = crypto.randomUUID()
    const headers: Record<string, string> = { 'Content-Type': contentType }
    if (size !== undefined) headers['Content-Length'] = String(size)

    const res = await this.send(`${this.base}/${id}`, { method: 'PUT', headers, body })
    if (!res.ok) throw new StorageError(`Upload failed with ${res.status}`)
    return { id }
  }

  async getFiles(): Promise<StoredFile[]> {
    const files: StoredFile[] = []
    let token: string | undefined

    do {
      const url = new URL(this.base)
      url.searchParams.set('list-type', '2')
      if (token) url.searchParams.set('continuation-token', token)

      const res = await this.send(url.toString(), { method: 'GET' })
      if (!res.ok) throw new StorageError(`Listing failed with ${res.status}`)
      const xml = await res.text()

      for (const [, entry] of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
        files.push({
          id: xmlValue(entry, 'Key') ?? '',
          size: Number(xmlValue(entry, 'Size') ?? 0),
          lastModified: xmlValue(entry, 'LastModified') ?? '',
        })
      }
      token = xmlValue(xml, 'NextContinuationToken')
    } while (token)

    return files
  }

  async getFile(id: string, filename?: string): Promise<StoredFileWithUrl> {
    const objectUrl = `${this.base}/${encodeKey(id)}`
    const res = await this.send(objectUrl, { method: 'HEAD' })
    if (res.status === 404) throw new StorageError('File not found', 404)
    if (!res.ok) throw new StorageError(`Lookup failed with ${res.status}`)

    return {
      id,
      size: Number(res.headers.get('Content-Length') ?? 0),
      contentType: res.headers.get('Content-Type') ?? 'application/octet-stream',
      lastModified: res.headers.get('Last-Modified') ?? '',
      url: await this.signUrl(id, filename),
    }
  }

  async signUrl(id: string, filename?: string): Promise<string> {
    const signed = new URL(`${this.base}/${encodeKey(id)}`)
    signed.searchParams.set('X-Amz-Expires', String(this.urlTtlSeconds))
    signed.searchParams.set(
      'response-content-disposition',
      filename ? `attachment; filename*=UTF-8''${encodeURIComponent(filename)}` : 'inline',
    )
    const presigned = await this.client.sign(signed.toString(), { method: 'GET', aws: { signQuery: true } })
    return presigned.url
  }

  async deleteFile(id: string): Promise<void> {
    const res = await this.send(`${this.base}/${encodeKey(id)}`, { method: 'DELETE' })
    if (!res.ok && res.status !== 404) throw new StorageError(`Delete failed with ${res.status}`)
  }

  private async send(url: string, init: RequestInit): Promise<Response> {
    try {
      return await this.client.fetch(url, init)
    } catch (err) {
      throw new StorageError('Storage is unreachable', 500, { cause: err })
    }
  }
}

function xmlValue(xml: string, tag: string): string | undefined {
  return xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1]
}

function encodeKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/')
}
