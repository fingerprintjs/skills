#!/usr/bin/env node
// Checks this repo's skills against the current published upstream packages and docs.
// No version pins are read or written -- see AGENTS.md: skill.json lists package names only.
// Zero dependencies: Node 22 global fetch, plus `tar` for unpacking npm tarballs.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const SKILLS = path.join(ROOT, 'skills')

const failures = []
const warnings = []
const notes = []

const fail = (m) => { failures.push(m); console.log(`FAIL  ${m}`) }
const warn = (m) => { warnings.push(m); console.log(`WARN  ${m}`) }
const ok = (m) => console.log(`ok    ${m}`)
const note = (m) => { notes.push(m); console.log(`note  ${m}`) }

const rel = (p) => path.relative(ROOT, p)

// 1-based line number of a character offset
const lineAt = (text, index) => text.slice(0, index).split('\n').length

const lineOf = (text, needle) => {
  const i = text.indexOf(needle)
  return i === -1 ? 0 : lineAt(text, i)
}

// walk a directory tree, returning absolute file paths
function walk(dir) {
  if (!existsSync(dir)) return []
  const out = []
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else out.push(p)
  }
  return out
}

const skillDirs = existsSync(SKILLS)
  ? readdirSync(SKILLS).map((d) => path.join(SKILLS, d)).filter((p) => statSync(p).isDirectory()).sort()
  : []

if (skillDirs.length === 0) fail('no skills found under skills/')

// ---------------------------------------------------------------- registries

const npmMetaCache = new Map()

async function npmMeta(pkg) {
  if (npmMetaCache.has(pkg)) return npmMetaCache.get(pkg)
  const p = (async () => {
    const res = await fetch(`https://registry.npmjs.org/${pkg.replace('/', '%2f')}`, {
      headers: { accept: 'application/vnd.npm.install-v1+json, application/json' },
    })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`registry.npmjs.org returned ${res.status}`)
    return res.json()
  })()
  npmMetaCache.set(pkg, p)
  return p
}

async function pypiMeta(pkg) {
  const res = await fetch(`https://pypi.org/pypi/${encodeURIComponent(pkg)}/json`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`pypi.org returned ${res.status}`)
  return res.json()
}

const npmLatest = (meta) => meta?.['dist-tags']?.latest

// ------------------------------------------------- 1. packages still resolve

console.log('\n== 1. skill.json packages resolve on their registry ==')

// name -> { skills: [{file, line}] }
const declared = new Map()

for (const dir of skillDirs) {
  const file = path.join(dir, 'skill.json')
  if (!existsSync(file)) { fail(`${rel(dir)}: missing skill.json`); continue }
  const raw = readFileSync(file, 'utf8')
  let json
  try { json = JSON.parse(raw) } catch (e) { fail(`${rel(file)}: invalid JSON -- ${e.message}`); continue }
  for (const name of json.packages ?? []) {
    if (!declared.has(name)) declared.set(name, [])
    declared.get(name).push({ file: rel(file), line: lineOf(raw, `"${name}"`) })
  }
}

if (declared.size === 0) fail('no packages declared in any skills/*/skill.json')

for (const [name, sites] of [...declared].sort()) {
  const where = sites.map((s) => `${s.file}:${s.line}`).join(', ')
  // Registry is derived from the name: a scoped name is npm-only; an unscoped name
  // can live on either, so probe both and accept any that resolves.
  const probes = name.startsWith('@') ? ['npm'] : ['npm', 'pypi']
  const found = []
  let networkError = null
  for (const reg of probes) {
    try {
      const meta = reg === 'npm' ? await npmMeta(name) : await pypiMeta(name)
      const version = meta && (reg === 'npm' ? npmLatest(meta) : meta.info.version)
      // npm parks squatted names at 0.0.1-security; that is not a real package
      if (version && version !== '0.0.1-security') found.push(`${reg} ${version}`)
    } catch (e) { networkError = e.message }
  }
  if (found.length) ok(`${name} -> ${found.join(' + ')}  (${where})`)
  else if (networkError) warn(`${name}: could not reach registry (${networkError})  (${where})`)
  else fail(`${name} does not resolve on ${probes.join(' or ')}  (${where})`)
}

