"use client"

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"
import type { Editor } from "@tiptap/react"

const RichTextContext = createContext<{
  editor: Editor | null
  activate: (editor: Editor | null) => void
  deactivate: (editor: Editor) => void
} | null>(null)

export function RichTextProvider({ children }: { children: ReactNode }) {
  const [editor, activate] = useState<Editor | null>(null)
  const deactivate = useCallback(
    (closed: Editor) =>
      activate((current) => (current === closed ? null : current)),
    [],
  )
  return (
    <RichTextContext.Provider value={{ editor, activate, deactivate }}>
      {children}
    </RichTextContext.Provider>
  )
}

export const useRichTextContext = () => useContext(RichTextContext)
