import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { fromEditorModules, fromPersonalInfoSection, toEditorModules, toJobIntentionSection, toPersonalInfoSection } from "../lib/editor-adapter"
import { buildResumeHtml } from "../lib/export-html"
import { sanitizeHtml } from "../lib/html-safety"
import { createBlankResumeData, exportToMagicyanFile, importFromMagicyanFile } from "../lib/resume-utils"
import { resumeSchema } from "../lib/server/resume-schema"

function legacyResume() {
  const data = createBlankResumeData()
  data.modules = [{
    id: "work", title: "工作经历", order: 0, content: "",
    entries: [
      { id: "first", subtitle: "甲公司", timeRange: "2023 - 至今", content: "**成果 A**", contentMode: "markdown" },
      { id: "second", subtitle: "乙公司", timeRange: "2020 - 2023", content: "<p>成果 B</p>", contentMode: "rich-text" },
    ],
  }]
  return data
}

test("上游编辑视图不会改写未编辑的旧经历，改标题和排序也保留原始正文", () => {
  const data = legacyResume()
  const original = structuredClone(data)
  const modules = toEditorModules(data.modules)
  assert.equal(modules[0].rows.length, 4)
  modules[0].title = "职业经历"
  const result = fromEditorModules(modules, data.modules)
  assert.deepEqual(result[0].entries, data.modules[0].entries)
  assert.equal(result[0].title, "职业经历")
  assert.deepEqual(data, original)
})

test("编辑和插行只转换所属经历；删除整条经历的行不会恢复被删除的内容", () => {
  const data = legacyResume()
  const modules = toEditorModules(data.modules)
  modules[0].rows[0].elements[0].content = "<p><strong>新公司</strong></p>"
  modules[0].rows.splice(1, 0, { id: "new-tags", entryId: "first", type: "tags", columns: 1, elements: [], tags: ["React"], order: 0 })
  modules[0].rows = modules[0].rows.map((row, order) => ({ ...row, order }))
  const result = fromEditorModules(modules, data.modules)
  assert.equal(result[0].entries?.length, 2)
  assert.equal(result[0].entries?.[0].rows?.length, 3)
  assert.deepEqual(result[0].entries?.[1], data.modules[0].entries?.[1])
  assert.match(buildResumeHtml({ ...data, modules: result }), /新公司/)
  assert.equal(resumeSchema.safeParse({ ...data, modules: result }).success, true)
  modules[0].rows = modules[0].rows.filter(row => row.entryId !== "second")
  assert.equal(fromEditorModules(modules, data.modules)[0].entries?.length, 1)
})

test("示例通过新编辑视图往返后仍保留所有分组、单元格和标签", () => {
  const data = importFromMagicyanFile(readFileSync(new URL("../public/demo.magicyan", import.meta.url), "utf8"))
  const modules = fromEditorModules(toEditorModules(data.modules), data.modules)
  assert.deepEqual(modules, data.modules)
})

test("个人信息拖拽排序、链接、照片与薪资范围通过文件和云端校验保留", () => {
  const data = createBlankResumeData()
  data.personalInfo[0] = { id: "portfolio", label: "作品集", value: "https://example.com", type: "link", linkTitle: "我的作品" }
  const section = toPersonalInfoSection(data)
  section.personalInfo[0].order = 3
  section.layout = { mode: "grid", itemsPerRow: 3 }
  section.avatarType = "idPhoto"
  section.showPersonalInfoLabels = false
  const updated = { ...data, ...fromPersonalInfoSection(section), jobIntention: { enabled: true, items: [
    { id: "salary", label: "薪资", value: "15K - 25K", type: "salary" as const, salaryRange: { min: 15, max: 25 } },
  ] } }
  const saved = resumeSchema.parse(updated)
  const restored = importFromMagicyanFile(exportToMagicyanFile(saved))
  assert.deepEqual(restored.personalInfo, JSON.parse(JSON.stringify(saved.personalInfo)))
  assert.equal(restored.personalInfo.at(-1)?.linkTitle, "我的作品")
  assert.equal(restored.avatarType, "idPhoto")
  assert.deepEqual(toJobIntentionSection(restored).items[0].salaryRange, { min: 15, max: 25 })
  assert.deepEqual(restored.personalInfoLayout, { mode: "grid", columns: 3, showLabels: false })
})

