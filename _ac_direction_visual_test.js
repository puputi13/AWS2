// 左右への実攻撃を連続撮影し、画面上の剣腕と斬撃方向を確認する
const {openEdge,sleep}=require('./_img_lib');
const path=require('path'),fs=require('fs');
const url='file:///'+path.resolve(__dirname,'index.html').replace(/\\/g,'/');
const out=path.join(__dirname,'_direction_shots');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const E=await openEdge(9491,url);await E.send('Emulation.setDeviceMetricsOverride',{width:1100,height:820,deviceScaleFactor:1,mobile:false});await E.send('Page.reload');await sleep(2200);
 await E.ev(`(()=>{profile=defaultProfile('visual-dir');profile.xp=5000;startAction('self',0);ac.spawnT=99;ac.enemies=[];ac.p.inv=0;ac.p.x=WW/2;ac.p.y=WH/2+100;ac.cam.x=Math.max(0,ac.p.x-AC_W/2);ac.cam.y=Math.max(0,ac.p.y-AC_H*.58);return true;})()`);
 const rect=await E.ev(`(()=>{const r=acCanvas.getBoundingClientRect(),p=ac.p,z=ac.zoom||1,ox=AC_W/2,oy=AC_H*.55;return {l:r.left,t:r.top,w:r.width,h:r.height,px:(p.x-ac.cam.x-ox)*z+ox,py:(p.y-ac.cam.y-oy)*z+oy};})()`);
 const shot=async n=>{const r=await E.send('Page.captureScreenshot',{format:'png',clip:{x:rect.l+rect.w*(rect.px/960)-180,y:rect.t+rect.h*(rect.py/520)-180,width:360,height:360,scale:2}});fs.writeFileSync(path.join(out,n),Buffer.from(r.result.data,'base64'));};
 const attack=async(side,tx)=>{
   await E.ev(`(()=>{ac.p.atkT=0;ac.p.atkCD=0;ac.p.comboT=0;ac.p.sw=null;acMouse.on=false;return true;})()`);
   const x=rect.l+rect.w*(tx/960),y=rect.t+rect.h*(rect.py/520);
   await E.send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});await sleep(120);
   await E.send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',buttons:1,clickCount:1});await sleep(5);await E.send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',buttons:0,clickCount:1});
   await sleep(20);console.log(side,'025',await E.ev(`(()=>({dir:ac.p.dir,atkDir:ac.p.atkDir,face:ac.p.face,swDir:ac.p.sw&&ac.p.sw.dir,swT:ac.p.sw&&ac.p.sw.t,atkT:ac.p.atkT,cam:[ac.cam.x,ac.cam.y],mouse:acMouseWorld()}))()`));await shot(side+'_025.png');await sleep(35);console.log(side,'060',await E.ev(`(()=>({dir:ac.p.dir,atkDir:ac.p.atkDir,face:ac.p.face,swDir:ac.p.sw&&ac.p.sw.dir,swT:ac.p.sw&&ac.p.sw.t,atkT:ac.p.atkT,cam:[ac.cam.x,ac.cam.y],mouse:acMouseWorld()}))()`));await shot(side+'_060.png');await sleep(50);console.log(side,'110',await E.ev(`(()=>({dir:ac.p.dir,atkDir:ac.p.atkDir,face:ac.p.face,swDir:ac.p.sw&&ac.p.sw.dir,swT:ac.p.sw&&ac.p.sw.t,atkT:ac.p.atkT,cam:[ac.cam.x,ac.cam.y],mouse:acMouseWorld()}))()`));await shot(side+'_110.png');
   await E.send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',buttons:0,clickCount:1});await sleep(180);
 };
 await attack('left',rect.px-300);await attack('right',rect.px+300);
 console.log(E.errors.length?E.errors.join('\n'):'OK visual captures');E.close();process.exit(E.errors.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
