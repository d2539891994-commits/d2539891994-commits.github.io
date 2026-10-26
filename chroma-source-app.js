import {exportVideo,sourceBlob} from './chroma-browser-export.js';
const $=id=>document.getElementById(id),video=$('stage-video');
const STORAGE='chroma-native-source-v2';
let library,config,selected='denim',title='MiniMax 色卡变装',mode='single',sequenceIndex=0,position=0,loopClip=false,exportScope='sequence',busy=false,ready=false,toastTimer,dragIndex=null;
let finishGuard=false,lastFrame=-1;
const fixed=n=>Number(n).toFixed(2),fps=24;
const look=id=>library.looks.find(v=>v.id===id);
const seconds=frame=>frame/fps;
function defaults(){return {sequence:library.looks.map(v=>v.id),trims:Object.fromEntries(library.looks.map(v=>[v.id,{start:v.start,end:v.end}])),speed:1,volume:1,audio:true};}
const spans=(c=config)=>c.sequence.map(id=>c.trims[id]);
const duration=(c=config)=>spans(c).reduce((n,v)=>n+v.end-v.start,0)/fps/c.speed;
function original(c=config){const s=spans(c);return c.speed===1&&c.audio&&c.volume===1&&s[0].start===0&&s.at(-1).end===175&&s.every((v,i)=>i===s.length-1||v.end===s[i+1].start);}
function timecode(n){return `${String(Math.floor(n/60)).padStart(2,'0')}:${(n%60).toFixed(2).padStart(5,'0')}`;}
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3800);}
function save(){try{localStorage.setItem(STORAGE,JSON.stringify(project()));$('save-state').textContent='已保存到此浏览器';}catch{$('save-state').textContent='请保存项目文件';}}
function project(){return {version:2,mode:'native-source-video',sourceSha256:library.sourceSha256,title,selected,config};}
function validate(value){
 if(!value||typeof value!=='object'||!Array.isArray(value.sequence)||!value.sequence.length||value.sequence.length>12||value.sequence.some(id=>!look(id)))throw Error('剪辑序列无效');
 const c=defaults();c.sequence=[...value.sequence];
 for(const entry of library.looks){const cut=value.trims?.[entry.id];if(!cut||!Number.isInteger(cut.start)||!Number.isInteger(cut.end)||cut.start<entry.start||cut.end>entry.end||cut.start>=cut.end)throw Error('片段范围超出原视频');c.trims[entry.id]={start:cut.start,end:cut.end};}
 if(typeof value.speed!=='number'||!Number.isFinite(value.speed)||value.speed<.5||value.speed>2||typeof value.volume!=='number'||!Number.isFinite(value.volume)||value.volume<0||value.volume>1||typeof value.audio!=='boolean')throw Error('速度或音量参数无效');
 c.speed=value.speed;c.volume=value.volume;c.audio=value.audio;return c;
}
function restore(p){if(p?.version!==2||p.mode!=='native-source-video'||p.sourceSha256!==library.sourceSha256)throw Error('请选择此版本保存的 MiniMax 原视频项目');const c=validate(p.config);config=c;title=String(p.title||'MiniMax 色卡变装').slice(0,50);selected=look(p.selected)?p.selected:c.sequence[0];}
function pause(){video.pause();$('play').textContent='▶';$('play').setAttribute('aria-label','播放当前穿搭片段');$('phase-label').textContent='原视频定格';}
function seek(frame){video.currentTime=Math.max(0,Math.min(174,frame))/fps;lastFrame=-1;updateFrame(frame);}
function inspectFrame(frame){frame=Math.max(0,Math.min(174,frame));pause();finishGuard=false;mode='single';selected=library.looks.find(v=>v.start<=frame&&frame<v.end).id;seek(frame);syncSelection();}
function startPlaying(){video.playbackRate=config.speed;video.volume=config.volume;video.muted=!config.audio;video.play().then(()=>{$('play').textContent='Ⅱ';$('play').setAttribute('aria-label','暂停播放');}).catch(()=>toast('请再点一次播放'));}
function selectLook(id,autoplay=true){pause();mode='single';selected=id;finishGuard=false;seek(config.trims[id].start);syncSelection();if(autoplay)startPlaying();save();}
function currentClip(){const id=mode==='sequence'?config.sequence[sequenceIndex]:selected;return {...config.trims[id],id};}
function projectTime(frame,index){let t=0;for(let i=0;i<index;i++)t+=(config.trims[config.sequence[i]].end-config.trims[config.sequence[i]].start)/fps/config.speed;const id=config.sequence[index];return t+(frame-config.trims[id].start)/fps/config.speed;}
function updateFrame(frame){
 frame=Math.max(0,Math.min(174,Math.floor(frame)));if(lastFrame===frame)return;lastFrame=frame;
 $('source-scrub').value=frame;$('frame-label').textContent=`第 ${frame+1} / 175 帧`;
 $('time-code').innerHTML=`${timecode(frame/fps)} <em>/ ${timecode(175/fps)}</em>`;
 $('phase-label').textContent=video.paused?'原视频定格':'原视频播放中';
 if(mode==='sequence')position=projectTime(frame,sequenceIndex);else {const i=config.sequence.indexOf(selected);if(i>=0)position=projectTime(frame,i);}
 position=Math.max(0,Math.min(duration(),position));$('timeline-scrub').value=position;
 document.querySelectorAll('.sequence-clip').forEach(el=>el.classList.toggle('active',mode==='sequence'?Number(el.dataset.index)===sequenceIndex:el.dataset.look===selected));
}
function onVideoFrame(now,metadata){
 const frame=Math.floor(metadata.mediaTime*fps+.001);updateFrame(frame);
 if(!video.paused&&!finishGuard){
  const cut=currentClip();
  if(frame>=cut.end-1){
   if(mode==='sequence'&&sequenceIndex<config.sequence.length-1){
    const previousEnd=cut.end;sequenceIndex++;const next=currentClip();selected=next.id;syncSelection();
    if(next.start!==previousEnd)video.currentTime=next.start/fps;
   }else if(mode==='single'&&loopClip){video.currentTime=cut.start/fps;}
   else{finishGuard=true;pause();seek(cut.end-1);$('phase-label').textContent='片段播放结束';}
  }
 }
 video.requestVideoFrameCallback(onVideoFrame);
}
function syncSelection(){
 const entry=look(selected),cut=config.trims[selected];$('stage-title').textContent=entry.name;$('detail-kicker').textContent=`LOOK 0${library.looks.indexOf(entry)+1} / ${entry.label}`;$('detail-name').textContent=entry.name;$('detail-range').textContent=`原片 ${fixed(cut.start/fps)} – ${fixed(cut.end/fps)} 秒`;
 $('trim-start').min=entry.start;$('trim-start').max=cut.end-1;$('trim-start').value=cut.start;$('trim-end').min=cut.start+1;$('trim-end').max=entry.end;$('trim-end').value=cut.end;$('trim-description').textContent=`${cut.end-cut.start} 帧 · ${fixed((cut.end-cut.start)/fps/config.speed)} 秒`;
 document.querySelectorAll('.look-card').forEach(el=>{const active=el.dataset.look===selected;el.classList.toggle('selected',active);el.setAttribute('aria-pressed',String(active));});
}
function renderLibrary(){
 $('look-grid').replaceChildren();library.looks.forEach((entry,i)=>{
  const b=document.createElement('button');b.className='look-card';b.dataset.look=entry.id;b.setAttribute('aria-label',`播放${entry.name}原片片段`);
  b.innerHTML=`<span class="look-photo"><img src="${entry.thumbnail}" alt=""><span class="look-num">0${i+1}</span><span class="look-check">✓</span></span><span class="look-name">${entry.name}</span><span class="look-pose">${fixed(entry.start/fps)}–${fixed(entry.end/fps)}s / ${entry.note}</span>`;
  b.onclick=()=>selectLook(entry.id);$('look-grid').append(b);
 });
}
function renderSequence(){
 $('sequence').replaceChildren();config.sequence.forEach((id,index)=>{
  const entry=look(id),cut=config.trims[id],item=document.createElement('div');item.className='sequence-clip';item.draggable=true;item.tabIndex=0;item.dataset.index=index;item.dataset.look=id;item.style.borderColor=entry.color;
  item.setAttribute('role','button');item.setAttribute('aria-label',`第${index+1}段 ${entry.name}，左右键调整顺序`);item.innerHTML=`<img src="${entry.thumbnail}" alt=""><div><strong>${entry.name}</strong><span>${fixed((cut.end-cut.start)/fps/config.speed)}s · 源 ${fixed(cut.start/fps)}s</span></div><button class="clip-remove" aria-label="移除第${index+1}段">×</button>`;
  item.onclick=event=>{if(!event.target.closest('.clip-remove')){sequenceIndex=index;selectLook(id);}};
  item.querySelector('button').onclick=()=>{if(config.sequence.length===1)return toast('至少保留一个片段');pause();config.sequence.splice(index,1);mode='single';renderSequence();save();};
  item.ondragstart=event=>{dragIndex=index;event.dataTransfer.setData('text/plain',String(index));};item.ondragover=event=>{event.preventDefault();item.classList.add('drag-over');};item.ondragleave=()=>item.classList.remove('drag-over');item.ondrop=event=>{event.preventDefault();item.classList.remove('drag-over');if(dragIndex!==null)moveClip(dragIndex,index);dragIndex=null;};
  item.onkeydown=event=>{if(event.target!==item)return;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();moveClip(index,index+(event.key==='ArrowLeft'?-1:1));}else if(event.key==='Enter')selectLook(id);};$('sequence').append(item);
 });
 $('duration-label').textContent=`${fixed(duration())} 秒`;$('timeline-scrub').max=duration();$('sequence-note').textContent=original()?'原顺序 · 保留原片转场':'已编辑 · 重排处直接切换原片片段';lastFrame=-1;
}
function moveClip(from,to){if(to<0||to>=config.sequence.length||to===from)return;pause();const [id]=config.sequence.splice(from,1);config.sequence.splice(to,0,id);mode='single';renderSequence();save();}
function controls(){
 $('project-name').value=title;$('audio').checked=config.audio;$('volume').value=config.volume;$('volume-value').value=`${Math.round(config.volume*100)}%`;document.querySelectorAll('[data-speed]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.speed)===config.speed));video.playbackRate=config.speed;video.volume=config.volume;video.muted=!config.audio;syncSelection();renderSequence();
}
function updateTrim(start,end){
 const entry=look(selected);if(!Number.isInteger(start)||!Number.isInteger(end)||start<entry.start||end>entry.end||start>=end){syncSelection();return toast('请在当前穿搭的原片范围内设置入点和出点');}
 pause();config.trims[selected]={start,end};mode='single';finishGuard=false;seek(start);syncSelection();renderSequence();save();
}
function playProject(from=0){
 pause();mode='sequence';finishGuard=false;let cursor=0;sequenceIndex=0;
 for(let i=0;i<config.sequence.length;i++){const cut=config.trims[config.sequence[i]],length=(cut.end-cut.start)/fps/config.speed;if(from<cursor+length||i===config.sequence.length-1){sequenceIndex=i;selected=config.sequence[i];seek(cut.start+Math.floor((from-cursor)*config.speed*fps));break;}cursor+=length;}
 syncSelection();startPlaying();
}
function exportConfig(){const value=structuredClone(config);if(exportScope==='single')value.sequence=[selected];return value;}
function exportSummary(){
 const value=exportConfig();$('export-speed').textContent=`${value.speed}×`;$('export-duration').textContent=`${fixed(duration(value))} 秒`;$('export-note').textContent=original(value)?'原片顺序、原速和原声：直接保留原文件，画面不重做。':'只截取和调整原视频片段，保留原始画幅与画面内容。';
}
function setup(){
 const settings=document.createElement('button');settings.id='toggle-inspector';settings.textContent='剪辑设置';settings.setAttribute('aria-label','打开剪辑设置');document.querySelector('.stage-tools').prepend(settings);
 const closeSettings=document.createElement('button');closeSettings.id='close-inspector';closeSettings.textContent='×';closeSettings.setAttribute('aria-label','关闭剪辑设置');document.querySelector('.inspector .panel-heading').append(closeSettings);
 const backdrop=document.createElement('div');backdrop.id='settings-backdrop';backdrop.hidden=true;document.body.append(backdrop);
 const hideSettings=()=>{document.querySelector('.inspector').classList.remove('open');backdrop.hidden=true;};settings.onclick=()=>{document.querySelector('.inspector').classList.add('open');backdrop.hidden=false;};closeSettings.onclick=hideSettings;backdrop.onclick=hideSettings;
 video.addEventListener('timeupdate',()=>{if(video.paused)updateFrame(Math.floor(video.currentTime*fps+.001));});video.addEventListener('play',()=>{$('play').textContent='Ⅱ';});video.addEventListener('pause',()=>{$('play').textContent='▶';});video.addEventListener('error',()=>toast('原视频加载失败，请检查网络'));
 $('project-name').oninput=()=>{title=$('project-name').value;save();};
 $('front-frame').onclick=()=>{pause();mode='single';finishGuard=false;const cut=config.trims[selected];seek(Math.max(cut.start,Math.min(cut.end-1,look(selected).poster)));};
 $('replay-clip').onclick=()=>selectLook(selected);$('play').onclick=()=>{if(!video.paused){pause();return;}const cut=currentClip(),frame=Math.floor(video.currentTime*fps+.001);finishGuard=false;if(frame<cut.start||frame>=cut.end-1)seek(cut.start);startPlaying();};
 $('play-project').onclick=()=>playProject(0);$('prev-frame').onclick=()=>inspectFrame(Math.floor(video.currentTime*fps+.001)-1);$('next-frame').onclick=()=>inspectFrame(Math.floor(video.currentTime*fps+.001)+1);
 $('source-scrub').oninput=()=>{pause();finishGuard=false;const frame=Number($('source-scrub').value);const matching=library.looks.find(v=>v.start<=frame&&frame<v.end);selected=matching.id;mode='single';seek(frame);syncSelection();};
 $('timeline-scrub').oninput=()=>{pause();finishGuard=false;mode='sequence';let target=Number($('timeline-scrub').value),cursor=0;for(let i=0;i<config.sequence.length;i++){const id=config.sequence[i],cut=config.trims[id],len=(cut.end-cut.start)/fps/config.speed;if(target<cursor+len||i===config.sequence.length-1){sequenceIndex=i;selected=id;seek(Math.min(cut.end-1,cut.start+Math.floor((target-cursor)*fps*config.speed)));break;}cursor+=len;}syncSelection();};
 const applyTrim=document.createElement('button');applyTrim.id='apply-trim';applyTrim.className='trim-apply';applyTrim.textContent='应用范围';document.querySelector('.trim-inputs').after(applyTrim);
 applyTrim.onclick=()=>updateTrim(Number($('trim-start').value),Number($('trim-end').value));
 for(const id of ['trim-start','trim-end'])$(id).onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();applyTrim.click();}};
 $('set-start').onclick=()=>updateTrim(Math.floor(video.currentTime*fps+.001),config.trims[selected].end);$('set-end').onclick=()=>updateTrim(config.trims[selected].start,Math.floor(video.currentTime*fps+.001)+1);
 $('reset-trim').onclick=()=>{const entry=look(selected);updateTrim(entry.start,entry.end);};
 document.querySelectorAll('[data-speed]').forEach(b=>b.onclick=()=>{config.speed=Number(b.dataset.speed);controls();save();});
 $('audio').onchange=()=>{config.audio=$('audio').checked;video.muted=!config.audio;save();};$('volume').oninput=()=>{config.volume=Number($('volume').value);video.volume=config.volume;$('volume-value').value=`${Math.round(config.volume*100)}%`;save();};$('loop-clip').onchange=()=>loopClip=$('loop-clip').checked;
 $('add-to-sequence').onclick=()=>{if(config.sequence.length>=12)return toast('最多保留 12 段');pause();config.sequence.push(selected);renderSequence();save();};
 $('restore-original').onclick=()=>{pause();config=defaults();selected='ivory';mode='single';finishGuard=false;controls();seek(0);save();toast('已恢复 MiniMax 原视频的顺序、原速和原声');};
 $('fullscreen').onclick=()=>{if(!document.fullscreenElement)$('stage-wrap').requestFullscreen().catch(()=>toast('当前窗口不支持全屏'));else document.exitFullscreen();};
 $('save-project').onclick=()=>{save();const url=URL.createObjectURL(new Blob([JSON.stringify(project(),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`${title.replace(/[\\/:*?"<>|]/g,'_')||'MiniMax剪辑'}.native.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('原视频剪辑项目已保存');};
 $('load-project').onclick=()=>$('project-file').click();$('project-file').onchange=async()=>{const file=$('project-file').files[0];if(!file)return;try{if(file.size>100000)throw Error('项目过大');const p=JSON.parse(await file.text());restore(p);pause();mode='single';controls();seek(config.trims[selected].start);save();toast('MiniMax 原视频项目已打开');}catch(err){toast(err.message);}finally{$('project-file').value='';}};
 $('export-open').onclick=()=>{exportSummary();$('export-dialog').showModal();};$('export-dialog').querySelector('.close-dialog').onclick=()=>$('export-dialog').close();$('export-dialog').onclose=()=>$('export-video').pause();
 for(const [id,scope] of [['export-all','sequence'],['export-single','single']])$(id).onclick=()=>{if(busy)return;exportScope=scope;$('export-all').classList.toggle('selected',scope==='sequence');$('export-single').classList.toggle('selected',scope==='single');$('export-download').hidden=true;$('export-video').hidden=true;$('export-progress-wrap').hidden=true;exportSummary();};
 $('export-start').onclick=startExport;
 document.addEventListener('keydown',event=>{if(event.code==='Space'&&event.target===document.body&&!$('export-dialog').open){event.preventDefault();$('play').click();}});
}
let exportURL;
async function startExport(){
 if(busy)return;const c=exportConfig(),unchanged=original(c);busy=true;$('export-start').disabled=true;$('export-start').textContent='正在导出…';$('export-download').hidden=true;$('export-video').hidden=true;$('export-progress-wrap').hidden=false;
 const progress=(percent,status)=>{$('export-progress').value=percent;$('export-percent').textContent=`${Math.round(percent)}%`;$('export-status').textContent=status;};
 progress(0,'正在准备导出');
 try{
  const blob=await exportVideo(c,unchanged,progress);
  if(exportURL)URL.revokeObjectURL(exportURL);exportURL=URL.createObjectURL(blob);
  progress(100,unchanged?'完成 · 与 MiniMax 原文件一致':'完成 · 已导出原片剪辑');
  $('export-download').href=exportURL;$('export-download').download=`${(title||'MiniMax_色卡剪辑').replace(/[\\/:*?"<>|]/g,'_')}.mp4`;$('export-download').hidden=false;$('export-video').src=exportURL;$('export-video').hidden=false;toast('剪辑已导出，不收取生成费用');
 }catch(err){progress(0,`导出失败：${err.message}`);toast(err.message);}finally{busy=false;$('export-start').disabled=false;$('export-start').textContent='重新导出当前剪辑';}
}
async function boot(){
 try{
  const response=await fetch('./chroma-source-assets-library.json');if(!response.ok)throw Error('素材加载失败，请刷新页面');library=await response.json();if(library.mode!=='native-source-video')throw Error('请启动新版原视频编辑器');config=defaults();
  try{const saved=JSON.parse(localStorage.getItem(STORAGE));if(saved)restore(saved);}catch{}
  setup();renderLibrary();controls();
  const loaded=()=>{if(ready)return;ready=true;$('loading').hidden=true;const cut=config.trims[selected];seek(Math.max(cut.start,Math.min(cut.end-1,look(selected).poster)));video.requestVideoFrameCallback(onVideoFrame);save();};
  video.addEventListener('loadeddata',loaded,{once:true});
  video.src=URL.createObjectURL(await sourceBlob());
 }catch(err){$('loading').textContent=err.message;}
}
boot();
