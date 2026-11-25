import assert from "node:assert/strict"
import { test } from "node:test"
import {
  createContentRow,
  getEntryRows,
  resizeContentRow,
  renderContentRows,
} from "../lib/content-rows"
import {
  createBlankResumeData,
  createNewModule,
  exportToMagicyanFile,
  importFromMagicyanFile,
} from "../lib/resume-utils"
import { resumeSchema } from "../lib/server/resume-schema"
import { sanitizeHtml } from "../lib/html-safety"
import { buildResumeHtml } from "../lib/export-html"

function layoutResume() {
  const data = createBlankResumeData()
  const row = createContentRow(2)
  row.cells[0].content = "<p><strong>示例公司</strong></p>"
  row.cells[1].content =
    '<p style="text-align: right"><span style="font-size: 18px; color: #008060; font-family: Arial">2023 - 至今</span></p>'
  const tags = createContentRow(1, "tags")
  tags.tags = ["React", "TypeScript"]
  data.modules = [
    {
      ...createNewModule(0, "工作经历"),
      entries: [
        {
          id: "entry",
          subtitle: "",
          timeRange: "",
          content: "",
          contentMode: "markdown",
          rows: [row, tags],
        },
      ],
    },
  ]
  data.centerTitle = true
  data.personalInfo = [
    {
      id: "portfolio",
      label: "作品集",
      value: "https://example.com",
      type: "link",
      linkTitle: "我的作品",
    },
  ]
  data.personalInfoLayout = { mode: "grid", columns: 3, showLabels: false }
  data.jobIntention = {
    enabled: true,
    items: [{ id: "city", label: "目标城市", value: "杭州" }],
  }
  return data
}

test("旧 Markdown 经历转换成标题时间双列与正文单列，保持原始内容", () => {
  const original = {
    id: "old",
    subtitle: "公司",
    timeRange: "2020 - 2023",
    content: "**成果**",
    contentMode: "markdown" as const,
  }
  const rows = getEntryRows(original)
  assert.deepEqual(
    rows.map((row) => row.columns),
    [2, 1],
  )
  assert.match(rows[0].cells[0].content, /<strong>公司<\/strong>/)
  assert.match(rows[0].cells[1].content, /text-align: right/)
  assert.match(rows[1].cells[0].content, /<strong>成果<\/strong>/)
  assert.equal(original.content, "**成果**")
})

test("减少列数保留全部单元格内容，增加列数不改变已有内容和标识", () => {
  const row = createContentRow(4)
  row.cells.forEach((cell, index) => {
    cell.content = `<p>列${index}</p>`
  })
  const smaller = resizeContentRow(row, 2)
  assert.equal(smaller.cells[0].id, row.cells[0].id)
  assert.equal(smaller.cells[1].content, "<p>列1</p><p>列2</p><p>列3</p>")
  assert.equal(row.cells.length, 4)
  const bigger = resizeContentRow(smaller, 4)
  assert.equal(bigger.cells.length, 4)
  assert.equal(bigger.cells[1].content, smaller.cells[1].content)
  assert.equal(bigger.cells[2].content, "")
})

test("云端校验和文件往返保留分栏、标签、个人信息布局与求职意向", () => {
  const data = layoutResume()
  const cloud = resumeSchema.parse(data)
  const restored = importFromMagicyanFile(exportToMagicyanFile(cloud))
  assert.deepEqual(restored.modules, cloud.modules)
  assert.deepEqual(restored.personalInfoLayout, cloud.personalInfoLayout)
  assert.deepEqual(restored.jobIntention, cloud.jobIntention)
  assert.equal(restored.personalInfo[0].linkTitle, "我的作品")
  assert.equal(restored.centerTitle, true)
})

test("文字样式白名单保留排版，剔除 URL、定位与事件处理器", () => {
  const html = sanitizeHtml(
    '<p style="text-align: right; position: fixed; background-image: url(http://127.0.0.1)"><span style="font-size: 20px; color: rgb(0, 128, 96); font-family: Arial; line-height: 1.5" onclick="evil()">文字</span></p>',
  )
  assert.match(html, /text-align: right/)
  assert.match(html, /font-size: 20px/)
  assert.match(html, /color: rgb\(0, 128, 96\)/)
  assert.match(html, /font-family: Arial/)
  assert.match(html, /line-height: 1.5/)
  assert.doesNotMatch(html, /position|background-image|url\(|onclick/)
  assert.equal(sanitizeHtml(html), html)
  const link = sanitizeHtml(
    '<a href="https://example.com/?a=1&amp;b=2" title="A &amp; B">作品</a>',
  )
  assert.equal(sanitizeHtml(link), link)
  assert.match(link, /a=1&amp;b=2/)
  assert.doesNotMatch(
    sanitizeHtml('<a href="&#x6a;avascript:alert(1)">危险链接</a>'),
    /href/,
  )
})

test("非法内容行在导入与服务端写入之前被拒绝", () => {
  for (const invalid of [
    { ...createContentRow(1), columns: 99 },
    { ...createContentRow(2), cells: [] },
    { ...createContentRow(2), cells: [{ id: "same", content: "A" }, { id: "same", content: "B" }] },
    { ...createContentRow(1), cells: [{ id: "cell", content: 123 }] },
  ]) {
    const data = layoutResume()
    const malformed = {
      ...data,
      modules: [
        {
          ...data.modules[0],
          entries: [{ id: "entry", content: "", rows: [invalid] }],
        },
      ],
    }
    assert.equal(resumeSchema.safeParse(malformed).success, false)
    assert.throws(() =>
      importFromMagicyanFile(
        JSON.stringify({ version: "1.3.0", data: malformed }),
      ),
    )
  }
})

test("统一 HTML 按列显示内容与标签，并应用个人信息链接、标题居中和意向", () => {
  const data = layoutResume()
  const html = buildResumeHtml(data)
  assert.match(html, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.match(html, /class="resume-tag">React<\/span>/)
  assert.match(html, /href="https:\/\/example.com"/)
  assert.match(html, />我的作品<\/a>/)
  assert.match(html, /header-content header-centered/)
  assert.match(html, /目标城市<\/span>杭州/)
  assert.doesNotMatch(html, /<span class="personal-info-label">/)
  assert.equal((html.match(/class="module-title"/g) || []).length, 1)
  assert.match(
    renderContentRows(data.modules[0].entries![0].rows!),
    /text-align: right/,
  )
})
