"use client"

import { PlusSquare, Tags, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function FloatingActionBar({ onAddRow, onAddTagsRow, onDelete }: {
  onAddRow: (columns: 1 | 2 | 3 | 4) => void
  onAddTagsRow?: () => void
  onDelete?: () => void
}) {
  return (
    <div role="toolbar" aria-label="内容行操作"
      className="row-action-bar absolute right-0 top-full z-10 flex overflow-hidden rounded shadow-md opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100 focus-within:opacity-100">
      {([1, 2, 3, 4] as const).map((columns) => (
        <Button key={columns} size="sm" title={`添加 ${columns} 列行`} aria-label={`添加 ${columns} 列行`}
          className="h-6 rounded-none border-r border-black/20 bg-teal-500 px-1.5 text-white hover:bg-teal-600"
          onClick={() => onAddRow(columns)}>
          <PlusSquare className="h-3 w-3" /><span className="text-xs">{columns}</span>
        </Button>
      ))}
      {onAddTagsRow && <Button size="sm" title="添加标签行" aria-label="添加标签行" onClick={onAddTagsRow}
        className="h-6 rounded-none border-r border-black/20 bg-teal-500 px-1.5 text-white hover:bg-teal-600">
        <Tags className="h-3 w-3" />
      </Button>}
      {onDelete && <Button size="sm" title="删除行" aria-label="删除行" onClick={onDelete}
        className="h-6 rounded-none bg-rose-500 px-1.5 text-white hover:bg-rose-600">
        <Trash2 className="h-3 w-3" />
      </Button>}
    </div>
  )
}
