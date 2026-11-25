import { z } from "zod"
import { escapeHtml } from "@/lib/resume-content"
import { sanitizeHtml, sanitizeSvgBody, sanitizeUrl } from "@/lib/html-safety"
import { jobIntentionSchema } from "@/lib/content-schema"
import type { ResumeData } from "@/types/resume"

const id = z.string().min(1).max(200)
const order = z.number().int().min(0).max(1000).default(0)
const columns = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
const upstreamSchema = z.object({
  title: z.string().max(200),
  centerTitle: z.boolean().optional(),
  personalInfoSection: z.object({
    personalInfo: z.array(z.object({
      id, label: z.string().max(100), order,
      icon: z.string().max(20000).optional(),
      value: z.object({ content: z.string().max(2000), type: z.enum(["text", "link"]).optional(), title: z.string().max(500).optional() }),
    })).max(50),
    layout: z.object({ mode: z.enum(["inline", "grid"]), itemsPerRow: z.number().int().min(1).max(6).optional() }),
    showPersonalInfoLabels: z.boolean().optional(),
    avatarShape: z.enum(["circle", "square"]).optional(),
    avatarType: z.enum(["default", "idPhoto"]).optional(),
  }),
  jobIntentionSection: z.object({ enabled: z.boolean(), items: z.array(z.object({
    id, order, label: z.string().max(100), value: z.string().max(500),
    type: z.enum(["workYears", "position", "city", "salary", "custom"]).optional(),
    salaryRange: z.object({ min: z.number().int().positive().optional(), max: z.number().int().positive().optional() }).optional(),
  })).max(20) }).optional(),
  modules: z.array(z.object({
    id, title: z.string().max(200), icon: z.string().max(20000).optional(), order,
    rows: z.array(z.object({
      id, order, columns, type: z.enum(["rich", "tags"]).default("rich"),
      tags: z.array(z.string().min(1).max(100)).max(20).optional(),
      elements: z.array(z.object({ id, columnIndex: z.number().int().min(0).max(3), content: z.unknown() })).max(4),
    }).refine(row => row.type === "tags"
      ? row.columns === 1 && row.elements.length === 0
      : row.elements.length === row.columns && new Set(row.elements.map(element => element.columnIndex)).size === row.columns && row.elements.every(element => element.columnIndex < row.columns), "Invalid upstream row layout")).max(100),
  })).max(100),
  avatar: z.string().max(4 * 1024 * 1024).optional(),
  createdAt: z.iso.datetime().optional(),
  updatedAt: z.iso.datetime().optional(),
})

const nodeSchema = z.object({
  type: z.string(), text: z.string().max(200000).optional(),
  attrs: z.record(z.string(), z.unknown()).optional(),
  content: z.array(z.unknown()).max(10000).optional(),
  marks: z.array(z.object({ type: z.string(), attrs: z.record(z.string(), z.unknown()).optional() })).max(20).optional(),
})

// A small, DOM-independent importer for upstream Tiptap JSON. All attributes still
// pass through the same HTML allowlist used by cloud writes and PDF rendering.
function renderNode(value: unknown, budget: { count: number }, depth = 0): string {
  if (depth > 40 || ++budget.count > 50000) throw new Error("富文本内容过于复杂")
  const node = nodeSchema.parse(value)
  if (node.type === "text") {
    let text = escapeHtml(node.text || "")
    for (const mark of node.marks || []) {
      const tags: Record<string, string> = { bold: "strong", italic: "em", underline: "u", strike: "s", code: "code" }
      if (tags[mark.type]) text = `<${tags[mark.type]}>${text}</${tags[mark.type]}>`
      else if (mark.type === "textStyle") {
        const attrs = mark.attrs || {}
        const style = [["fontSize", "font-size"], ["fontFamily", "font-family"], ["color", "color"], ["backgroundColor", "background-color"], ["lineHeight", "line-height"]]
          .filter(([key]) => typeof attrs[key] === "string").map(([key, name]) => `${name}: ${attrs[key]}`).join("; ")
        text = `<span style="${escapeHtml(style)}">${text}</span>`
      } else if (mark.type === "link") text = `<a href="${escapeHtml(String(mark.attrs?.href || ""))}">${text}</a>`
      else throw new Error(`暂不支持的文字格式：${mark.type}`)
    }
    return text
  }
  const content = (node.content || []).map(child => renderNode(child, budget, depth + 1)).join("")
  if (node.type === "doc") return content
  if (node.type === "hardBreak") return "<br>"
  if (node.type === "horizontalRule") return "<hr>"
  const tags: Record<string, string> = { paragraph: "p", bulletList: "ul", orderedList: "ol", listItem: "li", blockquote: "blockquote", codeBlock: "pre" }
  const tag = node.type === "heading" ? `h${Math.max(1, Math.min(6, Number(node.attrs?.level) || 1))}` : tags[node.type]
  if (!tag) throw new Error(`暂不支持的内容类型：${node.type}`)
  const alignment = typeof node.attrs?.textAlign === "string" ? ` style="text-align: ${escapeHtml(node.attrs.textAlign)}"` : ""
  return `<${tag}${alignment}>${content}</${tag}>`
}

export function importUpstreamResume(value: unknown): ResumeData {
  const data = upstreamSchema.parse(value)
  const section = data.personalInfoSection
  const now = new Date().toISOString()
  const budget = { count: 0 }
  return {
    title: data.title, centerTitle: data.centerTitle,
    avatar: sanitizeUrl(data.avatar || "", { allowImages: true }),
    avatarShape: section.avatarShape, avatarType: section.avatarType,
    personalInfo: [...section.personalInfo].sort((a, b) => a.order - b.order).map(item => ({
      id: item.id, label: item.label, value: item.value.content,
      type: item.value.type, linkTitle: item.value.title, icon: sanitizeSvgBody(item.icon),
    })),
    personalInfoLayout: { mode: section.layout.mode, columns: (section.layout.itemsPerRow || 2) as 1 | 2 | 3 | 4 | 5 | 6, showLabels: section.showPersonalInfoLabels !== false },
    ...(data.jobIntentionSection ? { jobIntention: jobIntentionSchema.parse({
      enabled: data.jobIntentionSection.enabled,
      items: [...data.jobIntentionSection.items].sort((a, b) => a.order - b.order),
    }) } : {}),
    modules: [...data.modules].sort((a, b) => a.order - b.order).map((module, order) => ({
      id: module.id, title: module.title, icon: sanitizeSvgBody(module.icon), order, content: "",
      entries: [{ id: `${module.id}-entry`, content: "", contentMode: "rich-text", rows: [...module.rows].sort((a, b) => a.order - b.order).map(row => ({
        id: row.id, type: row.type, columns: row.columns, tags: row.tags || [],
        cells: [...row.elements].sort((a, b) => a.columnIndex - b.columnIndex).map(element => ({
          id: element.id, content: sanitizeHtml(renderNode(element.content, budget)),
        })),
      })) }],
    })),
    createdAt: data.createdAt || now, updatedAt: data.updatedAt || now,
  }
}
