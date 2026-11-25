import type { ResumeEntry, ResumeModule } from "@/types/resume"

export function getModuleEntries(module: ResumeModule): ResumeEntry[] {
  return module.entries ?? [{
    id: `${module.id}-entry`,
    subtitle: module.subtitle ?? "",
    timeRange: module.timeRange ?? "",
    content: module.content ?? "",
    contentMode: module.contentMode === "rich-text" ? "rich-text" : "markdown",
  }]
}

// Older resumes used adjacent untitled modules as continuations of a section.
// Convert once at the boundary; explicit groups always keep their own identity.
export function normalizeResumeModules(modules: ResumeModule[]): ResumeModule[] {
  const groups: ResumeModule[] = []
  let previousWasLegacy = false
  for (const module of [...modules].sort((a, b) => a.order - b.order)) {
    const legacy = module.entries === undefined
    const previous = groups.at(-1)
    if (legacy && previousWasLegacy && previous && (!module.title.trim() || module.title.trim() === previous.title.trim()) && !module.icon) {
      previous.entries!.push(...getModuleEntries(module))
    } else {
      groups.push({
        id: module.id,
        title: module.title,
        icon: module.icon,
        order: groups.length,
        content: "",
        entries: getModuleEntries(module).map((entry) => ({ ...entry })),
      })
    }
    previousWasLegacy = legacy
  }
  return groups
}