// ----------------------------------------- 2. snippet imports still exported

console.log('\n== 2. @fingerprint/* symbols imported by snippets are still exported ==')

// package -> Map(symbol -> [file:line])
const wanted = new Map()
const add = (pkg, symbol, site) => {
  if (!symbol) return
  if (!wanted.has(pkg)) wanted.set(pkg, new Map())
  const m = wanted.get(pkg)
  if (!m.has(symbol)) m.set(symbol, [])
  m.get(symbol).push(site)
}

const SPEC = String.raw`(@fingerprint\/[a-z0-9-]+)`
const RE_NAMED = new RegExp(String.raw`import\s*\{([^}]*)\}\s*from\s*['"]${SPEC}['"]`, 'g')
const RE_NAMESPACE = new RegExp(String.raw`import\s*\*\s*as\s*([A-Za-z_$][\w$]*)\s*from\s*['"]${SPEC}['"]`, 'g')
const RE_REQUIRE = new RegExp(String.raw`(?:const|let|var)\s*\{([^}]*)\}\s*=\s*require\(\s*['"]${SPEC}['"]\s*\)`, 'g')

const splitNames = (list) =>
  list.split(',').map((s) => s.trim()).filter(Boolean)
    .map((s) => (s.includes(' as ') ? s.split(' as ')[0] : s).replace(/^type\s+/, '').trim())
    .filter((s) => /^[A-Za-z_$][\w$]*$/.test(s))

for (const dir of skillDirs) {
  for (const file of walk(path.join(dir, 'snippets'))) {
    const text = readFileSync(file, 'utf8')
    for (const re of [RE_NAMED, RE_REQUIRE]) {
      re.lastIndex = 0
      let m
      while ((m = re.exec(text))) {
        const site = `${rel(file)}:${lineAt(text, m.index)}`
        for (const s of splitNames(m[1])) add(m[2], s, site)
      }
    }
    RE_NAMESPACE.lastIndex = 0
    let m
    while ((m = RE_NAMESPACE.exec(text))) {
      // namespace import: pick up the members actually used off the namespace
      const site = `${rel(file)}:${lineAt(text, m.index)}`
      const use = new RegExp(String.raw`\b${m[1]}\.([A-Za-z_$][\w$]*)`, 'g')
      let u
      while ((u = use.exec(text))) add(m[2], u[1], `${rel(file)}:${lineAt(text, u.index)}`)
      void site
    }
  }
}

const RE_EXPORT_LIST = /export\s+(?:type\s+)?\{([^}]*)\}/g
const RE_EXPORT_DECL =
  /export\s+(?:declare\s+)?(?:default\s+)?(?:abstract\s+)?(?:async\s+)?(?:function|const|let|var|class|enum|interface|type|namespace)\s+([A-Za-z_$][\w$]*)/g

// exported names declared in a package's .d.ts files, plus the raw text for a loose fallback
function readExports(pkgDir) {
  const decls = walk(pkgDir).filter((f) => /\.d\.(ts|mts|cts)$/.test(f))
  const names = new Set()
  let blob = ''
  let wildcard = false
  for (const f of decls) {
    const text = readFileSync(f, 'utf8')
    blob += `\n${text}`
    if (/export\s*\*\s*from/.test(text)) wildcard = true
    RE_EXPORT_LIST.lastIndex = 0
    let m
    while ((m = RE_EXPORT_LIST.exec(text))) {
      for (const entry of m[1].split(',').map((s) => s.trim()).filter(Boolean)) {
        const name = (entry.includes(' as ') ? entry.split(' as ').pop() : entry).replace(/^type\s+/, '').trim()
        if (/^[A-Za-z_$][\w$]*$/.test(name)) names.add(name)
      }
    }
    RE_EXPORT_DECL.lastIndex = 0
    while ((m = RE_EXPORT_DECL.exec(text))) names.add(m[1])
  }
  // components can ship as .svelte/.vue files rather than declarations
  for (const f of walk(pkgDir)) {
    if (/\.(svelte|vue)$/.test(f)) names.add(path.basename(f).replace(/\.(svelte|vue)$/, ''))
  }
  return { names, blob, declCount: decls.length, wildcard }
}

