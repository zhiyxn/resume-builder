import { z } from "zod"
import { sanitizeHtml, sanitizeSvgBody, sanitizeUrl } from "@/lib/html-safety"
import { normalizeResumeModules } from "@/lib/resume-modules"
import { contentRowsSchema, personalInfoLayoutSchema, jobIntentionSchema } from "@/lib/content-schema"

const entryFields = {
  id: z.string().min(1).max(200),
  subtitle: z.string().max(500).optional(),
  timeRange: z.string().max(200).optional(),
  content: z.string().max(200000).default(""),
  contentMode: z.enum(["markdown", "rich-text"]).optional(),
  rows: contentRowsSchema.optional(),
}
const entrySchema = z.object(entryFields).transform((entry) => ({
  ...entry,
  content: entry.contentMode === "rich-text" ? sanitizeHtml(entry.content) : entry.content,
}))

// Cloud drafts may be incomplete. Export validation is applied separately.
export const resumeSchema = z.object({
  title: z.string().max(200),
  personalInfo: z.array(z.object({
    id: z.string().min(1).max(200),
    label: z.string().max(100),
    value: z.string().max(2000),
    icon: z.string().max(20000).optional().transform(sanitizeSvgBody),
    type: z.enum(["text", "link"]).optional(),
    linkTitle: z.string().max(500).optional(),
  })).max(50),
  avatar: z.string().max(4 * 1024 * 1024).optional().transform((v) => sanitizeUrl(v || "", { allowImages: true })),
  avatarShape: z.enum(["square", "circle"]).optional(),
  avatarType: z.enum(["default", "idPhoto"]).optional(),
  centerTitle: z.boolean().optional(),
  personalInfoLayout: personalInfoLayoutSchema.optional(),
  jobIntention: jobIntentionSchema.optional(),
  modules: z.array(z.object({
    ...entryFields,
    title: z.string().max(200),
    icon: z.string().max(20000).optional().transform(sanitizeSvgBody),
    order: z.number().int().min(0).max(1000),
    entries: z.array(entrySchema).max(100).optional(),
  }).transform((module) => ({
    ...module,
    content: module.contentMode === "rich-text" ? sanitizeHtml(module.content) : module.content,
  }))).max(100).transform(normalizeResumeModules),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export const resumeIdSchema = z.uuid()
export const saveResumeSchema = z.object({ data: resumeSchema, version: z.number().int().positive() })
