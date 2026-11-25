"use client"

import { useEffect, useReducer, useState } from "react"
import { Icon } from "@iconify/react"
import { useRichTextContext } from "@/components/rich-text-context"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { sanitizeUrl } from "@/lib/html-safety"

export default function RichTextToolbar() {
  const editor = useRichTextContext()?.editor
  const [, refresh] = useReducer((value) => value + 1, 0)
  const [linkOpen, setLinkOpen] = useState(false)
  const [href, setHref] = useState("")
  const [linkError, setLinkError] = useState("")
  const available = editor && !editor.isDestroyed ? editor : null
  const selection = available?.state.selection
  const [linkSelection, setLinkSelection] = useState<{
    from: number
    to: number
  } | null>(null)
  useEffect(() => {
    if (!editor) return
    const update = () => refresh()
    editor.on("transaction", update)
    return () => {
      editor.off("transaction", update)
    }
  }, [editor])
  const buttons = [
    {
      label: "加粗",
      icon: "mdi:format-bold",
      active: available?.isActive("bold"),
      run: () => available?.chain().focus().toggleBold().run(),
    },
    {
      label: "斜体",
      icon: "mdi:format-italic",
      active: available?.isActive("italic"),
      run: () => available?.chain().focus().toggleItalic().run(),
    },
    {
      label: "下划线",
      icon: "mdi:format-underline",
      active: available?.isActive("underline"),
      run: () => available?.chain().focus().toggleUnderline().run(),
    },
    {
      label: "删除线",
      icon: "mdi:format-strikethrough",
      active: available?.isActive("strike"),
      run: () => available?.chain().focus().toggleStrike().run(),
    },
    ...(["left", "center", "right", "justify"] as const).map(
      (alignment, index) => ({
        label: ["左对齐", "居中", "右对齐", "两端对齐"][index],
        icon: `mdi:format-align-${alignment}`,
        active: available?.isActive({ textAlign: alignment }),
        run: () => available?.chain().focus().setTextAlign(alignment).run(),
      }),
    ),
    {
      label: "无序列表",
      icon: "mdi:format-list-bulleted",
      active: available?.isActive("bulletList"),
      run: () => available?.chain().focus().toggleBulletList().run(),
    },
    {
      label: "有序列表",
      icon: "mdi:format-list-numbered",
      active: available?.isActive("orderedList"),
      run: () => available?.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "设置链接",
      icon: "mdi:link",
      active: available?.isActive("link"),
      run: () => {
        setHref(available?.getAttributes("link").href || "")
        setLinkError("")
        setLinkSelection(
          selection ? { from: selection.from, to: selection.to } : null,
        )
        setLinkOpen(true)
      },
    },
    {
      label: "移除链接",
      icon: "mdi:link-off",
      run: () => available?.chain().focus().unsetLink().run(),
    },
    {
      label: "清除格式",
      icon: "mdi:format-clear",
      run: () =>
        available
          ?.chain()
          .focus()
          .unsetAllMarks()
          .clearNodes()
          .unsetTextAlign()
          .run(),
    },
    {
      label: "撤销",
      icon: "mdi:undo",
      run: () => available?.chain().focus().undo().run(),
    },
    {
      label: "重做",
      icon: "mdi:redo",
      run: () => available?.chain().focus().redo().run(),
    },
  ]
  return (
    <>
      <div
        role="toolbar"
        aria-label="文字格式"
        className="sticky top-0 z-20 space-y-2 rounded-lg border bg-background/95 p-2 shadow-sm backdrop-blur"
      >
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="字体"
            disabled={!available}
            value={
              available?.getAttributes("textStyle").fontFamily || "Noto Sans SC"
            }
            className="h-8 min-w-0 rounded border bg-background px-2 text-xs disabled:opacity-50"
            onChange={(event) =>
              available?.chain().focus().setFontFamily(event.target.value).run()
            }
          >
            <option value="Noto Sans SC">默认字体</option>
            <option value="Arial">Arial</option>
            <option value="SimSun">宋体</option>
            <option value="serif">衬线体</option>
            <option value="monospace">等宽字体</option>
          </select>
          <select
            aria-label="字号"
            disabled={!available}
            value={available?.getAttributes("textStyle").fontSize || "14px"}
            className="h-8 rounded border bg-background px-2 text-xs disabled:opacity-50"
            onChange={(event) =>
              available?.chain().focus().setFontSize(event.target.value).run()
            }
          >
            {[10, 12, 14, 16, 18, 20, 24, 28, 32, 36].map((size) => (
              <option key={size} value={`${size}px`}>
                {size}px
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-xs">
            颜色
            <input
              type="color"
              aria-label="文字颜色"
              disabled={!available}
              className="h-7 w-7 rounded border p-0.5"
              onChange={(event) =>
                available?.chain().focus().setColor(event.target.value).run()
              }
            />
          </label>
          <select
            aria-label="行距"
            disabled={!available}
            value={available?.getAttributes("textStyle").lineHeight || "1.7"}
            className="h-8 rounded border bg-background px-1 text-xs disabled:opacity-50"
            onChange={(event) =>
              available?.chain().focus().setLineHeight(event.target.value).run()
            }
          >
            {[1, 1.25, 1.5, 1.7, 2, 2.5, 3].map((value) => (
              <option key={value} value={value}>
                {value} 倍行距
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-0.5">
          {buttons.map((button) => (
            <Button
              key={button.label}
              size="icon"
              variant={button.active ? "secondary" : "ghost"}
              className="h-8 w-8"
              aria-label={button.label}
              title={button.label}
              aria-pressed={Boolean(button.active)}
              disabled={!available}
              onMouseDown={(event) => event.preventDefault()}
              onClick={button.run}
            >
              <Icon icon={button.icon} className="h-4 w-4" />
            </Button>
          ))}
        </div>
        {!available && (
          <p className="text-xs text-muted-foreground">
            点击内容单元格开始编辑，选中文字后设置格式。
          </p>
        )}
      </div>
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            available?.commands.focus()
          }}
        >
          <DialogHeader>
            <DialogTitle>设置文字链接</DialogTitle>
            <DialogDescription>链接会应用到当前选中的文字。</DialogDescription>
          </DialogHeader>
          <Label htmlFor="resume-text-link">链接地址</Label>
          <Input
            id="resume-text-link"
            value={href}
            onChange={(event) => setHref(event.target.value)}
            placeholder="https://example.com"
          />
          {linkError && <p className="text-sm text-destructive">{linkError}</p>}
          <Button
            onClick={() => {
              const url = sanitizeUrl(href)
              if (!url) {
                setLinkError("请输入有效的链接地址。")
                return
              }
              if (available && linkSelection)
                available
                  .chain()
                  .focus()
                  .setTextSelection(linkSelection)
                  .extendMarkRange("link")
                  .setLink({ href: url })
                  .run()
              setLinkOpen(false)
            }}
          >
            应用链接
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
