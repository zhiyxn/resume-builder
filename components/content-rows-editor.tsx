"use client"

import { useState } from "react"
import { Icon } from "@iconify/react"
import RichTextEditor from "@/components/rich-text-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createContentRow, resizeContentRow } from "@/lib/content-rows"
import type { ResumeContentRow } from "@/types/resume"

interface ContentRowsEditorProps {
  rows: ResumeContentRow[]
  onChange: (rows: ResumeContentRow[]) => void
}

export default function ContentRowsEditor({
  rows,
  onChange,
}: ContentRowsEditorProps) {
  const updateRow = (id: string, updates: Partial<ResumeContentRow>) =>
    onChange(rows.map((row) => (row.id === id ? { ...row, ...updates } : row)))
  const insertRow = (
    after: number,
    columns: ResumeContentRow["columns"],
    type: ResumeContentRow["type"] = "rich",
  ) => {
    const next = [...rows]
    next.splice(after + 1, 0, createContentRow(columns, type))
    onChange(next)
  }
  const moveRow = (index: number, direction: number) => {
    const next = [...rows]
    const [row] = next.splice(index, 1)
    next.splice(index + direction, 0, row)
    onChange(next)
  }
  return (
    <div className="space-y-3">
      <p className="text-xs leading-5 text-muted-foreground">
        按行组织内容，每行可分成 1–4
        列。点击单元格填写文字，在上方工具栏设置格式。
      </p>
      {rows.map((row, index) => (
        <div
          key={row.id}
          className="group min-w-0 rounded-lg border bg-background"
        >
          <div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 px-2 py-1">
            <span className="mr-auto text-xs text-muted-foreground">
              {row.type === "tags" ? "标签行" : `内容行 ${index + 1}`}
            </span>
            {row.type === "rich" && (
              <select
                aria-label={`第 ${index + 1} 行列数`}
                value={row.columns}
                className="h-7 rounded border bg-background px-1 text-xs"
                onChange={(event) =>
                  updateRow(
                    row.id,
                    resizeContentRow(
                      row,
                      Number(event.target.value) as ResumeContentRow["columns"],
                    ),
                  )
                }
              >
                {[1, 2, 3, 4].map((columns) => (
                  <option key={columns} value={columns}>
                    {columns} 列
                  </option>
                ))}
              </select>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              aria-label={`上移第 ${index + 1} 行`}
              disabled={index === 0}
              onClick={() => moveRow(index, -1)}
            >
              <Icon icon="mdi:arrow-up" className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              aria-label={`下移第 ${index + 1} 行`}
              disabled={index === rows.length - 1}
              onClick={() => moveRow(index, 1)}
            >
              <Icon icon="mdi:arrow-down" className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive"
              aria-label={`删除第 ${index + 1} 行`}
              onClick={() =>
                onChange(rows.filter((item) => item.id !== row.id))
              }
            >
              <Icon icon="mdi:delete-outline" className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs"
              onClick={() => insertRow(index, 1)}
            >
              <Icon icon="mdi:plus" className="h-3.5 w-3.5" />
              下方插入
            </Button>
          </div>
          {row.type === "tags" ? (
            <TagsEditor
              tags={row.tags}
              onChange={(tags) => updateRow(row.id, { tags })}
            />
          ) : (
            <div
              className="grid min-w-0 divide-x"
              style={{
                gridTemplateColumns: `repeat(${row.columns}, minmax(0, 1fr))`,
              }}
            >
              {row.cells.map((cell, cellIndex) => (
                <div key={cell.id} className="min-w-0">
                  <RichTextEditor
                    value={cell.content}
                    label={`第 ${index + 1} 行第 ${cellIndex + 1} 列`}
                    onChange={(content) =>
                      updateRow(row.id, {
                        cells: row.cells.map((item) =>
                          item.id === cell.id ? { ...item, content } : item,
                        ),
                      })
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {rows.length === 0 && (
        <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
          添加内容行或标签行开始排版。
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {([1, 2, 3, 4] as const).map((columns) => (
          <Button
            key={columns}
            size="sm"
            variant="outline"
            className="h-8 gap-1 text-xs"
            onClick={() => insertRow(rows.length - 1, columns)}
          >
            <Icon icon="mdi:plus" className="h-3.5 w-3.5" />
            {columns} 列内容行
          </Button>
        ))}
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1 text-xs"
          onClick={() => insertRow(rows.length - 1, 1, "tags")}
        >
          <Icon icon="mdi:tag-outline" className="h-3.5 w-3.5" />
          标签行
        </Button>
      </div>
    </div>
  )
}

function TagsEditor({
  tags,
  onChange,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
}) {
  const [value, setValue] = useState("")
  const add = () => {
    const text = value.trim()
    if (text && !tags.includes(text) && tags.length < 20) {
      onChange([...tags, text])
      setValue("")
    }
  }
  return (
    <div className="space-y-2 p-3">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, index) => (
          <span
            key={tag}
            className="inline-flex max-w-full items-center gap-1 rounded bg-primary/10 px-2 py-1 text-xs text-primary"
          >
            <span className="break-all">{tag}</span>
            <button
              type="button"
              aria-label={`删除标签 ${tag}`}
              onClick={() => onChange(tags.filter((_, i) => i !== index))}
            >
              <Icon icon="mdi:close" className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          aria-label="新标签"
          maxLength={100}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing) {
              event.preventDefault()
              add()
            }
          }}
          placeholder="输入标签，按回车添加"
          className="h-8 min-w-0 text-xs"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={add}
          disabled={!value.trim() || tags.length >= 20}
        >
          添加
        </Button>
      </div>
    </div>
  )
}
