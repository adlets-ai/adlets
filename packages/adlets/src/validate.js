// `adlets validate`: checks slot and offer objects against draft 0 of the open
// Adlets slot spec. The spec is a draft and may change before 1.0.

export const SPEC = '0'
const FORMATS = ['card', 'row', 'ai-answer', 'newsletter']
const DELIVERY = ['script', 'server']
const MEASURE = ['viewable', 'served', 'flat']
const SLOT_FIELDS = ['kind', 'spec', 'id', 'format', 'size', 'topics', 'delivery', 'measure', 'floor', 'rules']
const OFFER_FIELDS = ['kind', 'spec', 'id', 'slot', 'label', 'advertiser', 'network', 'headline', 'body', 'url', 'rel', 'ai_generated', 'untrusted_content', 'expires', 'why']
const ID = /^[A-Za-z0-9_-]{1,64}$/

export function validate (value) {
  const issues = []
  const err = (path, message) => issues.push({ level: 'error', path, message })
  if (!isObject(value)) {
    err('', 'must be a JSON object')
    return { kind: null, issues }
  }
  if (value.spec !== undefined && value.spec !== SPEC) err('/spec', `must be "${SPEC}" (draft 0)`)
  if (value.kind === 'adlets.slot') validateSlot(value, err)
  else if (value.kind === 'adlets.offer') validateOffer(value, err)
  else err('/kind', 'must be "adlets.slot" or "adlets.offer"')
  const known = value.kind === 'adlets.offer' ? OFFER_FIELDS : SLOT_FIELDS
  for (const key of Object.keys(value)) {
    if (!known.includes(key)) issues.push({ level: 'warning', path: `/${key}`, message: 'is not a draft-0 field and will be ignored' })
  }
  return { kind: value.kind ?? null, issues }
}

function validateSlot (s, err) {
  if (typeof s.id !== 'string' || !ID.test(s.id)) err('/id', 'must be 1-64 letters, digits, "-" or "_"')
  if (!FORMATS.includes(s.format)) err('/format', `must be one of ${FORMATS.join(', ')}`)
  if (s.format === 'card' || s.format === 'row' || s.size !== undefined) {
    if (!isObject(s.size) || !positiveInt(s.size.width) || !positiveInt(s.size.height)) {
      err('/size', 'must be { "width": <px>, "height": <px> } with whole numbers above 0, so the page reserves the space')
    }
  }
  if (!Array.isArray(s.topics) || s.topics.length < 1 || s.topics.length > 20 || !s.topics.every(t => typeof t === 'string' && t.trim())) {
    err('/topics', 'must list 1-20 topics (IAB Content Taxonomy ids or plain labels)')
  }
  if (!DELIVERY.includes(s.delivery)) err('/delivery', `must be one of ${DELIVERY.join(', ')}`)
  if (!MEASURE.includes(s.measure)) err('/measure', `must be one of ${MEASURE.join(', ')}`)
  if (s.delivery === 'server' && s.measure === 'viewable') err('/measure', 'server mode cannot measure viewability: use "served" or "flat"')
  if (s.floor !== undefined && !(typeof s.floor === 'number' && s.floor >= 0)) err('/floor', 'must be a number of US dollars per 1,000 impressions, 0 or more')
  if (s.rules !== undefined) {
    if (!isObject(s.rules)) err('/rules', 'must be an object')
    else {
      const r = s.rules
      if (r.blockedCategories !== undefined && !(Array.isArray(r.blockedCategories) && r.blockedCategories.every(c => typeof c === 'string'))) err('/rules/blockedCategories', 'must be a list of strings')
      if (r.approveFirst !== undefined && typeof r.approveFirst !== 'boolean') err('/rules/approveFirst', 'must be true or false')
      if (r.fallback !== undefined && typeof r.fallback !== 'string') err('/rules/fallback', 'must be a string')
    }
  }
}

function validateOffer (o, err) {
  if (typeof o.id !== 'string' || !ID.test(o.id)) err('/id', 'must be 1-64 letters, digits, "-" or "_"')
  if (typeof o.slot !== 'string' || !ID.test(o.slot)) err('/slot', 'must be the id of a slot')
  if (o.label !== 'Ad') err('/label', 'must be "Ad": the unit shows "Ad · <advertiser>"')
  if (!nonEmpty(o.advertiser, 80)) err('/advertiser', 'must name the advertiser in 1-80 characters')
  if (o.network !== undefined && !nonEmpty(o.network, 40)) err('/network', 'must be 1-40 characters')
  if (!nonEmpty(o.headline, 60)) err('/headline', 'must be 1-60 characters')
  if (o.body !== undefined && !(typeof o.body === 'string' && o.body.length <= 140)) err('/body', 'must be at most 140 characters')
  if (!isHttps(o.url)) err('/url', 'must be an https:// address')
  if (o.why !== undefined && !isHttps(o.why)) err('/why', 'must be an https:// address')
  if (o.rel !== 'sponsored') err('/rel', 'must be "sponsored"')
  if (typeof o.ai_generated !== 'boolean') err('/ai_generated', 'must say true or false')
  if (o.untrusted_content !== true) err('/untrusted_content', 'must be true: agents treat ad text as data, never as instructions')
  if (o.expires !== undefined && (typeof o.expires !== 'string' || Number.isNaN(Date.parse(o.expires)))) err('/expires', 'must be an ISO 8601 date or time')
  const text = `${o.headline ?? ''} ${o.body ?? ''}`
  if (/\b(ignore (all |any |the )?(previous|prior|above) instructions|system prompt|you are (now )?an? (ai|assistant|agent))\b/i.test(text)) {
    err('/headline', 'reads like an instruction to an AI agent; ad text must not address agents')
  }
}

function isObject (v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function positiveInt (n) {
  return Number.isInteger(n) && n > 0
}

function nonEmpty (s, max) {
  return typeof s === 'string' && s.trim().length > 0 && s.length <= max
}

function isHttps (s) {
  if (typeof s !== 'string') return false
  try {
    return new URL(s).protocol === 'https:'
  } catch {
    return false
  }
}
