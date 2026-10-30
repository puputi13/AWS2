// A4横1ページの遊び方ガイドをPDF化し、ページ数とはみ出しを確認する
const {openEdge,sleep}=require('./_img_lib');
const fs=require('fs'),path=require('path');
const html=path.join(__dirname,'TYPE_THE_WORLD_遊び方.html');
const pdf=path.join(__dirname,'TYPE_THE_WORLD_遊び方_更新版.pdf');
const png=path.join(__dirname,'TYPE_THE_WORLD_遊び方_preview_final.png');
const url='file:///'+html.replace(/\\/g,'/');
(async()=>{
  const E=await openEdge(9511,url); await sleep(1200);
  await E.send('Emulation.setDeviceMetricsOverride',{width:1123,height:794,deviceScaleFactor:1,mobile:false});
  await E.send('Page.reload'); await sleep(900);
  const layout=await E.ev(`(()=>{const all=[...document.querySelectorAll('body *')].map(e=>e.getBoundingClientRect());const page=document.querySelector('.page').getBoundingClientRect();const bottoms=[...document.querySelectorAll('.card,.card *,.footer')].map(e=>({tag:e.tagName,cls:e.className||'',text:(e.textContent||'').trim().slice(0,28),bottom:e.getBoundingClientRect().bottom,top:e.getBoundingClientRect().top})).sort((a,b)=>b.bottom-a.bottom).slice(0,12);return {sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,cw:document.documentElement.clientWidth,ch:document.documentElement.clientHeight,body:[document.body.scrollWidth,document.body.scrollHeight],pageBottom:page.bottom,maxBottom:Math.max(...all.map(r=>r.bottom)),maxRight:Math.max(...all.map(r=>r.right)),bottoms};})()`);
  const shot=await E.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  fs.writeFileSync(png,Buffer.from(shot.result.data,'base64'));
  const out=await E.send('Page.printToPDF',{landscape:true,printBackground:true,preferCSSPageSize:true,marginTop:0,marginBottom:0,marginLeft:0,marginRight:0});
  const buf=Buffer.from(out.result.data,'base64'); fs.writeFileSync(pdf,buf);
  const pages=(buf.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length;
  console.log(JSON.stringify({layout,pages,bytes:buf.length,pdf,png},null,2));
  E.close();
  if(layout.sw>layout.cw||layout.sh>layout.ch||layout.maxBottom>layout.pageBottom+.5||layout.maxRight>layout.cw+.5||pages!==1) process.exit(1);
})().catch(e=>{console.error(e);process.exit(1);});
