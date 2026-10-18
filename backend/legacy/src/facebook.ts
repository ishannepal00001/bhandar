const hosts = new Set([
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
  'web.facebook.com',
  'mbasic.facebook.com',
  'fb.watch',
  'www.fb.watch',
])

export function isFacebookUrl(input: string): boolean {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
  if (!hosts.has(url.hostname.toLowerCase())) return false
  // A bare domain isn't a video.
  return url.pathname.length > 1 || url.searchParams.has('v')
}
