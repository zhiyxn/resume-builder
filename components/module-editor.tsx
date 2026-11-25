"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { DragDropContext, Draggable, Droppable, type DropResult, type DraggableProvidedDragHandleProps } from "@hello-pangea/dnd"
import { Icon } from "@iconify/react"
import IconPicker from "@/components/icon-picker"
import RichTextEditor from "@/components/rich-text-editor"
import { sanitizeSvgBody } from "@/lib/html-safety"
import { renderModuleContent } from "@/lib/resume-content"
import { getModuleEntries, normalizeResumeModules } from "@/lib/resume-modules"
import { createNewEntry, createNewModule } from "@/lib/resume-utils"
import type { ResumeEntry, ResumeModule } from "@/types/resume"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false })

interface ModuleEditorProps {
  modules: ResumeModule[]
  onUpdate: (modules: ResumeModule[]) => void
}

export default function ModuleEditor({ modules, onUpdate }: ModuleEditorProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const orderedModules = normalizeResumeModules(modules)

  const addModule = (title = "新大块") => {
    const module = createNewModule(orderedModules.length, title)
    onUpdate([...orderedModules, module])
    setExpandedModules((previous) => new Set([...previous, module.id]))
  }

  const updateModule = (id: string, updates: Partial<ResumeModule>) => {
    onUpdate(orderedModules.map((module) => module.id === id ? { ...module, ...updates } : module))
  }

  const removeModule = (id: string) => {
    onUpdate(orderedModules.filter((module) => module.id !== id).map((module, order) => ({ ...module, order })))
    setExpandedModules((previous) => {
      const next = new Set(previous)
      next.delete(id)
      return next
    })
  }

  const toggleModule = (id: string) => {
    setExpandedModules((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDragEnd = ({ source, destination }: DropResult) => {
    if (!destination || source.index === destination.index) return
    const next = [...orderedModules]
    const [moved] = next.splice(source.index, 1)
    next.splice(destination.index, 0, moved)
    onUpdate(next.map((module, order) => ({ ...module, order })))
  }

  return (
    <Card className="section-card">
      <div className="section-header">
        <div className="flex items-center gap-2">
          <Icon icon="mdi:view-module" className="h-5 w-5 text-primary" />
          <h2 className="section-title">简历大块</h2>
        </div>
        <Button size="sm" variant="outline" onClick={() => addModule()} className="gap-2 bg-transparent">
          <Icon icon="mdi:plus" className="h-4 w-4" />添加大块
        </Button>
      </div>
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">每个大块统一显示标题，可在块内添加多条经历。</p>
        <div className="flex flex-wrap gap-2">
          {["教育经历", "工作经历", "项目经历"].map((title) => (
            <Button key={title} size="sm" variant="outline" onClick={() => addModule(title)} className="h-8 gap-1 bg-transparent text-xs">
              <Icon icon="mdi:plus" className="h-3.5 w-3.5" />{title}
            </Button>
          ))}
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="modules-list">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
              {orderedModules.map((module, index) => (
                <Draggable key={module.id} draggableId={module.id} index={index}>
                  {(draggableProvided, snapshot) => (
                    <div ref={draggableProvided.innerRef} {...draggableProvided.draggableProps}
                      style={{ ...draggableProvided.draggableProps.style, opacity: snapshot.isDragging ? 0.82 : 1 }}>
                      <ModuleGroupEditor module={module} isExpanded={expandedModules.has(module.id)}
                        dragHandleProps={draggableProvided.dragHandleProps} onToggle={() => toggleModule(module.id)}
                        onUpdate={(updates) => updateModule(module.id, updates)} onRemove={() => removeModule(module.id)} />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              {orderedModules.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">选择上方的经历类型，或添加自定义大块。</div>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </Card>
  )
}

interface ModuleGroupEditorProps {
  module: ResumeModule
  isExpanded: boolean
  dragHandleProps: DraggableProvidedDragHandleProps | null
  onToggle: () => void
  onUpdate: (updates: Partial<ResumeModule>) => void
  onRemove: () => void
}

function ModuleGroupEditor({ module, isExpanded, dragHandleProps, onToggle, onUpdate, onRemove }: ModuleGroupEditorProps) {
  const iconBody = sanitizeSvgBody(module.icon)
  const entries = getModuleEntries(module)
  const updateEntry = (id: string, updates: Partial<ResumeEntry>) => {
    onUpdate({ entries: entries.map((entry) => entry.id === id ? { ...entry, ...updates } : entry) })
  }
  const moveEntry = (index: number, offset: number) => {
    const destination = index + offset
    if (destination < 0 || destination >= entries.length) return
    const next = [...entries]
    const [entry] = next.splice(index, 1)
    next.splice(destination, 0, entry)
    onUpdate({ entries: next })
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="rounded-lg border bg-muted/30">
        <div className="flex items-center gap-1 px-2">
          <button type="button" {...dragHandleProps} aria-label={`拖动排序：${module.title || "未命名大块"}`} className="cursor-grab rounded p-2 text-muted-foreground active:cursor-grabbing">
            <Icon icon="mdi:drag" className="h-4 w-4" />
          </button>
          <CollapsibleTrigger asChild>
            <button type="button" className="flex min-w-0 flex-1 items-center gap-2 py-3 pr-2 text-left">
              {iconBody && <svg width={16} height={16} className="shrink-0" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: iconBody }} />}
              <span className="min-w-0 flex-1 truncate font-medium">{module.title || "未命名大块"}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{entries.length} 个子模块</span>
              <Icon icon={isExpanded ? "mdi:chevron-up" : "mdi:chevron-down"} className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <div className="space-y-4 border-t p-3 pt-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
              <div className="min-w-0 space-y-2">
                <Label htmlFor={`group-title-${module.id}`} className="form-label">大块标题</Label>
                <Input id={`group-title-${module.id}`} value={module.title} maxLength={200}
                  onChange={(event) => onUpdate({ title: event.target.value })} placeholder="例如：教育经历、工作经历、项目经历" />
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2 bg-transparent">
                    {iconBody ? <svg width={16} height={16} viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: iconBody }} /> : <Icon icon="mdi:shape-outline" className="h-4 w-4" />}
                    图标
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>选择大块图标</DialogTitle></DialogHeader>
                  <IconPicker selectedIcon={module.icon} onSelect={(icon) => onUpdate({ icon })} />
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-3">
              {entries.map((entry, index) => (
                <EntryEditor key={entry.id} entry={entry} index={index} count={entries.length}
                  onUpdate={(updates) => updateEntry(entry.id, updates)} onMove={(offset) => moveEntry(index, offset)}
                  onRemove={() => onUpdate({ entries: entries.filter((item) => item.id !== entry.id) })} />
              ))}
              {entries.length === 0 && <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">还没有子模块，添加一条经历开始填写。</p>}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button size="sm" variant="outline" className="gap-2 bg-transparent" onClick={() => onUpdate({ entries: [...entries, createNewEntry()] })}>
                <Icon icon="mdi:plus" className="h-4 w-4" />添加子模块
              </Button>
              <Button size="sm" variant="ghost" onClick={onRemove} className="gap-1 text-destructive hover:text-destructive">
                <Icon icon="mdi:delete-outline" className="h-4 w-4" />删除大块
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

interface EntryEditorProps {
  entry: ResumeEntry
  index: number
  count: number
  onUpdate: (updates: Partial<ResumeEntry>) => void
  onMove: (offset: number) => void
  onRemove: () => void
}

function EntryEditor({ entry, index, count, onUpdate, onMove, onRemove }: EntryEditorProps) {
  const [expanded, setExpanded] = useState(index === 0 || (!entry.subtitle && !entry.content))
  const contentMode = entry.contentMode === "rich-text" ? "rich-text" : "markdown"
  return (
    <Collapsible open={expanded} onOpenChange={setExpanded} className="rounded-lg border bg-background">
      <div className="flex items-center gap-1 px-2">
        <CollapsibleTrigger asChild>
          <button type="button" className="flex min-w-0 flex-1 items-center gap-2 py-3 text-left text-sm">
            <Icon icon={expanded ? "mdi:chevron-down" : "mdi:chevron-right"} className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate font-medium">{entry.subtitle || `子模块 ${index + 1}`}</span>
          </button>
        </CollapsibleTrigger>
        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" disabled={index === 0} onClick={() => onMove(-1)} aria-label="上移子模块"><Icon icon="mdi:arrow-up" className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" disabled={index === count - 1} onClick={() => onMove(1)} aria-label="下移子模块"><Icon icon="mdi:arrow-down" className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-destructive hover:text-destructive" onClick={onRemove} aria-label="删除子模块"><Icon icon="mdi:delete-outline" className="h-4 w-4" /></Button>
      </div>
      <CollapsibleContent>
        <div className="space-y-4 border-t p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="form-group">
              <Label htmlFor={`entry-subtitle-${entry.id}`} className="form-label">副标题</Label>
              <Input id={`entry-subtitle-${entry.id}`} value={entry.subtitle || ""} maxLength={500}
                onChange={(event) => onUpdate({ subtitle: event.target.value })} placeholder="学校 / 专业、公司 / 职位、项目名称" />
            </div>
            <div className="form-group">
              <Label htmlFor={`entry-time-${entry.id}`} className="form-label">时间范围</Label>
              <Input id={`entry-time-${entry.id}`} value={entry.timeRange || ""} maxLength={200}
                onChange={(event) => onUpdate({ timeRange: event.target.value })} placeholder="例如：2020.09 - 2024.06" />
            </div>
          </div>
          <div className="form-group space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="form-label">详细内容</span>
              <div className="inline-flex rounded-md border bg-background p-1">
                <Button type="button" variant={contentMode === "markdown" ? "default" : "ghost"} size="sm" className="h-8"
                  onClick={() => onUpdate({ contentMode: "markdown" })}>Markdown</Button>
                <Button type="button" variant={contentMode === "rich-text" ? "default" : "ghost"} size="sm" className="h-8"
                  onClick={() => { if (contentMode !== "rich-text") onUpdate({ contentMode: "rich-text", content: renderModuleContent(entry) }) }}>富文本</Button>
              </div>
            </div>
            {contentMode === "markdown" ? (
              <MDEditor value={entry.content || ""} onChange={(value = "") => onUpdate({ content: value })} height={240} data-color-mode="light" />
            ) : (
              <RichTextEditor value={entry.content || ""} onChange={(value) => onUpdate({ content: value })} placeholder="填写这条经历的详细内容。" />
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
