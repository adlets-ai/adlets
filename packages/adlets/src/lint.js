// `adlets lint`: checks that every ad block on your own built pages is honestly
// labelled, marks its outbound links rel="sponsored" and reserves its size.

import { readdir, readFile, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { parse, textOf, walk } from './html.js'

const MARKER_ATTRS = ['data-adlet', 'data-adlets-slot', 'data-ad', 'data-ad-slot', 'data-sponsored']
const CLASS_TOKEN = /^(ad|ads|advert|advertisement|adlet|adlets|sponsor|sponsored|sponsorship)([-_].*)?$/i
const LABEL = /\b(ad|ads|advertisement|sponsored)\b/i
const WEAK = /\b(promoted|partner|featured)\b/i
const SKIP_DIRS = new Set(['node_modules', '.git'])
const MAX_FILES = 5000

export function isAdBlock (node) {
  if (MARKER_ATTRS.some(a => a in node.attrs)) return true
  const classes = (node.attrs.class ?? '').split(/\s+/).filter(Boolean)
  return classes.some(c => CLASS_TOKEN.test(c))
}

export function lintHtml (html, file = '') {
  const findings = []
  let blocks = 0
  const visit = node => {
    for (const child of node.children) {
      if (child.text !== undefined) continue
      if (isAdBlock(child)) {
        blocks++
        checkBlock(child, file, findings)
        continue
      }
      if (child.tag === 'a' && relHas(child, 'sponsored')) {
        findings.push({ level: 'info', rule: 'label-nearby', file, line: child.line, where: describe(child), message: 'Sponsored link outside a marked ad block: make sure a visible "Ad" or "Sponsored" label sits next to it.' })
      }
      visit(child)
    }
  }
  visit(parse(html))
  return { blocks, findings }
}

function checkBlock (node, file, findings) {
  const where = describe(node)
  const text = textOf(node)
  if (!LABEL.test(text)) {
    findings.push({
      level: 'error',
      rule: 'label',
      file,
      line: node.line,
      where,
      message: WEAK.test(text)
        ? 'Labelled only "Promoted", "Partner" or "Featured": say "Ad" or "Sponsored" (FTC native advertising guide).'
        : 'No visible "Ad" or "Sponsored" label inside this ad block.'
    })
  }
  for (const a of walk(node)) {
    if (a.tag !== 'a') continue
    const href = a.attrs.href ?? ''
    if (/^(https?:)?\/\//i.test(href) && !relHas(a, 'sponsored')) {
      findings.push({ level: 'error', rule: 'rel-sponsored', file, line: a.line, where, message: `Outbound link ${short(href)} in an ad block lacks rel="sponsored".` })
    }
  }
  if (!hasReservedSize(node)) {
    findings.push({ level: 'warning', rule: 'reserved-size', file, line: node.line, where, message: 'No reserved size found (height, min-height or aspect-ratio, or width and height on its image or frame), so the page may shift when the ad loads. Sizes set in an external stylesheet are not checked.' })
  }
}

function relHas (node, token) {
  return (node.attrs.rel ?? '').toLowerCase().split(/\s+/).includes(token)
}

function hasReservedSize (node) {
  if (sized(node)) return true
  for (const child of walk(node)) {
    if (['img', 'iframe', 'video', 'svg'].includes(child.tag) && sized(child)) return true
  }
  return false
}

function sized (node) {
  const style = node.attrs.style ?? ''
  if (/(^|;|\s)(min-height|height|aspect-ratio)\s*:/i.test(style)) return true
  if ('data-adlet-size' in node.attrs) return true
  return 'width' in node.attrs && 'height' in node.attrs
}

function describe (node) {
  const id = node.attrs.id ? `#${node.attrs.id}` : ''
  const cls = (node.attrs.class ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(c => `.${c}`).join('')
  return `<${node.tag}${id}${cls}>`
}

function short (href) {
  return href.length > 60 ? `${href.slice(0, 57)}...` : href
}

export async function lintPath (target) {
  const files = []
  const info = await stat(target)
  if (info.isDirectory()) await collect(target, files)
  else files.push(target)
  const findings = []
  let blocks = 0
  for (const file of files) {
    const result = lintHtml(await readFile(file, 'utf8'), file)
    blocks += result.blocks
    findings.push(...result.findings)
  }
  return { files: files.length, blocks, findings, truncated: files.length >= MAX_FILES }
}

async function collect (dir, files) {
  const entries = await readdir(dir, { withFileTypes: true })
  entries.sort((a, b) => a.name.localeCompare(b.name))
  for (const entry of entries) {
    if (files.length >= MAX_FILES) return
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) await collect(path, files)
    } else if (['.html', '.htm'].includes(extname(entry.name).toLowerCase())) {
      files.push(path)
    }
  }
}
