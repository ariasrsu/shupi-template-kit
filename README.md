# 三分钟内用ai自动化做小红书爆款图文：本地工作台、自动排版 Skill、手绘漫画 Skill

一个本地图文工作台，加上自动排版和手绘漫画两个 Agent Skill。下载后双击 `index.html` 即可使用；无需注册、服务器、API Key 或安装依赖。文案和图片留在本地浏览器中处理。

## 工作台怎么用

1. 点击 GitHub 仓库的 **Code → Download ZIP**，解压后打开 `index.html`。
2. 填写自己的昵称、账号、标题和正文，按需上传头像与图片。每页画布为 1080 × 1440。
3. 正文中用回车主动分行；`==文字==` 添加高亮，`**文字**` 添加黑色粗体。每页都可单独选择高亮颜色。
4. 图片可选完整显示、从顶部裁切铺满或居中裁切铺满。如需在正文中间插入第二张图，写入 `[[中间图片]]`，再分别上传中间和页底图片。
5. 右侧检查预览，点击「下载当前 PNG」或「下载全部 ZIP」。用「保存项目 JSON」留存，下次导入继续编辑。

右侧预览与导出使用同一套 Canvas 绘制。正文超出安全区域时会提示，可调整分行、缩短句子或拆成多页。建议使用新版 Chrome、Edge 或 Safari。

## 让 Agent 自动排版

把仓库作为 Codex 项目打开，Agent 可发现 `.agents/skills/shupi-post-maker`。给它自己的文案与素材，并说明每页重点、配图和颜色。Skill 会整理项目 JSON，调用渲染器输出 PNG，并检查换行、留白、高亮与图片。

命令行示例：

```bash
node scripts/render.mjs examples/post-project.json output
```

命令行渲染需要 Node.js 22+ 和 Chrome/Chromium；浏览器位置特殊时设置 `CHROME_PATH`。工作台不需要 Node.js。

## 科普动漫图 Skill

在 Codex 中打开仓库即可使用 `.agents/skills/science-anime-illustrator`。在对话里上传想作为漫画主角的图片，也可以附画风参考、知识点原文或一句想法。Agent 会核查关键事实、安排分镜、调用可用的生图工具，并检查角色一致性和画面细节。完成的图片可以再导入工作台排版。

两个 Skill 也可复制到个人 skills 目录。Skill 是指令文件，不包含生图模型或免费额度。

## 文件与隐私

- `index.html`、`style.css`、`app.js`：本地工作台。
- `scripts/render.mjs`：Agent 使用的批量渲染器。
- `examples/post-project.json`：不含真实账号和素材的通用示例。
- `.agents/skills/`：自动排版和科普漫画两个 Skill。

自己的项目 JSON、头像、截图、漫画和帖子文案请保存在本地；不要提交到公开仓库。默认演示不包含创作者的私人作品。

代码、Skill 和文档按 [MIT License](LICENSE) 开放使用。