test("上游字体和 pt 字号可保存和渲染，样式白名单仍拒绝注入", () => {
  const content = '<p><span style="font-family: Microsoft YaHei; font-size: 12pt; color: #008060">排版</span></p>'
  assert.equal(sanitizeHtml(content), content)
  assert.doesNotMatch(sanitizeHtml('<p style="font-family: Arial; position: fixed; font-size: 999pt; background: url(https://bad)">文字</p>'), /position|999pt|url\(/)
  const data = legacyResume()
  const modules = toEditorModules(data.modules)
  modules[0].rows[0].elements[0].content = content
  const restored = importFromMagicyanFile(exportToMagicyanFile(resumeSchema.parse({ ...data, modules: fromEditorModules(modules, data.modules) })))
  assert.match(buildResumeHtml(restored), /font-size: 12pt/)
  assert.match(buildResumeHtml(restored), /font-family: Microsoft YaHei/)
})

test("临时清空标题和个人信息标签的草稿仍可在刷新后恢复", () => {
  const data = createBlankResumeData()
  data.title = ""
  data.personalInfo[0].label = ""
  const restored = importFromMagicyanFile(exportToMagicyanFile(data))
  assert.equal(restored.title, "")
  assert.equal(restored.personalInfo[0].label, "")
})

function upstreamFile() {
  return {
    version: "1.0.0", data: {
      title: "上游简历", centerTitle: true,
      personalInfoSection: { personalInfo: [{ id: "link", order: 0, label: "主页", value: { content: "https://example.com", type: "link", title: "作品集" } }], layout: { mode: "grid", itemsPerRow: 2 }, avatarType: "idPhoto" },
      modules: [{ id: "work", title: "工作经历", order: 0, rows: [{ id: "row", columns: 1, order: 0, elements: [{ id: "cell", columnIndex: 0, content: {
        type: "doc", content: [{ type: "paragraph", attrs: { textAlign: "right" }, content: [{ type: "text", text: '<公司 & 团队>', marks: [
          { type: "bold" }, { type: "textStyle", attrs: { fontSize: "12pt", fontFamily: "Microsoft YaHei" } },
        ] }] }],
      } }] }] }],
    },
  }
}

test("上游 JSON 可导入，Tiptap 文字、样式、链接与排序转换为本项目格式", () => {
  const data = importFromMagicyanFile(JSON.stringify(upstreamFile()))
  assert.equal(resumeSchema.safeParse(data).success, true)
  assert.equal(data.personalInfo[0].linkTitle, "作品集")
  assert.equal(data.avatarType, "idPhoto")
  const html = buildResumeHtml(data)
  assert.match(html, /text-align: right/)
  assert.match(html, /font-size: 12pt/)
  assert.match(html, /<strong>&lt;公司 &amp; 团队&gt;<\/strong>/)
  assert.deepEqual(importFromMagicyanFile(exportToMagicyanFile(data)).modules, data.modules)
})

test("上游格式损坏、未知富文本节点和过深嵌套在导入时明确报错", () => {
  const file = upstreamFile()
  const cell = file.data.modules[0].rows[0].elements[0]
  cell.columnIndex = 3
  assert.throws(() => importFromMagicyanFile(JSON.stringify(file)))
  cell.columnIndex = 0
  cell.content.type = "unsupported"
  assert.throws(() => importFromMagicyanFile(JSON.stringify(file)), /暂不支持的内容类型/)
  let nested: object = { type: "text", text: "过深" }
  for (let depth = 0; depth < 45; depth++) nested = { type: "paragraph", content: [nested] }
  Object.assign(cell, { content: nested })
  assert.throws(() => importFromMagicyanFile(JSON.stringify(file)), /过于复杂/)
})
