export interface PersonalInfoItem {
  label: string
  value: string
  icon?: string
  id: string
  type?: "text" | "link"
  linkTitle?: string
}

export interface PersonalInfoLayout {
  mode: "inline" | "grid"
  columns: 1 | 2 | 3 | 4 | 5 | 6
  showLabels: boolean
}

export interface JobIntentionItem {
  id: string
  label: string
  value: string
  type?: "workYears" | "position" | "city" | "salary" | "custom"
  salaryRange?: { min?: number; max?: number }
}

export interface ResumeContentRow {
  id: string
  type: "rich" | "tags"
  columns: 1 | 2 | 3 | 4
  cells: { id: string; content: string }[]
  tags: string[]
}

export type ModuleContentMode = "markdown" | "rich-text"

export interface ResumeEntry {
  id: string
  subtitle?: string
  timeRange?: string
  content: string
  contentMode?: ModuleContentMode
  rows?: ResumeContentRow[]
}

export interface ResumeModule extends ResumeEntry {
  title: string
  icon?: string
  order: number
  // Absent on legacy files, whose entry fields lived directly on the module.
  entries?: ResumeEntry[]
}

export interface ResumeData {
  title: string
  personalInfo: PersonalInfoItem[]
  modules: ResumeModule[]
  avatar?: string
  avatarShape?: "square" | "circle"
  avatarType?: "default" | "idPhoto"
  centerTitle?: boolean
  personalInfoLayout?: PersonalInfoLayout
  jobIntention?: { enabled: boolean; items: JobIntentionItem[] }
  createdAt: string
  updatedAt: string
}

export interface MagicyanFile {
  version: string
  data: ResumeData
  metadata: {
    exportedAt: string
    appVersion: string
  }
}

export interface EditorState {
  resumeData: ResumeData
  isEditing: boolean
  selectedModuleId?: string
  showPreview: boolean
}
