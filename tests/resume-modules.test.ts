import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { buildResumeHtml } from "../lib/export-html"
import { normalizeResumeModules } from "../lib/resume-modules"
import { createBlankResumeData, createNewModule, exportToMagicyanFile, importFromMagicyanFile, validateResumeData } from "../lib/resume-utils"
import { resumeSchema } from "../lib/server/resume-schema"
import type { ResumeData, ResumeModule } from "../types/resume"

const legacyModules: ResumeModule[] = [
  { id: "work-2", title: "", subtitle: "乙公司", timeRange: "2020 - 2022", content: "第二条", order: 3 },
  { id: "education", title: "教育经历", subtitle: "某大学", content: "计算机专业", order: 0 },
  { id: "work-1", title: "工作经历", subtitle: "甲公司", content: "第一条", order: 1 },
  { id: "work-repeat", title: "工作经历", subtitle: "丙公司", content: "同标题条目", order: 4 },
  { id: "projects", title: "项目经历", subtitle: "某项目", content: "项目描述", order: 5 },
]

function groupedResume(): ResumeData {
  return {
    ...createBlankResumeData(),
    modules: [{
      ...createNewModule(0, "工作经历"),
      entries: [
        { id: "entry-a", subtitle: "甲公司 | 工程师", timeRange: "2023 - 至今", content: "**主要贡献 A**", contentMode: "markdown" },
        { id: "entry-b", subtitle: "乙公司 | 开发", timeRange: "2020 - 2023", content: "<p><strong>主要贡献 B</strong></p>", contentMode: "rich-text" },
      ],
    }],
  }
}

test("旧数据按显示顺序归组，续项和重复标题归入同一大块且不修改输入", () => {
  const original = structuredClone(legacyModules)
  const groups = normalizeResumeModules(legacyModules)
  assert.deepEqual(groups.map((group) => group.title), ["教育经历", "工作经历", "项目经历"])
  assert.deepEqual(groups[1].entries?.map((entry) => entry.subtitle), ["甲公司", "乙公司", "丙公司"])
  assert.deepEqual(groups.map((group) => group.order), [0, 1, 2])
  assert.deepEqual(legacyModules, original)
  assert.deepEqual(normalizeResumeModules(groups), groups)
})

test("独立图标、首个无标题模块和显式分组保持边界", () => {
  const first = { ...legacyModules[0], order: 0 }
  const iconGroup = { ...legacyModules[0], id: "independent", icon: "<path d=\"M0 0\"/>", order: 1 }
  const explicit = createNewModule(2, "工作经历")
  const sameTitle = createNewModule(3, "工作经历")
  const groups = normalizeResumeModules([first, iconGroup, explicit, sameTitle])
  assert.equal(groups.length, 4)
  assert.deepEqual(groups[0].entries?.[0].content, first.content)
  assert.equal(groups[1].icon, iconGroup.icon)
  assert.equal(groups[2].id, explicit.id)
  assert.equal(groups[3].id, sameTitle.id)
})

test("示例包含五个大块，经历使用自由排版并可通过服务端校验", () => {
  const data = importFromMagicyanFile(readFileSync(new URL("../public/demo.magicyan", import.meta.url), "utf8"))
  assert.deepEqual(data.modules.map((group) => group.entries?.length), [1, 1, 1, 2, 2])
  assert.ok(data.modules.every(group => group.entries?.every(entry => entry.rows?.length)))
  assert.equal(resumeSchema.safeParse(data).success, true)
})

test("源文件往返保留所有子模块、顺序、时间及两种正文模式", () => {
  const data = groupedResume()
  const raw = exportToMagicyanFile(data)
  assert.equal(JSON.parse(raw).version, "1.3.0")
  assert.deepEqual(importFromMagicyanFile(raw).modules, data.modules)
  const reversed = { ...data, modules: [{ ...data.modules[0], entries: [...data.modules[0].entries!].reverse() }] }
  assert.deepEqual(importFromMagicyanFile(exportToMagicyanFile(reversed)).modules, reversed.modules)
})

test("服务端云端与 PDF 校验保留子模块，过滤嵌套富文本中的危险内容", () => {
  const data = groupedResume()
  data.modules[0].entries![1].content += '<script>alert(1)</script><img src="javascript:alert(1)" onerror="alert(1)">'
  const saved = resumeSchema.parse(data)
  assert.equal(saved.modules[0].entries?.length, 2)
  assert.equal(saved.modules[0].entries?.[0].contentMode, "markdown")
  assert.match(saved.modules[0].entries![1].content, /<strong>主要贡献 B<\/strong>/)
  assert.doesNotMatch(saved.modules[0].entries![1].content, /script|onerror|javascript:/)
  assert.equal(validateResumeData(saved).isValid, true)
  assert.equal(resumeSchema.parse({ ...data, modules: legacyModules }).modules.length, 3)
})

test("预览和 PDF 的 HTML 只输出一次大标题，按序输出各条经历", () => {
  const data = groupedResume()
  const html = buildResumeHtml(data)
  assert.equal((html.match(/class="module-title"/g) || []).length, 1)
  assert.equal((html.match(/class="module-body resume-entry"/g) || []).length, 2)
  assert.ok(html.indexOf("甲公司") < html.indexOf("乙公司"))
  assert.match(html, /2023 - 至今/)
  assert.match(html, /<strong>主要贡献 A<\/strong>/)
  assert.match(html, /<strong>主要贡献 B<\/strong>/)
  const legacyHtml = buildResumeHtml({ ...data, modules: legacyModules })
  assert.equal((legacyHtml.match(/<span>工作经历<\/span>/g) || []).length, 1)
  data.modules[0].entries!.reverse()
  const reversed = buildResumeHtml(data)
  assert.ok(reversed.indexOf("乙公司") < reversed.indexOf("甲公司"))
})

test("允许保存尚无子模块的草稿，导出时要求补充子模块", () => {
  const data = groupedResume()
  data.modules[0].entries = []
  const saved = resumeSchema.parse(data)
  assert.deepEqual(saved.modules[0].entries, [])
  assert.equal(validateResumeData(saved).isValid, false)
  assert.deepEqual(importFromMagicyanFile(exportToMagicyanFile(data)).modules[0].entries, [])
})

test("损坏的子模块在导入与服务端校验时被拒绝", () => {
  for (const entries of [null, {}, [null], [{ id: "broken", content: 123 }]]) {
    const data = groupedResume()
    const malformed = { ...data, modules: [{ ...data.modules[0], entries }] }
    assert.throws(() => importFromMagicyanFile(JSON.stringify({ version: "1.2.0", data: malformed })), /子模块格式错误/)
    assert.equal(resumeSchema.safeParse(malformed).success, false)
  }
})
