"use client"

import { useMemo } from "react"
import PersonalInfoEditor from "./personal-info-editor"
import JobIntentionEditor from "./job-intention-editor"
import ModuleEditor from "./module-editor"
import { ToolbarProvider } from "./rich-text-toolbar-manager"
import { ColorPickerProvider } from "./color-picker-manager"
import { fromEditorModules, fromPersonalInfoSection, toEditorModules, toJobIntentionSection, toPersonalInfoSection } from "@/lib/editor-adapter"
import type { ResumeData } from "@/types/resume"

export default function ResumeFields({ data, onChange }: { data: ResumeData; onChange: (updates: Partial<ResumeData>) => void }) {
  const modules = useMemo(() => toEditorModules(data.modules), [data.modules])
  return (
    <ColorPickerProvider>
      <ToolbarProvider>
        <JobIntentionEditor jobIntentionSection={toJobIntentionSection(data)} onUpdate={(section) => onChange({
          jobIntention: { enabled: section.enabled, items: [...section.items].sort((a, b) => a.order - b.order).map(({ order, ...item }) => item) },
        })} />
        <PersonalInfoEditor personalInfoSection={toPersonalInfoSection(data)} avatar={data.avatar}
          onUpdate={(section, avatar) => onChange({ ...fromPersonalInfoSection(section), ...(avatar !== undefined ? { avatar } : {}) })} />
        <ModuleEditor modules={modules} onUpdate={(updated) => onChange({ modules: fromEditorModules(updated, data.modules) })} />
      </ToolbarProvider>
    </ColorPickerProvider>
  )
}
