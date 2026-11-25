import type { ResumeContentRow, ResumeEntry } from "@/types/resume"
import { escapeHtml, renderModuleContent } from "@/lib/resume-content"
import { sanitizeHtml } from "@/lib/html-safety"

const newId = () => crypto.randomUUID()

export function createContentRow(
  columns: ResumeContentRow["columns"] = 1,
  type: ResumeContentRow["type"] = "rich",
): ResumeContentRow {
  return {
    id: newId(),
    type,
    columns: type === "tags" ? 1 : columns,
    cells:
      type === "tags"
        ? []
        : Array.from({ length: columns }, () => ({ id: newId(), content: "" })),
    tags: [],
  }
}

export function getEntryRows(entry: ResumeEntry): ResumeContentRow[] {
  if (entry.rows) return entry.rows
  const rows: ResumeContentRow[] = []
  if (entry.subtitle || entry.timeRange) {
    rows.push({
      id: `${entry.id}-heading`,
      type: "rich",
      columns: 2,
      tags: [],
      cells: [
        {
          id: `${entry.id}-heading-name`,
          content: `<p><strong>${escapeHtml(entry.subtitle || "")}</strong></p>`,
        },
        {
          id: `${entry.id}-heading-time`,
          content: `<p style="text-align: right">${escapeHtml(entry.timeRange || "")}</p>`,
        },
      ],
    })
  }
  if (entry.content || !rows.length) {
    rows.push({
      id: `${entry.id}-body`,
      type: "rich",
      columns: 1,
      tags: [],
      cells: [
        { id: `${entry.id}-body-text`, content: renderModuleContent(entry) },
      ],
    })
  }
  return rows
}

// Shrinking a row joins removed cells into the last retained cell, preserving text.
export function resizeContentRow(
  row: ResumeContentRow,
  columns: ResumeContentRow["columns"],
): ResumeContentRow {
  const cells = row.cells.slice(0, columns).map((cell) => ({ ...cell }))
  while (cells.length < columns) cells.push({ id: newId(), content: "" })
  if (row.cells.length > columns)
    cells[columns - 1].content += row.cells
      .slice(columns)
      .map((cell) => cell.content)
      .join("")
  return { ...row, columns, cells }
}

export function entryLabel(entry: ResumeEntry, index: number): string {
  if (entry.rows) {
    const text = entry.rows
      .flatMap((row) =>
        row.type === "tags"
          ? row.tags
          : row.cells.map((cell) =>
              cell.content.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " "),
            ),
      )
      .join(" ")
      .trim()
    return text ? text.slice(0, 40) : `子模块 ${index + 1}`
  }
  return entry.subtitle || `子模块 ${index + 1}`
}

export function renderContentRows(rows: ResumeContentRow[]): string {
  return rows
    .map((row) =>
      row.type === "tags"
        ? `<div class="resume-tags">${row.tags.map((tag) => `<span class="resume-tag">${escapeHtml(tag)}</span>`).join("")}</div>`
        : `<div class="resume-content-row" style="grid-template-columns:repeat(${row.columns},minmax(0,1fr))">${row.cells.map((cell) => `<div class="module-content resume-cell">${sanitizeHtml(cell.content)}</div>`).join("")}</div>`,
    )
    .join("")
}
