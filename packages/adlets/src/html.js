// A small, forgiving HTML scanner: enough structure to find sponsored blocks,
// their text, links and size hints. It never executes or fetches anything.

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'])
const TOKEN = /<!--[\s\S]*?-->|<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>|<\/?([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>|([^<]+)|</g
const ATTR = /([^\s=/"'>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g

export function parseAttrs (raw) {
  const attrs = {}
  for (const m of raw.matchAll(ATTR)) {
    attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? ''
  }
  return attrs
}

export function parse (html) {
  const root = { tag: '#root', attrs: {}, children: [], line: 1 }
  const stack = [root]
  let line = 1
  let last = 0
  for (const m of html.matchAll(TOKEN)) {
    line += countNewlines(html, last, m.index)
    last = m.index
    const top = stack.at(-1)
    if (m[4] !== undefined) {
      top.children.push({ text: m[4] })
      continue
    }
    if (m[2] === undefined) continue // comment, script, style, template or a stray '<'
    const tag = m[2].toLowerCase()
    if (m[0].startsWith('</')) {
      const at = findOpen(stack, tag)
      if (at > 0) stack.length = at
      continue
    }
    const raw = m[3] ?? ''
    const node = { tag, attrs: parseAttrs(raw.replace(/\/\s*$/, '')), children: [], line }
    top.children.push(node)
    if (!VOID.has(tag) && !/\/\s*$/.test(raw)) stack.push(node)
  }
  return root
}

function countNewlines (s, from, to) {
  let n = 0
  for (let i = from; i < to; i++) if (s.charCodeAt(i) === 10) n++
  return n
}

function findOpen (stack, tag) {
  for (let i = stack.length - 1; i > 0; i--) if (stack.at(i).tag === tag) return i
  return -1
}

export function textOf (node) {
  if (node.text !== undefined) return decode(node.text)
  const own = [node.attrs?.['aria-label'], node.tag === 'img' ? node.attrs?.alt : undefined].filter(Boolean)
  return [...own, ...node.children.map(textOf)].join(' ')
}

export function * walk (node) {
  for (const child of node.children ?? []) {
    if (child.text !== undefined) continue
    yield child
    yield * walk(child)
  }
}

function decode (s) {
  return s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&middot;|&#183;/g, '·').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}
