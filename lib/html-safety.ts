export const RESUME_FONT_FAMILIES = [
  "Noto Sans SC", "Microsoft YaHei", "SimSun", "SimHei", "KaiTi", "FangSong",
  "PingFang SC", "Heiti SC", "STSong", "STKaiti", "STFangsong", "Arial",
  "Times New Roman", "Calibri", "Georgia", "Verdana", "Courier New", "Consolas",
  "Monaco", "sans-serif", "serif", "monospace",
] as const

const HTML_ALLOWED_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
])

const HTML_VOID_TAGS = new Set(["br", "hr", "img"])

const SVG_ALLOWED_TAGS = new Set(["circle", "ellipse", "g", "line", "path", "polygon", "polyline", "rect"])

const SVG_ALLOWED_ATTRS = new Set([
  "cx",
  "cy",
  "d",
  "fill",
  "height",
  "points",
  "r",
  "rx",
  "ry",
  "stroke",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-width",
  "viewbox",
  "width",
  "x",
  "x1",
  "x2",
  "y",
  "y1",
  "y2",
])

const SAFE_COLOR_PATTERN = /^(currentColor|none|#[0-9a-fA-F]{3,8}|rgb\([\d\s,.%]+\)|rgba\([\d\s,.%]+\))$/
const SAFE_NUMBER_PATTERN = /^-?\d+(\.\d+)?(%|px|em|rem|pt)?$/
const SAFE_POINTS_PATTERN = /^[\d\s,.-]+$/
const SAFE_PATH_PATTERN = /^[MmZzLlHhVvCcSsQqTtAa0-9,.\-\s]+$/

function stripDangerousBlocks(value: string) {
  return value
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*(script|style|iframe|object|embed|link|meta|base)[\s\S]*?>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|link|meta|base)[^>]*\/?\s*>/gi, "")
}

function parseAttributes(rawAttributes: string) {
  const attributes: Array<{ name: string; value: string }> = []
  const attributePattern = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  let match: RegExpExecArray | null

  while ((match = attributePattern.exec(rawAttributes)) !== null) {
    attributes.push({
      name: match[1].toLowerCase(),
      value: decodeAttribute(match[2] ?? match[3] ?? match[4] ?? ""),
    })
  }

  return attributes
}

function decodeAttribute(value: string): string {
  const entities: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", colon: ":", Tab: "\t", NewLine: "\n" }
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt|colon|Tab|NewLine);/gi, (entity, name: string) => {
    if (!name.startsWith("#")) return entities[name] ?? entity
    const point = name[1].toLowerCase() === "x" ? Number.parseInt(name.slice(2), 16) : Number.parseInt(name.slice(1), 10)
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : ""
  })
}

function escapeAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

