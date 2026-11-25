# 编辑器来源

简历编辑界面与交互移植自 [wzdnzd/resume](https://github.com/wzdnzd/resume)，基于提交 [`1a042a4b4f370e94add4493641d969bb9f38199a`](https://github.com/wzdnzd/resume/tree/1a042a4b4f370e94add4493641d969bb9f38199a)。

移植内容位于 `components/editor/`，包括个人信息、求职意向、模块与内容行、标签、选中文字后的悬浮工具栏和颜色选择器；编辑器排版样式同步适配到 `app/globals.css` 和统一 HTML 模板。

本地适配包括 HTML 单元格存储、旧经历分组保留、字体与字号白名单、上游 JSON 导入、窄屏布局、键盘与触屏操作，以及对原有账号、云端保存和 PDF 服务的接入。上游的认证、本地多简历存储、PDF 接口、浏览器打印回退和图片导出流程未迁入。