async function fetchPackage(pkg) {
  const meta = await npmMeta(pkg)
  if (!meta) return null
  const version = npmLatest(meta)
  const tarball = meta.versions?.[version]?.dist?.tarball
  if (!tarball) return null
  const res = await fetch(tarball)
  if (!res.ok) throw new Error(`tarball fetch returned ${res.status}`)
  const dir = mkdtempSync(path.join(tmpdir(), 'fpchk-'))
  const tgz = path.join(dir, 'p.tgz')
  writeFileSync(tgz, Buffer.from(await res.arrayBuffer()))
  const out = path.join(dir, 'pkg')
  mkdirSync(out)
  execFileSync('tar', ['-xzf', tgz, '-C', out])
  return { version, dir: out }
}

if (wanted.size === 0) warn('no @fingerprint/* imports found in any skills/*/snippets -- check 2 did nothing')

for (const [pkg, symbols] of [...wanted].sort()) {
  let pack
  try { pack = await fetchPackage(pkg) } catch (e) { warn(`${pkg}: could not download tarball (${e.message}) -- skipping symbol check`); continue }
  if (!pack) { fail(`${pkg}: not published on npm, but imported by snippets`); continue }
  const { names, blob, declCount, wildcard } = readExports(pack.dir)
  if (declCount === 0) { note(`${pkg}@${pack.version}: ships no type declarations -- skipping symbol check`); continue }
  for (const [symbol, sites] of [...symbols].sort()) {
    const where = sites.join(', ')
    if (names.has(symbol)) ok(`${pkg}@${pack.version} exports ${symbol}  (${where})`)
    else if (new RegExp(String.raw`\b${symbol}\b`).test(blob)) {
      // present but not matched as a top-level export -- most often behind `export * from`
      warn(`${pkg}@${pack.version}: ${symbol} present in declarations but not a resolvable top-level export${wildcard ? ' (package re-exports with `export *`)' : ''}  (${where})`)
    } else fail(`${pkg}@${pack.version} no longer exports ${symbol}  (${where})`)
  }
}

// -------------------------------- 3. JS Agent major matches the /vN/ paths

console.log('\n== 3. @fingerprint/agent npm major matches the /vN/ agent paths ==')

const CDN_HTML = path.join(SKILLS, 'fingerprint-javascript', 'snippets', 'cdn.html')
let agentMajor = null

if (!existsSync(CDN_HTML)) fail(`${rel(CDN_HTML)}: missing -- cannot derive the expected agent major`)
else {
  const text = readFileSync(CDN_HTML, 'utf8')
  const m = /fpjscdn\.net\/v(\d+)\//.exec(text)
  if (!m) fail(`${rel(CDN_HTML)}: no fpjscdn.net/vN/ path found -- cannot derive the expected agent major`)
  else {
    agentMajor = Number(m[1])
    ok(`expected agent major v${agentMajor} (from ${rel(CDN_HTML)}:${lineAt(text, m.index)})`)
  }
}

