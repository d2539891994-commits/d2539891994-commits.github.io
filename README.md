# LaoDing — 个人网站

本仓库为 GitHub Pages 静态发布入口。`index.html` 内嵌页面所需的字体、图片、CSS、JavaScript 与操作演示，案例采用 `#work/...` 地址。

## 开源代码与离线 HTML

- [可维护的 React/TypeScript 源码](./laoding-portfolio-source.zip)：下载并解压，执行 `npm ci`、`npm run dev` 或 `npm run build`。包含完整源码、导出脚本、依赖锁文件和 MIT 许可。
- [离线 HTML 压缩包](./laoding-portfolio-html.zip)：解压后用浏览器打开 HTML 文件即可查看，不需要安装依赖。

页面代码采用 MIT 许可。Kanit 字体采用 SIL OFL，保留在源码和 HTML 中。本人肖像、作品截图、账号材料与第三方媒体保留各自版权，不因代码开源而授予复用许可。

飞书原文档与 CHROMA 在线编辑器是独立外部链接，不属于此静态托管。当前 CHROMA 支持已有视频编辑，自动换装尚未接入。

## 发布

GitHub Pages 使用 `main` 分支的根目录。`.nojekyll` 用于直接发布已有静态文件。更新时替换 `index.html` 和两个下载压缩包即可。