export function isSafeUrl(value: string, options: { allowImages?: boolean } = {}) {
  const trimmed = value.trim()
  if (!trimmed) {
    return false
  }

  if (trimmed.startsWith("#") || trimmed.startsWith("/")) {
    return true
  }

  if (options.allowImages && /^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(trimmed)) {
    return true
  }

  try {
    const parsed = new URL(trimmed)
    return ["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)
  } catch {
    return false
  }
}

export function sanitizeUrl(value: string, options: { allowImages?: boolean } = {}) {
  return isSafeUrl(value, options) ? value.trim() : ""
}

function sanitizeHtmlAttributes(tagName: string, rawAttributes: string) {
  const attributes = parseAttributes(rawAttributes)
  const safeAttributes: string[] = []

  for (const { name, value } of attributes) {
    if (name.startsWith("on") || name === "srcdoc") {
      continue
    }

    if (name === "style") {
      const style = sanitizeTextStyle(value)
      if (style) safeAttributes.push(`style="${escapeAttribute(style)}"`)
      continue
    }

    if (tagName === "a" && name === "href") {
      const href = sanitizeUrl(value)
      if (href) {
        safeAttributes.push(`href="${escapeAttribute(href)}"`)
        safeAttributes.push('rel="noreferrer noopener"')
      }
      continue
    }

    if (tagName === "img" && name === "src") {
      const src = sanitizeUrl(value, { allowImages: true })
      if (src) {
        safeAttributes.push(`src="${escapeAttribute(src)}"`)
      }
      continue
    }

    if (["alt", "title"].includes(name)) {
      safeAttributes.push(`${name}="${escapeAttribute(value)}"`)
      continue
    }

    if (["colspan", "rowspan"].includes(name) && /^\d{1,2}$/.test(value)) {
      safeAttributes.push(`${name}="${value}"`)
    }
  }

  return safeAttributes.length ? ` ${safeAttributes.join(" ")}` : ""
}

// Keep only text formatting used by the editor; layout, URLs and positioning are excluded.
export function sanitizeTextStyle(value: string): string {
  return value.split(";").flatMap((declaration) => {
    const separator = declaration.indexOf(":")
    const name = declaration.slice(0, separator).trim().toLowerCase()
    const content = declaration.slice(separator + 1).trim().replace(/&quot;|&#34;|&#39;/g, "").replace(/["']/g, "")
    const allowed =
      (name === "text-align" && /^(left|center|right|justify)$/.test(content)) ||
      (["color", "background-color"].includes(name) && /^(#[a-fA-F0-9]{3,8}|rgba?\([\d\s,.%]+\))$/.test(content)) ||
      (name === "font-size" && /^(?:[8-9]|[1-6]\d|7[0-2])(?:\.\d+)?(?:px|pt)$/.test(content)) ||
      (name === "font-family" && (RESUME_FONT_FAMILIES as readonly string[]).includes(content)) ||
      (name === "line-height" && /^(1(?:\.\d+)?|2(?:\.\d+)?|3)$/.test(content))
    return allowed ? [`${name}: ${content}`] : []
  }).join("; ")
}

export function sanitizeHtml(value: string) {
  if (!value) {
    return ""
  }

  return stripDangerousBlocks(value).replace(/<\/?\s*([a-zA-Z][\w:-]*)([^>]*)>/g, (match, tagName, rawAttributes) => {
    const tag = tagName.toLowerCase()
    const isClosingTag = /^<\s*\//.test(match)

    if (!HTML_ALLOWED_TAGS.has(tag)) {
      return ""
    }

    if (isClosingTag) {
      return HTML_VOID_TAGS.has(tag) ? "" : `</${tag}>`
    }

    const attributes = sanitizeHtmlAttributes(tag, rawAttributes)
    return HTML_VOID_TAGS.has(tag) ? `<${tag}${attributes}>` : `<${tag}${attributes}>`
  })
}

function isSafeSvgAttribute(name: string, value: string) {
  if (["fill", "stroke"].includes(name)) {
    return SAFE_COLOR_PATTERN.test(value)
  }

  if (["d"].includes(name)) {
    return SAFE_PATH_PATTERN.test(value)
  }

  if (["points"].includes(name)) {
    return SAFE_POINTS_PATTERN.test(value)
  }

  if (["viewbox"].includes(name)) {
    return /^[\d\s,.-]+$/.test(value)
  }

  return SAFE_NUMBER_PATTERN.test(value)
}

export function sanitizeSvgBody(value?: string) {
  if (!value) {
    return ""
  }

  let safeSvgBody = ""
  const tagPattern = /<\/?\s*([a-zA-Z][\w:-]*)([^>]*)>/g
  let match: RegExpExecArray | null

  while ((match = tagPattern.exec(stripDangerousBlocks(value))) !== null) {
    const [rawTag, tagName, rawAttributes] = match
    const tag = tagName.toLowerCase()
    const isClosingTag = /^<\s*\//.test(rawTag)

    if (!SVG_ALLOWED_TAGS.has(tag)) {
      continue
    }

    if (isClosingTag) {
      safeSvgBody += `</${tag}>`
      continue
    }

    const attributes = parseAttributes(rawAttributes)
      .filter(({ name, value: attributeValue }) => {
        const normalizedName = name.toLowerCase()
        return SVG_ALLOWED_ATTRS.has(normalizedName) && isSafeSvgAttribute(normalizedName, attributeValue)
      })
      .map(({ name, value: attributeValue }) => `${name}="${escapeAttribute(attributeValue)}"`)
      .join(" ")

    safeSvgBody += attributes ? `<${tag} ${attributes}>` : `<${tag}>`
  }

  return safeSvgBody
}
