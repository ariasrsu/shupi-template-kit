const W = 1080, H = 1440;
const $ = id => document.getElementById(id);
const canvas = $('preview');
const ctx = canvas.getContext('2d');
const FONT = '"PingFang SC", "Microsoft YaHei", sans-serif';
const DEFAULT_HIGHLIGHT = '#fce1ed';
const INLINE_IMAGE_MARKER = '[[中间图片]]';
const CONTENT_BOTTOM = 1370;
const highlightColor = page => /^#[0-9a-f]{6}$/i.test(page?.highlightColor || '') ? page.highlightColor : DEFAULT_HIGHLIGHT;
const initialPages = [
  {title:'在这里填写标题',body:'第一行写清一个观点。\n==这里是高亮重点==，**这里是黑色粗体**。\n上传自己的图片，或选择下方的步骤示意。',highlightColor:'#fce1ed',visual:'steps'}
];
let state = window.SHP_PROJECT || {name:'你的昵称', handle:'@yourname', badge:false, avatar:'', pages:structuredClone(initialPages)};
let selected = Number.isInteger(window.SHP_PAGE) ? window.SHP_PAGE : 0;
const imageCache = new Map();
let renderVersion = 0;

function status(message, error=false) { $('status').textContent=message; $('status').style.color=error?'#b04456':'#b35e7f'; }
function imageFor(src) {
  if (!src) return Promise.resolve(null);
  if (!imageCache.has(src)) imageCache.set(src, new Promise(resolve => { const im=new Image(); im.onload=()=>resolve(im); im.onerror=()=>resolve(null); im.src=src; }));
  return imageCache.get(src);
}
function rounded(x,y,w,h,r,color,context=ctx) { context.fillStyle=color; context.beginPath(); context.roundRect(x,y,w,h,r); context.fill(); }
function setFont(context,size,weight=400) { context.font=`${weight} ${size}px ${FONT}`; context.textBaseline='top'; }
function drawBadge(context,x,y) {
  context.save(); context.translate(x,y); context.beginPath();
  for(let i=0;i<24;i++){ const a=-Math.PI/2+i*Math.PI/12; const r=i%2?17:19; const px=Math.cos(a)*r, py=Math.sin(a)*r; i?context.lineTo(px,py):context.moveTo(px,py); }
  context.closePath(); context.fillStyle='#1d9bf0'; context.fill();
  context.strokeStyle='#fff'; context.lineWidth=4.5; context.lineCap='round'; context.lineJoin='round';
  context.beginPath(); context.moveTo(-9,0); context.lineTo(-2,7); context.lineTo(10,-7); context.stroke(); context.restore();
}
async function drawHeader(context) {
  context.fillStyle='#fff'; context.fillRect(0,0,W,H);
  const avatar=await imageFor(state.avatar);
  if(avatar){
    // Crop only the outer white margin; both characters and their hair remain visible.
    const side=Math.min(avatar.width,avatar.height), crop=side*.80;
    context.drawImage(avatar,(avatar.width-crop)/2,(avatar.height-crop)/2,crop,crop,51,47,104,104);
  } else rounded(51,47,104,104,18,'#f3ecef',context);
  context.fillStyle='#202733'; setFont(context,38,750); context.fillText(state.name||'昵称',189,50);
  if(state.badge) drawBadge(context,189+context.measureText(state.name||'昵称').width+26,73);
  context.fillStyle='#6e7580'; setFont(context,35,500); context.fillText(state.handle||'@账号',189,112);
  context.fillStyle='#9ca4b1'; [961,982,1003].forEach(x=>{context.beginPath();context.arc(x,99,6,0,Math.PI*2);context.fill()});
}
function plainLines(context,text,maxWidth,size,weight=750) {
  setFont(context,size,weight); let lines=[''];
  for(const ch of [...text]) { const last=lines.length-1; if(context.measureText(lines[last]+ch).width>maxWidth && lines[last]) lines.push(ch); else lines[last]+=ch; }
  return lines;
}
function richCharacters(text) {
  let highlighted=false, bold=false, chars=[];
  for(let i=0;i<text.length;i++) {
    const marker=text.slice(i,i+2);
    if(marker==='=='){highlighted=!highlighted;i++;continue;}
    if(marker==='**'){bold=!bold;i++;continue;}
    chars.push({ch:text[i],marked:highlighted,bold});
  }
  return chars;
}
function richLines(context,text,maxWidth) {
  const lines=[[]]; let width=0, chars=richCharacters(text);
  const charWidth=it=>{setFont(context,42,it.bold?750:400);return context.measureText(it.ch).width;};
  for(let i=0;i<chars.length;) {
    const item=chars[i];
    if(item.ch==='\n'){lines.push([]);width=0;i++;continue;}
    let token=[];
    if(/[A-Za-z0-9×@._/\-]/.test(item.ch)) {
      while(i<chars.length && chars[i].marked===item.marked && chars[i].bold===item.bold && /[A-Za-z0-9×@._/\-]/.test(chars[i].ch)) token.push(chars[i++]);
    } else token.push(chars[i++]);
    const tokenWidth=token.reduce((sum,it)=>sum+charWidth(it),0);
    const punctuation=token.length===1 && /[，。！？、；：）】》”’]/.test(token[0].ch);
    if(width+tokenWidth>maxWidth && lines.at(-1).length && !punctuation){lines.push([]);width=0;}
    if(!lines.at(-1).length && token.every(it=>it.ch===' '))continue;
    for(const it of token){const w=charWidth(it);lines.at(-1).push({...it,width:w});width+=w;}
  }
  return lines;
}
function drawRichLine(context,line,x,y,color) {
  let cursor=x, runX=null, runW=0;
  const flush=()=>{if(runX!==null){rounded(runX-3,y-7,runW+6,54,9,color,context);runX=null;runW=0;}};
  for(const item of line){if(item.marked){if(runX===null)runX=cursor;runW+=item.width;}else flush();cursor+=item.width;}flush();
  cursor=x;
  for(const item of line){context.fillStyle=item.bold?'#101010':'#202733';setFont(context,42,item.bold?750:400);context.fillText(item.ch,cursor,y);cursor+=item.width;}
}
function visualBase(context,y,h,label) {
  rounded(52,y,976,h,20,'#faf8fa',context);
  context.strokeStyle='#e9e0e5'; context.lineWidth=2; context.beginPath(); context.roundRect(52,y,976,h,20); context.stroke();
  context.fillStyle='#503b45'; setFont(context,25,700); context.fillText(label,82,y+29);
}
function drawSteps(context,y,h,page) {
  visualBase(context,y,h,'一页图文，三块内容');
  const raw=Array.isArray(page.steps)&&page.steps.length?page.steps:[['观点','每页只讲清一件事'],['解释','用大字说人话'],['素材','关键截图给证据']];
  const items=raw.slice(0,3).map(([title,desc],i)=>[String(i+1).padStart(2,'0'),String(title||''),String(desc||'')]);
  const start=y+102, gap=19, cardH=Math.min(120,(h-135-2*gap)/3);
  items.forEach(([n,title,desc],i)=>{const yy=start+i*(cardH+gap);rounded(85,yy,910,cardH,16,'#fff',context);rounded(110,yy+24,55,55,13,'#eadde2',context);context.fillStyle='#a55c7b';setFont(context,23,750);context.fillText(n,120,yy+37);context.fillStyle='#503b45';setFont(context,27,700);context.fillText(title,190,yy+19);context.fillStyle='#7c6972';setFont(context,23);context.fillText(desc,190,yy+61);});
}
function drawTool(context,y,h,page) {
  visualBase(context,y,h,'图文模板 · 编辑界面');
  const top=y+88, panelH=h-122;
  rounded(84,top,350,panelH,14,'#fff',context);rounded(451,top,545,panelH,14,'#fff',context);
  context.fillStyle='#7c6972';setFont(context,19,650);context.fillText('左侧：输入内容',108,top+22);context.fillText('右侧：实时预览',478,top+22);
  rounded(108,top+67,302,49,10,'#f3ecef',context);rounded(108,top+129,302,92,10,'#f3ecef',context);
  rounded(108,top+236,302,43,10,'#eadde2',context);context.fillStyle='#9c7184';setFont(context,17);context.fillText('标题',123,top+80);context.fillText('正文：==重点==',123,top+145);context.fillText('上传截图 / 添加页面',123,top+247);
  rounded(478,top+67,491,Math.max(190,panelH-92),10,'#fbf8f8',context);
  context.fillStyle='#503b45';setFont(context,24,750);context.fillText('这类图文，我做成了工具',501,top+92);
  rounded(501,top+146,385,32,7,highlightColor(page),context);setFont(context,20);context.fillText('把时间留给内容本身',509,top+151);
  rounded(501,top+202,440,Math.max(78,panelH-270),8,'#eadde2',context);
}
function drawSkill(context,y,h) {
  visualBase(context,y,h,'科普动漫图 · 从知识点到画面');
  const cards=[['1','核查事实','先确认科学机制'],['2','设计分镜','一张图讲一个变化'],['3','生成与检查','看方向、标签、比例']];
  const top=y+110, cardW=275, gap=25;
  cards.forEach(([n,t,d],i)=>{const x=85+i*(cardW+gap);rounded(x,top,cardW,Math.min(270,h-155),18,'#fff',context);rounded(x+22,top+23,52,52,14,'#eadde2',context);context.fillStyle='#a55c7b';setFont(context,25,750);context.fillText(n,x+38,top+34);context.fillStyle='#503b45';setFont(context,24,700);context.fillText(t,x+22,top+100);context.fillStyle='#7c6972';setFont(context,19);context.fillText(d,x+22,top+148);});
  context.strokeStyle='#c987a3';context.lineWidth=5;for(let i=0;i<2;i++){const x=85+cardW+i*(cardW+gap)+7;context.beginPath();context.moveTo(x,top+125);context.lineTo(x+12,top+125);context.stroke();}
}
async function drawUploaded(context,page,y,h) {
  const image=await imageFor(page.image);
  if(!image)return;
  const box={x:52,y,w:976,h};
  const fit=['cover-top','cover-center'].includes(page.imageFit)?page.imageFit:'contain';
  if(fit==='contain'){
    const ratio=Math.min(box.w/image.width,box.h/image.height);
    const w=image.width*ratio,hh=image.height*ratio;
    context.drawImage(image,box.x+(box.w-w)/2,box.y,w,hh);
    return;
  }
  const targetRatio=box.w/box.h, sourceRatio=image.width/image.height;
  let sx=0,sy=0,sw=image.width,sh=image.height;
  if(sourceRatio>targetRatio){sw=image.height*targetRatio;sx=(image.width-sw)/2;}
  else{sh=image.width/targetRatio;sy=fit==='cover-center'?(image.height-sh)/2:0;}
  context.drawImage(image,sx,sy,sw,sh,box.x,box.y,box.w,box.h);
}
async function renderPage(page, target) {
  const c=target.getContext('2d'); await drawHeader(c);
  const cover=page===state.pages[0];
  let titleSize=cover?68:46, titleWeight=cover?800:750;
  let titleLines=plainLines(c,page.title||'',976,titleSize,titleWeight);
  if(cover){while(titleLines.length>2 && titleSize>48){titleSize-=2;titleLines=plainLines(c,page.title||'',976,titleSize,titleWeight);}}
  else titleLines=titleLines.slice(0,2);
  const titleY=cover?205:233, titleLineHeight=cover?titleSize+12:65;
  c.fillStyle='#202733';setFont(c,titleSize,titleWeight);titleLines.forEach((line,i)=>c.fillText(line,52,titleY+i*titleLineHeight));
  const bodyY=cover?titleY+titleLines.length*titleLineHeight+32:(titleLines.length>1?414:343);
  const body=String(page.body||''), markerAt=body.indexOf(INLINE_IMAGE_MARKER);
  const visual=page.visual||'none';
  if(markerAt!==-1 && page.middleImage && visual==='image'){
    const before=richLines(c,body.slice(0,markerAt).trimEnd(),976);
    const after=richLines(c,body.slice(markerAt+INLINE_IMAGE_MARKER.length).trimStart(),976);
    const gap=18, remaining=CONTENT_BOTTOM-bodyY-(before.length+after.length)*79-gap*3;
    if(remaining<360){
      const lines=richLines(c,body.replace(INLINE_IMAGE_MARKER,'').replace(/\n\s*\n/g,'\n'),976);
      lines.forEach((line,i)=>drawRichLine(c,line,52,bodyY+i*79,highlightColor(page)));
      return true;
    }
    const middleH=Math.min(195,Math.max(130,Math.round(remaining*.35)));
    const bottomH=remaining-middleH;
    before.forEach((line,i)=>drawRichLine(c,line,52,bodyY+i*79,highlightColor(page)));
    const middleY=bodyY+before.length*79+gap;
    await drawUploaded(c,{image:page.middleImage,imageFit:page.middleImageFit},middleY,middleH);
    const afterY=middleY+middleH+gap;
    after.forEach((line,i)=>drawRichLine(c,line,52,afterY+i*79,highlightColor(page)));
    if(bottomH>0)await drawUploaded(c,page,afterY+after.length*79+gap,bottomH);
    return remaining<360;
  }
  const visibleBody=markerAt===-1?body:body.replace(INLINE_IMAGE_MARKER,'').replace(/\n\s*\n/g,'\n');
  const lines=richLines(c,visibleBody,976);
  lines.forEach((line,i)=>drawRichLine(c,line,52,bodyY+i*79,highlightColor(page)));
  const visualY=bodyY+lines.length*79+18, available=CONTENT_BOTTOM-visualY;
  let overflow=false;
  if(visual!=='none'){
    if(available<310)overflow=true;
    else{const h=visual==='image'?available:Math.min(590,available);if(visual==='steps')drawSteps(c,visualY,h,page);if(visual==='tool')drawTool(c,visualY,h,page);if(visual==='skill')drawSkill(c,visualY,h);if(visual==='image')await drawUploaded(c,page,visualY,h);}
  } else if(bodyY+lines.length*79>CONTENT_BOTTOM)overflow=true;
  return overflow;
}
async function renderSelected() {
  const version=++renderVersion; const overflow=await renderPage(state.pages[selected],canvas);
  if(version===renderVersion)status(overflow?'本页内容超出安全区域，请缩短正文或拆成两页。':'预览已更新。',overflow);
}
function syncInputs(){
  $('authorName').value=state.name;$('authorHandle').value=state.handle;$('showBadge').checked=state.badge;
  const p=state.pages[selected];$('pageTitle').value=p.title||'';$('pageBody').value=p.body||'';$('visualType').value=p.visual||'none';$('highlightColor').value=highlightColor(p);$('highlightHex').textContent=highlightColor(p).toUpperCase();
  $('stepsEditorLabel').style.display=p.visual==='steps'?'block':'none';$('stepsEditor').value=(p.steps||[]).map(([t,d])=>`${t}｜${d}`).join('\n');
  const hasMiddle=p.visual==='image'&&String(p.body||'').includes(INLINE_IMAGE_MARKER);
  $('middleImageControls').style.display=hasMiddle?'block':'none';$('middleImageName').textContent=hasMiddle?(p.middleImage?'已选择中间图片':'尚未选择中间图片'):'';$('middleImageFit').value=['cover-top','cover-center'].includes(p.middleImageFit)?p.middleImageFit:'contain';
  $('imageUploadLabel').style.display=p.visual==='image'?'block':'none';$('imageUploadLabel').textContent=hasMiddle?'上传页底图片':'上传本页图片';$('imageFitLabel').style.display=p.visual==='image'?'block':'none';$('imageFit').value=['cover-top','cover-center'].includes(p.imageFit)?p.imageFit:'contain';$('imageName').textContent=p.visual==='image'?(p.image?'已选择图片':'尚未选择图片'):'';
  $('pageTabs').innerHTML='';state.pages.forEach((_,i)=>{const b=document.createElement('button');b.textContent=String(i+1);b.className=i===selected?'active':'';b.type='button';b.onclick=()=>{selected=i;syncInputs();renderSelected()};$('pageTabs').append(b)});
  $('pageCount').textContent=`第 ${selected+1} / ${state.pages.length} 页`;
  $('deletePage').disabled=state.pages.length===1;
}
function downloadBlob(blob,name){const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
function canvasBlob(c){return new Promise(resolve=>c.toBlob(resolve,'image/png'))}
function bindText(id,fn){$(id).addEventListener('input',e=>{fn(e.target.value);renderSelected()})}
bindText('authorName',v=>state.name=v);bindText('authorHandle',v=>state.handle=v);
bindText('pageTitle',v=>state.pages[selected].title=v);
$('pageBody').addEventListener('input',e=>{state.pages[selected].body=e.target.value;const hasMiddle=state.pages[selected].visual==='image'&&e.target.value.includes(INLINE_IMAGE_MARKER);$('middleImageControls').style.display=hasMiddle?'block':'none';$('imageUploadLabel').textContent=hasMiddle?'上传页底图片':'上传本页图片';renderSelected()});
$('highlightColor').addEventListener('input',e=>{state.pages[selected].highlightColor=e.target.value;$('highlightHex').textContent=e.target.value.toUpperCase();renderSelected()});
bindText('stepsEditor',v=>state.pages[selected].steps=v.split('\n').filter(Boolean).slice(0,3).map(line=>{const [title,...rest]=line.split('｜');return [title.trim(),rest.join('｜').trim()]}));
$('showBadge').onchange=e=>{state.badge=e.target.checked;renderSelected()};
$('visualType').onchange=e=>{state.pages[selected].visual=e.target.value;syncInputs();renderSelected()};
$('imageFit').onchange=e=>{state.pages[selected].imageFit=e.target.value;renderSelected()};
$('middleImageFit').onchange=e=>{state.pages[selected].middleImageFit=e.target.value;renderSelected()};
$('addPage').onclick=()=>{state.pages.splice(selected+1,0,{title:'新的一页',body:'在这里填写正文，用 ==重点== 标出高亮。',visual:'steps'});selected++;syncInputs();renderSelected()};
$('deletePage').onclick=()=>{if(state.pages.length<=1)return;state.pages.splice(selected,1);selected=Math.min(selected,state.pages.length-1);syncInputs();renderSelected()};
function move(delta){const to=selected+delta;if(to<0||to>=state.pages.length)return;[state.pages[selected],state.pages[to]]=[state.pages[to],state.pages[selected]];selected=to;syncInputs();renderSelected()}
$('moveLeft').onclick=()=>move(-1);$('moveRight').onclick=()=>move(1);
async function uploadImage(event,apply){const f=event.target.files?.[0];if(!f)return;if(!f.type.startsWith('image/')){status('请选择图片文件。',true);return;}const reader=new FileReader();reader.onload=()=>{apply(reader.result);syncInputs();renderSelected()};reader.readAsDataURL(f);event.target.value=''}
$('avatarUpload').onchange=e=>uploadImage(e,v=>state.avatar=v);
$('pageImage').onchange=e=>uploadImage(e,v=>{state.pages[selected].image=v;state.pages[selected].visual='image'});
$('middleImageUpload').onchange=e=>uploadImage(e,v=>{state.pages[selected].middleImage=v;state.pages[selected].middleImageFit||='cover-top'});
$('saveProject').onclick=()=>downloadBlob(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),'shupi-project.json');
$('importProject').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{const next=JSON.parse(await f.text());if(!Array.isArray(next.pages)||!next.pages.length)throw Error('缺少页面');state={name:String(next.name||''),handle:String(next.handle||''),badge:Boolean(next.badge),avatar:String(next.avatar||''),pages:next.pages.map(p=>({title:String(p.title||''),body:String(p.body||''),visual:['steps','tool','skill','image','none'].includes(p.visual)?p.visual:'none',highlightColor:highlightColor(p),image:typeof p.image==='string'?p.image:undefined,imageFit:['cover-top','cover-center'].includes(p.imageFit)?p.imageFit:'contain',middleImage:typeof p.middleImage==='string'?p.middleImage:undefined,middleImageFit:['cover-top','cover-center'].includes(p.middleImageFit)?p.middleImageFit:'contain',steps:Array.isArray(p.steps)?p.steps:undefined}))};selected=0;syncInputs();renderSelected();status('项目已导入。')}catch(err){status(`导入失败：${err.message}`,true)}e.target.value=''};
$('downloadOne').onclick=async()=>{await renderPage(state.pages[selected],canvas);downloadBlob(await canvasBlob(canvas),`shupi-page-${selected+1}.png`);status('当前 PNG 已下载。')};

