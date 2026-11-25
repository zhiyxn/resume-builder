"use client"

import { useEffect } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TextAlign from "@tiptap/extension-text-align"
import { TextStyleKit } from "@tiptap/extension-text-style"
import { sanitizeHtml } from "@/lib/html-safety"
import { useRichTextContext } from "@/components/rich-text-context"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "输入内容…",
  label = "富文本内容",
}: RichTextEditorProps) {
  const context = useRichTextContext()
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        trailingNode: false,
        link: { openOnClick: false },
      }),
      TextStyleKit,
      TextAlign.configure({ types: ["paragraph", "heading"] }),
    ],
    content: sanitizeHtml(value),
    editorProps: {
      attributes: {
        class: "resume-rich-editor",
        role: "textbox",
        "aria-label": label,
        "aria-multiline": "true",
        "data-placeholder": placeholder,
      },
      transformPastedHTML: sanitizeHtml,
    },
    onFocus: ({ editor }) => context?.activate(editor),
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  useEffect(() => {
    if (editor && editor.getHTML() !== value)
      editor.commands.setContent(sanitizeHtml(value), { emitUpdate: false })
  }, [editor, value])

  useEffect(() => {
    if (!editor) return
    return () => {
      context?.deactivate(editor)
    }
  }, [editor, context?.deactivate])

  return <EditorContent editor={editor} className="min-w-0" />
}
