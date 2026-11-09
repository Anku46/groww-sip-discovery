// Stages the built app for a static Vercel upload: dist/ plus a vercel.json with no build step.
// Usage: pnpm deploy:prepare, then from mvp/.deploy: vercel deploy --prod
import { cpSync, existsSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const dist = `${root}dist`
const out = `${root}.deploy`

if (!existsSync(`${dist}/index.html`)) {
  console.error('dist/index.html is missing: run pnpm build first')
  process.exit(1)
}

// Keep .deploy/.vercel (the project link) across runs; replace everything else.
if (existsSync(out)) {
  for (const entry of ['assets', 'index.html', 'vercel.json']) rmSync(`${out}/${entry}`, { recursive: true, force: true })
}
cpSync(dist, out, { recursive: true })

const vercel = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  rewrites: [{ source: '/((?!assets/).*)', destination: '/index.html' }],
  headers: [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'DENY' },
      ],
    },
    { source: '/assets/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
  ],
}
writeFileSync(`${out}/vercel.json`, JSON.stringify(vercel, null, 2) + '\n')
// Never upload local env files: `vercel link` can write a .env.local with a token into this folder.
rmSync(`${out}/.env.local`, { force: true })
writeFileSync(`${out}/.vercelignore`, '.env*\n.gitignore\n')
console.log(`Staged ${out}`)
