"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { buildResumeHtml } from "@/lib/export-html"
import type { ResumeData } from "@/types/resume"

interface HtmlResumePreviewProps {
  resumeData: ResumeData
  className?: string
  embedded?: boolean
}

export default function HtmlResumePreview({ resumeData, className, embedded = false }: HtmlResumePreviewProps) {
  const html = useMemo(() => buildResumeHtml(resumeData, { embedded }), [resumeData, embedded])
  const container = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const observer = useRef<ResizeObserver | null>(null)
  const pageWidth = 210 * 96 / 25.4
  const pageHeight = 297 * 96 / 25.4
  const [scale, setScale] = useState(1)
  const [height, setHeight] = useState(pageHeight)
  useEffect(() => {
    if (!embedded || !container.current) return
    const element = container.current
    const resize = new ResizeObserver(() => setScale(Math.min(1, Math.max(1, element.clientWidth - 32) / pageWidth)))
    resize.observe(element)
    return () => resize.disconnect()
  }, [embedded, pageWidth])
  useEffect(() => () => observer.current?.disconnect(), [])
  const measure = useCallback(() => {
    observer.current?.disconnect()
    const page = frame.current?.contentDocument?.querySelector(".page")
    if (!page) return
    observer.current = new ResizeObserver(() => setHeight(Math.max(pageHeight, page.scrollHeight)))
    observer.current.observe(page)
    setHeight(Math.max(pageHeight, page.scrollHeight))
  }, [pageHeight])

  if (embedded) return <div ref={container} className={className ?? "h-full w-full overflow-auto p-4"}>
    <div className="mx-auto bg-white shadow-lg" style={{ width: pageWidth * scale, height: height * scale }}>
      <iframe ref={frame} title="Resume HTML Preview" srcDoc={html} sandbox="allow-same-origin" onLoad={measure}
        className="block origin-top-left border-0 bg-white" style={{ width: pageWidth, height, transform: `scale(${scale})` }} />
    </div>
  </div>

  return (
    <iframe
      title="Resume HTML Preview"
      srcDoc={html}
      sandbox=""
      className={className ?? "block h-full w-full border-0 bg-white"}
    />
  )
}
