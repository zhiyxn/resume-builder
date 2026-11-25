import type {
  MagicyanFile,
  PersonalInfoItem,
  ResumeData,
  ResumeEntry,
  ResumeModule,
} from "@/types/resume"
import { sanitizeHtml, sanitizeSvgBody, sanitizeUrl } from "@/lib/html-safety"
import { getModuleEntries, normalizeResumeModules } from "@/lib/resume-modules"

function normalizePersonalInfoItem(item: PersonalInfoItem): PersonalInfoItem {
  return {
    ...item,
    label: item.label ?? "",
    value: item.value ?? "",
    icon: sanitizeSvgBody(item.icon),
  }
}

function normalizeModules(modules: ResumeModule[]): ResumeModule[] {
  return normalizeResumeModules(modules).map((module) => ({
    ...module,
    icon: sanitizeSvgBody(module.icon),
    entries: getModuleEntries(module).map((entry) => ({
      ...entry,
      subtitle: entry.subtitle ?? "",
      timeRange: entry.timeRange ?? "",
      content: entry.contentMode === "rich-text" ? sanitizeHtml(entry.content ?? "") : entry.content ?? "",
      contentMode: entry.contentMode === "rich-text" ? "rich-text" : "markdown",
    })),
  }))
}

export function createNewEntry(): ResumeEntry {
  return {
    id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    subtitle: "",
    timeRange: "",
    content: "",
    contentMode: "markdown",
  }
}

export function createNewModule(order: number, title = "新大块"): ResumeModule {
  return {
    id: `module-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    title,
    content: "",
    icon: "",
    order,
    entries: [createNewEntry()],
  }
}

export function createNewPersonalInfoItem(): PersonalInfoItem {
  return {
    id: `info-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    label: "新标签",
    value: "",
    icon: "",
  }
}

export function createBlankResumeData(): ResumeData {
  const now = new Date().toISOString()

  return {
    title: "我的简历",
    personalInfo: [
      {
        id: `info-${Date.now()}-name`,
        label: "姓名",
        value: "",
        icon: "",
      },
      {
        id: `info-${Date.now()}-email`,
        label: "邮箱",
        value: "",
        icon: "",
      },
      {
        id: `info-${Date.now()}-phone`,
        label: "电话",
        value: "",
        icon: "",
      },
    ],
    avatar: "",
    avatarShape: "circle",
    modules: [createNewModule(0, "自我介绍")],
    createdAt: now,
    updatedAt: now,
  }
}

export function exportToMagicyanFile(resumeData: ResumeData): string {
  const payload: MagicyanFile = {
    version: "1.2.0",
    data: {
      ...resumeData,
      avatar: sanitizeUrl(resumeData.avatar || "", { allowImages: true }),
      avatarShape: resumeData.avatarShape === "square" ? "square" : "circle",
      personalInfo: resumeData.personalInfo.map(normalizePersonalInfoItem),
      modules: normalizeModules(resumeData.modules),
      updatedAt: new Date().toISOString(),
    },
    metadata: {
      exportedAt: new Date().toISOString(),
      appVersion: "1.2.0",
    },
  }

  return JSON.stringify(payload, null, 2)
}

export function importFromMagicyanFile(fileContent: string): ResumeData {
  try {
    if (!fileContent.trim()) {
      throw new Error("文件内容为空")
    }

    const parsed = JSON.parse(fileContent) as MagicyanFile

    if (!parsed || typeof parsed !== "object") {
      throw new Error("无效的文件格式")
    }

    if (!parsed.version) {
      throw new Error("缺少版本信息")
    }

    if (!parsed.data) {
      throw new Error("缺少简历数据")
    }

    const data = parsed.data
    if (!data.title || typeof data.title !== "string") {
      throw new Error("简历标题格式错误")
    }

    if (!Array.isArray(data.personalInfo)) {
      throw new Error("个人信息格式错误")
    }

    if (!Array.isArray(data.modules)) {
      throw new Error("简历模块格式错误")
    }

    for (const item of data.personalInfo) {
      if (!item.id || !item.label || typeof item.value !== "string") {
        throw new Error("个人信息项格式错误")
      }
    }

    for (const module of data.modules) {
      if (!module.id || typeof module.title !== "string" || typeof module.order !== "number") {
        throw new Error("简历模块格式错误")
      }
      if (module.entries !== undefined && (!Array.isArray(module.entries) || module.entries.some((entry) =>
        !entry || typeof entry.id !== "string" || !entry.id || typeof entry.content !== "string" ||
        (entry.subtitle !== undefined && typeof entry.subtitle !== "string") ||
        (entry.timeRange !== undefined && typeof entry.timeRange !== "string") ||
        (entry.contentMode !== undefined && !["markdown", "rich-text"].includes(entry.contentMode)),
      ))) {
        throw new Error("子模块格式错误")
      }
    }

    const now = new Date().toISOString()
    return {
      ...data,
      avatar: sanitizeUrl(data.avatar || "", { allowImages: true }),
      avatarShape: data.avatarShape === "square" ? "square" : "circle",
      personalInfo: data.personalInfo.map(normalizePersonalInfoItem),
      modules: normalizeModules(data.modules),
      createdAt: data.createdAt || now,
      updatedAt: now,
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("文件格式不正确，请确认是有效的 JSON 文件")
    }

    throw error
  }
}

export function downloadFile(content: string, filename: string, mimeType = "application/json") {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function generatePdfFilename(resumeTitle: string): string {
  const timestamp = new Date().toISOString().slice(0, 10)
  const cleanTitle = resumeTitle.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_")
  return `${cleanTitle}_${timestamp}.pdf`
}

export function validateResumeData(data: ResumeData): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data.title?.trim()) {
    errors.push("简历标题不能为空")
  }

  if (!Array.isArray(data.personalInfo)) {
    errors.push("个人信息格式错误")
  } else {
    data.personalInfo.forEach((item, index) => {
      if (!item.id || !item.label?.trim()) {
        errors.push(`个人信息第 ${index + 1} 项格式错误`)
      }
    })
  }

  if (!Array.isArray(data.modules)) {
    errors.push("简历模块格式错误")
  } else if (data.modules.length === 0) {
    errors.push("至少需要添加一个简历模块")
  } else {
    data.modules.forEach((module, index) => {
      if (!module.id || typeof module.title !== "string") {
        errors.push(`简历模块第 ${index + 1} 项格式错误`)
      }
      if (module.entries !== undefined && (!Array.isArray(module.entries) || !module.entries.length)) {
        errors.push(`简历大块「${module.title || `第 ${index + 1} 项`}」至少需要一个子模块`)
      }
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export function getResumeSuggestions(data: ResumeData): string[] {
  const suggestions: string[] = []

  data.personalInfo.forEach((item) => {
    if (item.label?.trim() && !item.value?.trim()) {
      suggestions.push(`个人信息「${item.label}」尚未填写`)
    }
  })

  normalizeResumeModules(data.modules).forEach((module, index) => {
    const entries = getModuleEntries(module)
    if (!module.title?.trim() && !entries.some((entry) => entry.subtitle?.trim())) {
      suggestions.push(`简历大块第 ${index + 1} 项缺少标题或副标题`)
    }
    entries.forEach((entry, entryIndex) => {
      if (!entry.content?.trim()) {
        suggestions.push(`「${module.title || `大块 ${index + 1}`} / ${entry.subtitle || `子模块 ${entryIndex + 1}`}」尚未填写内容`)
      }
    })
  })

  return suggestions
}
