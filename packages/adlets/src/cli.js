import { readFile } from 'node:fs/promises'
import { lintPath } from './lint.js'
import { validate, SPEC } from './validate.js'

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

const help = (name) => `${name} ${pkg.version}

Usage
  ${name} lint [path] [--strict] [--json]   Check the ad blocks in your built HTML
  ${name} validate <file.json>... [--json]   Check slot and offer files against spec draft ${SPEC}
  ${name} about                              What Adlets is and what this tool sends (nothing)
  ${name} --version | --help

lint looks for elements marked data-adlet, data-ad or data-sponsored, or with a
class such as "ad", "sponsor" or "adlet-card", and checks that each one:
  - shows a visible "Ad" or "Sponsored" label        (error)
  - marks every outbound link rel="sponsored"         (error)
  - reserves its size so the page does not shift      (warning)
--strict exits with code 1 when any error is found, for use in CI.`


const ABOUT = `Adlets: honest, privacy-first ads for indie websites, apps, AI apps and
newsletters, which publishers and advertisers can run from their own AI agents.
IndieAds is its network.

Status: in development. This version checks your own pages and slot files;
it does not serve ads yet.

Privacy: this command reads only the files you point it at. It sends nothing
anywhere, collects no telemetry, runs none of your code and installs nothing.`

export async function run (argv, out = console, name = 'adlets') {
  const HELP = help(name)
  const flags = new Set(argv.filter(a => a.startsWith('-')))
  const args = argv.filter(a => !a.startsWith('-'))
  const [command, ...rest] = args
  const unknown = [...flags].filter(f => !['--strict', '--json', '--help', '-h', '--version', '-v'].includes(f))
  if (unknown.length) {
    out.error(`Unknown option: ${unknown.join(' ')}\n\n${HELP}`)
    return 2
  }
  if (flags.has('--version') || flags.has('-v')) {
    out.log(pkg.version)
    return 0
  }
  if (flags.has('--help') || flags.has('-h') || !command) {
    out.log(HELP)
    return 0
  }
  if (command === 'about') {
    out.log(ABOUT)
    return 0
  }
  if (command === 'lint') return lint(rest[0] ?? '.', flags, out)
  if (command === 'validate') return validateFiles(rest, flags, out)
  out.error(`Unknown command: ${command}\n\n${HELP}`)
  return 2
}

async function lint (target, flags, out) {
  let result
  try {
    result = await lintPath(target)
  } catch (e) {
    out.error(`Cannot read ${target}: ${e.code ?? e.message}`)
    return 2
  }
  const errors = result.findings.filter(f => f.level === 'error').length
  const warnings = result.findings.filter(f => f.level === 'warning').length
  if (flags.has('--json')) {
    out.log(JSON.stringify({ ...result, errors, warnings }, null, 2))
  } else {
    for (const f of result.findings) {
      out.log(`${f.file}:${f.line}  ${f.level.padEnd(7)}  ${f.rule.padEnd(14)}  ${f.where}  ${f.message}`)
    }
    const files = `${result.files} HTML file${result.files === 1 ? '' : 's'}`
    out.log(`${result.findings.length ? '\n' : ''}Checked ${files}${result.truncated ? ' (stopped at the 5,000-file limit)' : ''}: ${result.blocks} ad block${result.blocks === 1 ? '' : 's'}, ${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}.`)
  }
  return flags.has('--strict') && errors > 0 ? 1 : 0
}

async function validateFiles (files, flags, out) {
  if (!files.length) {
    out.error('Name at least one JSON file: adlets validate slot.json')
    return 2
  }
  const report = []
  let failed = false
  for (const file of files) {
    let data
    try {
      data = JSON.parse(await readFile(file, 'utf8'))
    } catch (e) {
      report.push({ file, items: [{ index: null, kind: null, issues: [{ level: 'error', path: '', message: e instanceof SyntaxError ? `not valid JSON: ${e.message}` : `cannot read: ${e.code ?? e.message}` }] }] })
      failed = true
      continue
    }
    const list = Array.isArray(data) ? data : [data]
    const items = list.map((item, index) => ({ index: Array.isArray(data) ? index : null, ...validate(item) }))
    if (items.some(i => i.issues.some(x => x.level === 'error'))) failed = true
    report.push({ file, items })
  }
  if (flags.has('--json')) {
    out.log(JSON.stringify({ spec: SPEC, valid: !failed, files: report }, null, 2))
  } else {
    for (const { file, items } of report) {
      for (const item of items) {
        const name = item.index === null ? file : `${file}[${item.index}]`
        const errs = item.issues.filter(x => x.level === 'error')
        out.log(errs.length ? `${name}: invalid ${item.kind ?? 'object'}` : `${name}: valid ${item.kind} (spec draft ${SPEC})`)
        for (const x of item.issues) out.log(`  ${x.level.padEnd(7)}  ${x.path || '/'}  ${x.message}`)
      }
    }
  }
  return failed ? 1 : 0
}
