# 衣序 CHROMA — 公开静态编辑器

入口：[chroma.html](./chroma.html)。已有四套原片片段，支持播放、逐帧裁剪、重排、调速、保存项目和浏览器 MP4 导出。静态托管即可运行，无需模型 API 和后端。

所有编辑器资源保存在同一站点，文件名前缀为 chroma-，相对路径可部署在其他目录。首次修改后导出会加载约 32 MB 的 FFmpeg WebAssembly 核心。原视频原样导出无需加载该核心。

自有页面代码按根目录 MIT 许可提供。@ffmpeg/ffmpeg 为 MIT，@ffmpeg/core 为 GPL-2.0-or-later；原始许可和版本信息一起保留，见 chroma-licenses.html。FFmpeg 核心未改动，只拼接分片，SHA-256 校验保留。演示视频与肖像保留原版权。

这不是自动换装生成器，不支持上传新穿搭后自动生成视频。
