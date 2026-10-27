# LaoDing — 个人网站

公开网站：[https://d2539891994-commits.github.io/](https://d2539891994-commits.github.io/)

本仓库为 GitHub Pages 静态发布入口。`index.html` 包含可直接显示的静态首屏与样式；`portfolio-*` 文件为独立脚本、图片、字体和演示。案例采用 `#work/...` 地址。

## 开源代码与离线 HTML

- [可维护的 React/TypeScript 源码](./laoding-portfolio-source.zip)：下载并解压，执行 `npm ci`、`npm run dev` 或 `npm run build`。包含完整源码、导出脚本、依赖锁文件和 MIT 许可。
- [离线 HTML 压缩包](./laoding-portfolio-html.zip)：解压后用浏览器打开 HTML 文件即可查看，不需要安装依赖。

页面代码采用 MIT 许可。Kanit 字体采用 SIL OFL，保留在源码和 HTML 中。本人肖像、作品截图、账号材料与第三方媒体保留各自版权，不因代码开源而授予复用许可。

[衣序 CHROMA 视频编辑器](./chroma.html) 与个人网站使用同一公开托管，脚本、原片和浏览器导出组件都从本站加载。飞书原文档是独立外部链接。当前 CHROMA 支持已有视频编辑，自动换装尚未接入。

## 发布

GitHub Pages 使用 `main` 分支的根目录。`.nojekyll` 用于直接发布已有静态文件。更新时上传完整在线发布目录中的 `index.html`、`portfolio-*` 资源以及最新源码压缩包；保留 `chroma-*` 编辑器资源和离线 HTML 下载包。

## 视频编辑器

`chroma.html` 为编辑器入口，`chroma-*` 文件为它的脚本、样式、四套素材和 FFmpeg 组件。所有本地资源使用相对路径，无需第三方 CDN 或模型服务。第三方组件许可见 [开源组件](./chroma-licenses.html)。

## 首页加载修复（2026-10-27）

在线入口采用静态首屏与独立交互脚本，图片、字体按需加载。入口约 90 KB，脚本失败仍保留首页与作品链接。离线 HTML 下载包继续使用完整内嵌资源，适合发送文件后直接打开。构建脚本位于源码包 scripts/export-online.mjs。
