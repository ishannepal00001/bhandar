/**
 * deploy.ts: `bun run deploy`. wrangler.jsonc keeps the secrets in `vars` so `wrangler dev` reads them, but a deployed
 * var is plain text in the Cloudflare dashboard and the deploy log. This moves every secret
 * named on the command line out of `vars` and uploads it as an encrypted Worker secret instead, in the same deploy.
 * package.json's deploy script passes the secret names; any argument starting with `-` goes on to `wrangler deploy`.
 *
 * config: wrangler.jsonc, parsed by Bun's JSONC import.
 * secretNames: the secret names from the command line; each must also be in `vars`, where its value lives.
 * wranglerArgs: the remaining arguments (e.g. --dry-run), passed to `wrangler deploy`.
 * deployConfig: written next to wrangler.jsonc (so its relative paths still resolve) and deleted after the deploy.
 * secretsFile: the secret values as JSON for `--secrets-file`, under .wrangler/ and deleted after the deploy.
 */
import { mkdir, rm } from 'node:fs/promises'
import config from './wrangler.jsonc'

const args = process.argv.slice(2)
const secretNames = args.filter((arg) => !arg.startsWith('-'))
const wranglerArgs = args.filter((arg) => arg.startsWith('-'))
const vars: Record<string, unknown> = { ...config.vars }
const secrets: Record<string, string> = {}

for (const name of secretNames) {
  if (typeof vars[name] !== 'string' || vars[name] === '') {
    throw new Error(`Secret ${name} is listed in the deploy script but has no value in wrangler.jsonc vars`)
  }
  secrets[name] = vars[name] as string
  delete vars[name]
}

const deployConfig = 'wrangler.deploy.json'
const secretsFile = '.wrangler/deploy-secrets.json'

await mkdir('.wrangler', { recursive: true })
await Bun.write(deployConfig, JSON.stringify({ ...config, vars }, null, 2))
await Bun.write(secretsFile, JSON.stringify(secrets))

try {
  const deploy = Bun.spawn(
    ['wrangler', 'deploy', '--config', deployConfig, '--secrets-file', secretsFile, ...wranglerArgs],
    { stdio: ['inherit', 'inherit', 'inherit'] },
  )
  process.exitCode = await deploy.exited
} finally {
  await rm(deployConfig, { force: true })
  await rm(secretsFile, { force: true })
}