if (agentMajor !== null) {
  // every agent CDN / first-party endpoint path in the repo must agree
  const AGENT_PATH = /(?:fpjscdn\.net|\/web)\/v(\d+)\//g
  const SERVER_API_PATH = /api\.fpjs\.io\/v(\d+)\//g
  for (const file of walk(ROOT)) {
    if (rel(file).startsWith('.git/') || rel(file).startsWith('.github/')) continue
    if (!/\.(md|mdc|json|html|js|mjs|ts|tsx|jsx|py|svelte|vue)$/.test(file)) continue
    const text = readFileSync(file, 'utf8')
    AGENT_PATH.lastIndex = 0
    let m
    while ((m = AGENT_PATH.exec(text))) {
      if (Number(m[1]) !== agentMajor) {
        fail(`${rel(file)}:${lineAt(text, m.index)}: agent path uses /v${m[1]}/ but ${rel(CDN_HTML)} says v${agentMajor}`)
      }
    }
    SERVER_API_PATH.lastIndex = 0
    while ((m = SERVER_API_PATH.exec(text))) {
      note(`${rel(file)}:${lineAt(text, m.index)}: Server API path is /v${m[1]}/ -- versioned separately from the JS Agent, not checked`)
    }
  }

  try {
    const meta = await npmMeta('@fingerprint/agent')
    if (!meta) fail('@fingerprint/agent is not published on npm')
    else {
      const latest = npmLatest(meta)
      const major = Number(latest.split('.')[0])
      if (major === agentMajor) ok(`@fingerprint/agent@${latest} major matches /v${agentMajor}/`)
      else {
        fail(
          `@fingerprint/agent@${latest} is major v${major} but the repo serves the agent from /v${agentMajor}/ ` +
          `(${rel(CDN_HTML)} and the first-party endpoint paths). A new agent major has shipped -- ` +
          `confirm the CDN path and update every /v${agentMajor}/ occurrence.`,
        )
      }
    }
  } catch (e) { warn(`@fingerprint/agent: could not reach npm (${e.message})`) }
}

// ---------------------------------------------------- 4. referenced URLs live

console.log('\n== 4. Docs links and fingerprintjs repo links respond 2xx ==')

const RE_URL = /https?:\/\/[^\s<>"'`)\]]+/g
const urls = new Map() // url -> [file:line]
const noteUrl = (url, site) => {
  const clean = url.replace(/[.,;:·)\]]+$/, '')
  if (!urls.has(clean)) urls.set(clean, [])
  urls.get(clean).push(site)
}

for (const file of walk(ROOT)) {
  if (rel(file).startsWith('.git/') || rel(file).startsWith('.github/')) continue
  if (!/\.(md|mdc)$/.test(file)) continue
  const text = readFileSync(file, 'utf8')
  text.split('\n').forEach((line, i) => {
    const isDocsLine = /^\s*>?\s*Docs:/.test(line) && rel(file).startsWith('skills/')
    for (const u of line.match(RE_URL) ?? []) {
      if (isDocsLine || /^https:\/\/github\.com\/fingerprintjs\//.test(u)) noteUrl(u, `${rel(file)}:${i + 1}`)
    }
  })
}

if (urls.size === 0) warn('no `> Docs:` or github.com/fingerprintjs URLs found -- check 4 did nothing')

// Only 404/410 mean the link actually rotted. A WAF or rate limiter refusing a
// datacenter IP (401/403/429) and 5xx blips are reported but never fail the run.
const ROT = new Set([404, 410])
const UA = 'fingerprintjs-skills-upstream-check (+https://github.com/fingerprintjs/skills)'

async function probe(url) {
  for (const method of ['HEAD', 'GET']) {
    const res = await fetch(url, { method, redirect: 'follow', headers: { 'user-agent': UA } })
    if (res.ok || method === 'GET') return res.status
    if (![403, 405, 429].includes(res.status)) return res.status
  }
}

// small pool so a long link list doesn't take forever
const entries = [...urls].sort()
const CONCURRENCY = 6
for (let i = 0; i < entries.length; i += CONCURRENCY) {
  await Promise.all(entries.slice(i, i + CONCURRENCY).map(async ([url, sites]) => {
    const where = sites.join(', ')
    try {
      const status = await probe(url)
      if (status >= 200 && status < 300) ok(`${status} ${url}  (${where})`)
      else if (ROT.has(status)) fail(`${status} ${url} is gone  (${where})`)
      else warn(`${status} ${url} could not be verified  (${where})`)
    } catch (e) { warn(`unreachable ${url} (${e.cause?.code ?? e.message})  (${where})`) }
  }))
}

// ------------------------------------------------------------------ summary

console.log(`\n== summary: ${failures.length} failure(s), ${warnings.length} warning(s), ${notes.length} note(s) ==`)
for (const f of failures) console.log(`FAIL  ${f}`)
if (failures.length) {
  console.log('\nUpstream drift detected. Nothing here is a version pin -- these are package names, exported symbols, agent path majors and links that no longer match upstream.')
  process.exit(1)
}
console.log('No upstream drift.')
