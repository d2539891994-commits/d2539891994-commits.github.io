// All processing stays in this browser. No model service or upload endpoint.
let enginePromise, sourcePromise, progressHandler, outputDuration = 1;
let logTail = [];
const sourceURL = './chroma-media-latest.mp4';
async function checkedFetch(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('剪辑组件加载失败，请检查网络后重试');
  return response;
}
function sourceBytes() {
  return sourcePromise ??= checkedFetch(sourceURL).then(r => r.arrayBuffer()).catch(error => {
    sourcePromise = null; throw error;
  });
}
// Blob media supports seeking even when a static host does not serve byte ranges.
export async function sourceBlob() {
  return new Blob([await sourceBytes()], { type: 'video/mp4' });
}
async function engine(onProgress) {
  progressHandler = onProgress;
  if (!enginePromise) enginePromise = (async () => {
    onProgress(2, '首次打开剪辑组件，请稍候…');
    const { FFmpeg } = await import('./chroma-vendor-ffmpeg-index.js');
    const manifest = await (await checkedFetch('./chroma-vendor-core-wasm.json')).json();
    let done = 0;
    const chunks = await Promise.all(manifest.parts.map(async name => {
      const bytes = await (await checkedFetch(`./${name}`)).arrayBuffer();
      onProgress(3 + (++done / manifest.parts.length) * 14, '正在准备浏览器剪辑…');
      return bytes;
    }));
    const wasmBlob = new Blob(chunks, { type: 'application/wasm' });
    const actual = [...new Uint8Array(await crypto.subtle.digest('SHA-256', await wasmBlob.arrayBuffer()))].map(n => n.toString(16).padStart(2, '0')).join('');
    if (wasmBlob.size !== manifest.size || actual !== manifest.sha256) throw new Error('剪辑组件下载不完整，请刷新重试');
    const wasmURL = URL.createObjectURL(wasmBlob), ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => { logTail.push(message); logTail = logTail.slice(-12); });
    ffmpeg.on('progress', ({ time }) => {
      progressHandler?.(Math.min(96, 20 + 76 * Math.max(0, time / 1e6 / outputDuration)), '正在导出原视频剪辑…');
    });
    try { await ffmpeg.load({ coreURL: new URL('./chroma-vendor-core-ffmpeg-core.js', import.meta.url).href, wasmURL }); }
    finally { URL.revokeObjectURL(wasmURL); }
    // The worker transfers this buffer; keep the cached original for direct exports.
    await ffmpeg.writeFile('source.mp4', new Uint8Array((await sourceBytes()).slice(0)));
    return ffmpeg;
  })().catch(error => { enginePromise = null; throw error; });
  return enginePromise;
}
export function editArguments(config) {
  const ranges = config.sequence.map(id => config.trims[id]), count = ranges.length, graph = [];
  if (count > 1) {
    graph.push(`[0:v]split=${count}` + ranges.map((_, i) => `[iv${i}]`).join(''));
    if (config.audio) graph.push(`[0:a]asplit=${count}` + ranges.map((_, i) => `[ia${i}]`).join(''));
  }
  ranges.forEach(({ start, end }, i) => {
    graph.push(`${count > 1 ? `[iv${i}]` : '[0:v]'}trim=start_frame=${start}:end_frame=${end},setpts=PTS-STARTPTS[v${i}]`);
    if (config.audio) graph.push(`${count > 1 ? `[ia${i}]` : '[0:a]'}atrim=start=${(start / 24).toFixed(12)}:end=${(end / 24).toFixed(12)},asetpts=PTS-STARTPTS[a${i}]`);
  });
  if (config.audio) {
    graph.push(ranges.map((_, i) => `[v${i}][a${i}]`).join('') + `concat=n=${count}:v=1:a=1[cv][ca]`);
    graph.push(`[ca]atempo=${config.speed},volume=${config.volume}[audio]`);
  } else graph.push(ranges.map((_, i) => `[v${i}]`).join('') + `concat=n=${count}:v=1:a=0[cv]`);
  graph.push(`[cv]setpts=(PTS-STARTPTS)/${config.speed}[video]`);
  const duration = ranges.reduce((n, cut) => n + cut.end - cut.start, 0) / 24 / config.speed;
  const args = ['-y', '-i', 'source.mp4', '-filter_complex', graph.join(';'), '-map', '[video]'];
  if (config.audio) args.push('-map', '[audio]', '-c:a', 'aac', '-b:a', '160k');
  args.push('-c:v', 'libx264', '-crf', '0', '-preset', 'fast', '-pix_fmt', 'yuv420p',
    '-enc_time_base:v', '1:12288', '-vsync', '0', '-bsf:v', `setts=duration=1/(${24 * config.speed}*TB)`,
    '-t', duration.toFixed(12), '-movflags', '+faststart', 'output.mp4');
  return { args, duration };
}
export async function exportVideo(config, unchanged, onProgress) {
  if (unchanged) {
    onProgress(20, '正在读取原视频…');
    return new Blob([await sourceBytes()], { type: 'video/mp4' });
  }
  const { args, duration } = editArguments(config);
  outputDuration = duration;
  const ffmpeg = await engine(onProgress);
  logTail = [];
  onProgress(20, '正在导出原视频剪辑…');
  const code = await ffmpeg.exec(args);
  if (code !== 0) {
    console.error('Browser export failed', logTail.join('\n'));
    throw new Error('浏览器导出未完成，请刷新后重试；可先下载原视频');
  }
  const data = await ffmpeg.readFile('output.mp4');
  await ffmpeg.deleteFile('output.mp4');
  return new Blob([data], { type: 'video/mp4' });
}
