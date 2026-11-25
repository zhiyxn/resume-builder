"use client"

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import ColorPicker from "./color-picker"

const ColorPickerContext = createContext<{
  openColorPicker: (color: string, onSave: (color: string) => void) => void
} | null>(null)

export function useColorPicker() {
  const context = useContext(ColorPickerContext)
  if (!context) throw new Error("ColorPickerProvider is required")
  return context
}

export function ColorPickerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [color, setColor] = useState("#000000")
  const onSave = useRef<((color: string) => void) | null>(null)
  const openColorPicker = useCallback((initial: string, save: (color: string) => void) => {
    // Tiptap may return rgb() after HTML parsing; the picker expects hex.
    const rgb = initial.match(/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/)
    setColor(rgb ? `#${rgb.slice(1).map((channel) => Number(channel).toString(16).padStart(2, "0")).join("")}` : initial)
    onSave.current = save
    setOpen(true)
  }, [])
  return <ColorPickerContext.Provider value={{ openColorPicker }}>
    {children}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="color-picker-modal w-fit max-w-[calc(100%-2rem)] p-4" onCloseAutoFocus={(event) => event.preventDefault()}>
        <DialogHeader><DialogTitle>自定义文字颜色</DialogTitle><DialogDescription>选择颜色后应用到选中的文字。</DialogDescription></DialogHeader>
        <ColorPicker initialColor={color} onSave={(value) => { onSave.current?.(value); setOpen(false) }} onCancel={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  </ColorPickerContext.Provider>
}
