"use client"

import { useEffect } from "react"
import { Extension } from "@tiptap/core"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { TextStyleKit } from "@tiptap/extension-text-style"
import TextAlign from "@tiptap/extension-text-align"
import { Plugin } from "@tiptap/pm/state"
import { sanitizeHtml } from "@/lib/html-safety"
import type { ModuleContentElement } from "@/types/editor"
import { useToolbarManager } from "./rich-text-toolbar-manager"

const PlainTextPaste = Extension.create({
  name: "plainTextPaste",
  addProseMirrorPlugins() {
    const editor = this.editor
    return [new Plugin({ props: { handlePaste(_, event) {
      const clipboard = event.clipboardData
      const text = clipboard?.getData("text/plain") || ""
      if (/<(p|br|div|ul|ol|li)\b/i.test(clipboard?.getData("text/html") || "") || !/\r|\n/.test(text)) return false
      event.preventDefault()
      editor.chain().focus().insertContent(text.replace(/\r\n?/g, "\n").split("\n").map((line) => ({
        type: "paragraph", ...(line ? { content: [{ type: "text", text: line }] } : {}),
      }))).run()
      return true
    } } })]
  },
})

export default function RichTextInput({ element, onChange, placeholder = "输入内容…" }: {
  element: ModuleContentElement
  onChange: (updates: Partial<ModuleContentElement>) => void
  placeholder?: string
}) {
  const { registerEditor, unregisterEditor } = useToolbarManager()
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ trailingNode: false, dropcursor: false, link: { openOnClick: false } }),
      TextStyleKit, PlainTextPaste, TextAlign.configure({ types: ["paragraph", "heading"] }),
    ],
    content: sanitizeHtml(element.content),
    editorProps: {
      attributes: {
        class: "rt-editor min-h-[40px] px-3 py-2 border border-dashed border-teal-200 focus-within:border-teal-300",
        role: "textbox", "aria-label": "内容单元格", "aria-multiline": "true", "data-placeholder": placeholder,
      },
      transformPastedHTML: sanitizeHtml,
    },
    onUpdate: ({ editor }) => onChange({ content: sanitizeHtml(editor.getHTML()) }),
  })
  useEffect(() => {
    if (!editor) return
    const cleanup = registerEditor(editor)
    return () => { cleanup?.(); unregisterEditor(editor) }
  }, [editor, registerEditor, unregisterEditor])
  useEffect(() => {
    if (editor && sanitizeHtml(editor.getHTML()) !== sanitizeHtml(element.content))
      editor.commands.setContent(sanitizeHtml(element.content), { emitUpdate: false })
  }, [editor, element.content])
  return <EditorContent editor={editor} className="min-w-0" />
}
