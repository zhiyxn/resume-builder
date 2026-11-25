import type { JobIntentionItem, PersonalInfoItem, PersonalInfoSection, ResumeModule as EditorModule } from "@/types/editor"
import type { ResumeData, ResumeEntry, ResumeModule } from "@/types/resume"
import { getEntryRows } from "@/lib/content-rows"
import { getModuleEntries, normalizeResumeModules } from "@/lib/resume-modules"
import { sanitizeHtml, sanitizeSvgBody } from "@/lib/html-safety"

export function toPersonalInfoSection(data: ResumeData): PersonalInfoSection {
  return {
    personalInfo: data.personalInfo.map((item, order) => ({
      id: item.id, label: item.label, icon: sanitizeSvgBody(item.icon), order,
      value: { content: item.value, type: item.type, title: item.linkTitle },
    })),
    avatarShape: data.avatarShape,
    avatarType: data.avatarType,
    showPersonalInfoLabels: data.personalInfoLayout?.showLabels !== false,
    layout: { mode: data.personalInfoLayout?.mode || "grid", itemsPerRow: data.personalInfoLayout?.columns || 2 },
  }
}

export function fromPersonalInfoSection(section: PersonalInfoSection): Partial<ResumeData> {
  return {
    personalInfo: [...section.personalInfo].sort((a, b) => a.order - b.order).map((item) => ({
      id: item.id, label: item.label, icon: sanitizeSvgBody(item.icon),
      value: item.value.content, type: item.value.type, linkTitle: item.value.title,
    })),
    avatarShape: section.avatarShape,
    avatarType: section.avatarType,
    personalInfoLayout: {
      mode: section.layout.mode, columns: section.layout.itemsPerRow || 2,
      showLabels: section.showPersonalInfoLabels !== false,
    },
  }
}

export function toJobIntentionSection(data: ResumeData) {
  return {
    enabled: data.jobIntention?.enabled ?? false,
    items: (data.jobIntention?.items || []).map((item, order) => ({ ...item, type: item.type || "custom" as const, order })),
  }
}

export function toEditorModules(modules: ResumeModule[]): EditorModule[] {
  return normalizeResumeModules(modules).map((module) => ({
    id: module.id, title: module.title, icon: sanitizeSvgBody(module.icon), order: module.order,
    rows: getModuleEntries(module).flatMap((entry) => getEntryRows(entry).map((row) => ({
      id: row.id, entryId: entry.id, type: row.type, columns: row.columns,
      tags: [...row.tags], order: 0,
      elements: row.cells.map((cell, columnIndex) => ({ ...cell, content: sanitizeHtml(cell.content), columnIndex })),
    }))).map((row, order) => ({ ...row, order })),
  }))
}

function rowSignature(rows: NonNullable<ResumeEntry["rows"]>) {
  return JSON.stringify(rows.map(({ id, type, columns, cells, tags }) => ({
    id, type, columns, tags,
    cells: cells.map(cell => ({ id: cell.id, content: sanitizeHtml(cell.content) })),
  })))
}

// Keep unchanged legacy entries intact; only edited entries become free-layout rows.
// This also preserves grouping when rows are inserted between two existing entries.
export function fromEditorModules(modules: EditorModule[], previous: ResumeModule[]): ResumeModule[] {
  const originals = new Map(normalizeResumeModules(previous).map((module) => [module.id, module]))
  return [...modules].sort((a, b) => a.order - b.order).map((module, order) => {
    const original = originals.get(module.id)
    const originalEntries = new Map((original ? getModuleEntries(original) : []).map((entry) => [entry.id, entry]))
    const groups: { id: string; rows: NonNullable<ResumeEntry["rows"]> }[] = []
    for (const row of [...module.rows].sort((a, b) => a.order - b.order)) {
      const id = row.entryId || `${module.id}-entry`
      let group = groups.at(-1)
      if (!group || group.id !== id) {
        group = { id, rows: [] }
        groups.push(group)
      }
      group.rows.push({
        id: row.id, type: row.type === "tags" ? "tags" : "rich", columns: row.columns,
        cells: [...row.elements].sort((a, b) => a.columnIndex - b.columnIndex).map(({ id, content }) => ({ id, content: sanitizeHtml(content) })),
        tags: row.tags || [],
      })
    }
    const entries = groups.map(({ id, rows }) => {
      const entry = originalEntries.get(id)
      if (entry && rowSignature(getEntryRows(entry)) === rowSignature(rows)) return entry
      return { id, content: "", contentMode: "rich-text" as const, rows }
    })
    return {
      id: module.id, title: module.title, icon: sanitizeSvgBody(module.icon), order, content: "",
      entries: entries.length ? entries : [{ id: `${module.id}-entry`, content: "", rows: [] }],
    }
  })
}

export function createNewPersonalInfoItem(): PersonalInfoItem {
  return { id: crypto.randomUUID(), label: "新标签", value: { content: "", type: "text" }, icon: "", order: 0 }
}

export function createNewJobIntentionItem(type: JobIntentionItem["type"], order: number): JobIntentionItem {
  const labels = { workYears: "工作经验", position: "求职意向", city: "目标城市", salary: "期望薪资", custom: "自定义" }
  return { id: crypto.randomUUID(), label: labels[type], value: "", order, type }
}
