// /api/* on Pages: forwards the request to the Worker so the browser only ever talks to this origin.
// Why: the login cookie is HttpOnly and host-only, so it has to be set by the origin the page is on.
//   Calling the Worker directly makes it a third-party cookie, which Brave, Safari and Firefox block by
//   default; login then succeeds but the next /dashboard request is a 401 and the app bounces back to
//   /auth (what happened on a phone in Brave).
// onRequest(): Only /api/* maps to this file, so static assets and SPA routes are untouched. The Worker's
//   response is returned as-is, including Set-Cookie and the SSE streams. Origin is set to the Pages
//   origin because that is what the Worker's CORS and CSRF checks allow.
const API_ORIGIN = 'https://bhandar-backend.ishannepal00001.workers.dev'

export async function onRequest({ request }: { request: Request }): Promise<Response> {
  const url = new URL(request.url)
  const target = new URL(url.pathname + url.search, API_ORIGIN)
  const headers = new Headers(request.headers)
  headers.set('Origin', url.origin)

  return fetch(target, {
    method: request.method,
    headers,
    body: request.body,
    redirect: 'manual',
  })
}
