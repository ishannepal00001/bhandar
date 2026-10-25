// Bun preload for scripts: serves `cloudflare:workers` with the same env the Worker gets,
// vars from wrangler.jsonc plus secrets from .dev.vars, so shared code runs unchanged.
import { plugin } from 'bun'
import { parseEnv } from 'node:util'

const root = new URL('..', import.meta.url)
const wrangler = Bun.JSONC.parse(await Bun.file(new URL('wrangler.jsonc', root)).text()) as { vars?: object }
const devVars = Bun.file(new URL('.dev.vars', root))
const env = { ...wrangler.vars, ...((await devVars.exists()) ? parseEnv(await devVars.text()) : {}) }

plugin({
  name: 'cloudflare-workers-env',
  setup(build) {
    build.module('cloudflare:workers', () => ({ exports: { env }, loader: 'object' }))
  },
})