// Small dependency-free ZIP writer (store method). Each archive contains PNG files.
const u16=(view,o,v)=>view.setUint16(o,v,true),u32=(view,o,v)=>view.setUint32(o,v>>>0,true);
const crcTable=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;crcTable[n]=c>>>0}
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0}
function makeZip(files){const encoder=new TextEncoder(),parts=[],central=[];let offset=0;
  for(const file of files){const name=encoder.encode(file.name),data=file.bytes,crc=crc32(data),local=new Uint8Array(30+name.length),lv=new DataView(local.buffer);u32(lv,0,0x04034b50);u16(lv,4,20);u16(lv,8,0);u32(lv,14,crc);u32(lv,18,data.length);u32(lv,22,data.length);u16(lv,26,name.length);local.set(name,30);parts.push(local,data);
    const cd=new Uint8Array(46+name.length),cv=new DataView(cd.buffer);u32(cv,0,0x02014b50);u16(cv,4,20);u16(cv,6,20);u32(cv,16,crc);u32(cv,20,data.length);u32(cv,24,data.length);u16(cv,28,name.length);u32(cv,42,offset);cd.set(name,46);central.push(cd);offset+=local.length+data.length;}
  const centralSize=central.reduce((n,p)=>n+p.length,0),end=new Uint8Array(22),ev=new DataView(end.buffer);u32(ev,0,0x06054b50);u16(ev,8,files.length);u16(ev,10,files.length);u32(ev,12,centralSize);u32(ev,16,offset);return new Blob([...parts,...central,end],{type:'application/zip'});
}
$('downloadAll').onclick=async()=>{status('正在生成全部图片…');const temp=document.createElement('canvas');temp.width=W;temp.height=H;const files=[];let over=0;
  for(let i=0;i<state.pages.length;i++){const exceeds=await renderPage(state.pages[i],temp);if(exceeds)over++;const blob=await canvasBlob(temp);files.push({name:`shupi-page-${String(i+1).padStart(2,'0')}.png`,bytes:new Uint8Array(await blob.arrayBuffer())})}
  downloadBlob(makeZip(files),'shupi-pages.zip');status(over?`ZIP 已下载；有 ${over} 页内容超出安全区域，请检查。`:'全部页面 ZIP 已下载。',Boolean(over));renderSelected();
};
syncInputs();renderSelected();
