// マウス照準と体・剣腕・斬撃・攻撃判定の方向同期を実操作で確認
const {openEdge,sleep}=require('./_img_lib');
const path=require('path');
const url='file:///'+path.resolve(__dirname,'index.html').replace(/\\/g,'/');
let pass=0,fail=0;const ok=(c,m)=>{console.log((c?'OK  ':'FAIL')+' '+m);c?pass++:fail++;};
(async()=>{
 const E=await openEdge(9481,url);await E.send('Emulation.setDeviceMetricsOverride',{width:1100,height:820,deviceScaleFactor:1,mobile:false});await E.send('Page.reload');await sleep(2200);
 await E.ev(`(()=>{profile=defaultProfile('dir-test');profile.xp=5000;startAction('self',0);ac.spawnT=99;ac.enemies=[];ac.p.inv=0;return true;})()`);
 const rect=await E.ev(`(()=>{const r=acCanvas.getBoundingClientRect();return {l:r.left,t:r.top,w:r.width,h:r.height};})()`);
 const mouse=async(type,x,y,buttons=0)=>E.send('Input.dispatchMouseEvent',{type,x:rect.l+x/960*rect.w,y:rect.t+y/520*rect.h,button:type==='mouseMoved'?'none':'left',buttons,clickCount:type==='mouseMoved'?0:1});
 const dirs=[['右',280,0],['左',-280,0],['上',0,-190],['下',0,190],['右上',230,-155],['左上',-230,-155],['右下',230,155],['左下',-230,155]];
 for(const enabled of [false,true]){
  await E.ev(`(()=>{acLookToggle.checked=${enabled};acLookToggle.dispatchEvent(new Event('change'));return true;})()`);
  for(const [name,dx,dy] of dirs){
   const start=await E.ev(`(()=>{const p=ac.p;p.x=WW/2;p.y=WH/2;p.face=1;p.dir=0;p.atkT=0;p.atkCD=0;p.atkBuffer=0;p.dashBuffer=0;p.rollT=0;p.comboT=0;p.sw=null;p.hitSet=null;acKeys.attack=false;ac.enemies=[];ac.cam.lookX=ac.cam.lookY=0;acMouse.on=false;acUpdateCamera(1);const z=ac.zoom||1,ox=AC_W/2,oy=AC_H*.55;return {x:(p.x-ac.cam.x-ox)*z+ox,y:(p.y-ac.cam.y-oy)*z+oy};})()`);
   const tx=Math.max(8,Math.min(952,start.x+dx)),ty=Math.max(8,Math.min(512,start.y+dy));await mouse('mouseMoved',tx,ty);await sleep(enabled?420:40);
   const setup=await E.ev(`(()=>{const w=acMouseWorld(),p=ac.p,a=Math.atan2(w.y+30-p.y,w.x-p.x),mk=(ang,id)=>{const e=acMakeEnemy('goblin',false,0);e.x=p.x+Math.cos(ang)*76;e.y=p.y+Math.sin(ang)*76;e.state='idle';e.t=99;e.speed=0;e.hp=e.max=1000;e._id=id;return e;};ac.enemies=[mk(a,'aim'),mk(a+Math.PI,'back')];window.__dirFlips=[];window.__dirOrig=acDrawSwordAttack;acDrawSwordAttack=function(){window.__dirFlips.push(arguments[6]);return window.__dirOrig.apply(this,arguments);};return {a};})()`);
   await mouse('mousePressed',tx,ty,1);await sleep(5);await mouse('mouseReleased',tx,ty,0);await sleep(23);
   // 振っている途中でカーソルを反対側へ動かす
   const cur=await E.ev(`(()=>{const p=ac.p,z=ac.zoom||1,ox=AC_W/2,oy=AC_H*.55;return {x:(p.x-ac.cam.x-ox)*z+ox,y:(p.y-ac.cam.y-oy)*z+oy,dir:p.atkDir,face:p.atkFace,sw:p.sw&&p.sw.dir};})()`);
   const ox=Math.max(8,Math.min(952,cur.x-dx)),oy=Math.max(8,Math.min(512,cur.y-dy));await mouse('mouseMoved',ox,oy,0);await sleep(70);await mouse('mouseReleased',ox,oy,0);
   const r=await E.ev(`(()=>{const aim=ac.enemies.find(e=>e._id==='aim'),back=ac.enemies.find(e=>e._id==='back'),flips=window.__dirFlips.slice();acDrawSwordAttack=window.__dirOrig;delete window.__dirOrig;return {dir:ac.p.atkDir,face:ac.p.atkFace,sw:ac.p.sw&&ac.p.sw.dir,aim:aim.hp,back:back.hp,flips,atkT:ac.p.atkT,stats:[ac.p.mR,ac.p.mHalf,ac.p.atkCD]};})()`);
   const expectedFace=Math.abs(Math.cos(setup.a))<.001?1:(Math.cos(setup.a)<0?-1:1);
   ok(Math.abs(Math.atan2(Math.sin(r.dir-setup.a),Math.cos(r.dir-setup.a)))<.035&&Math.abs(Math.atan2(Math.sin(cur.sw-cur.dir),Math.cos(cur.sw-cur.dir)))<1e-9&&r.face===expectedFace&&r.flips.length>0&&r.flips.every(v=>v===(r.face>0))&&r.aim<1000&&r.back===1000,(enabled?'先読みON ':'先読みOFF ')+name+'：体・剣腕・斬撃・判定が同方向 '+JSON.stringify(r));
  }
 }
 // 右へ移動しながら左へ攻撃し、攻撃中は左向きを固定
 await E.ev(`(()=>{acLookToggle.checked=true;acLookToggle.dispatchEvent(new Event('change'));const p=ac.p;p.x=WW/2;p.y=WH/2;p.face=1;p.dir=0;p.atkT=0;p.atkCD=0;p.atkBuffer=0;p.dashBuffer=0;p.rollT=0;p.comboT=0;p.sw=null;ac.enemies=[];ac.cam.lookX=ac.cam.lookY=0;acMouse.on=false;acUpdateCamera(1);acKeys.right=true;return true;})()`);
 const ps=await E.ev(`(()=>{const p=ac.p,z=ac.zoom||1,ox=AC_W/2,oy=AC_H*.55;return {x:(p.x-ac.cam.x-ox)*z+ox,y:(p.y-ac.cam.y-oy)*z+oy};})()`);const lx=Math.max(8,ps.x-280),ly=ps.y;await mouse('mouseMoved',lx,ly);await sleep(420);
 await E.ev(`(()=>{window.__dirFlips=[];window.__dirOrig=acDrawSwordAttack;acDrawSwordAttack=function(){window.__dirFlips.push(arguments[6]);return window.__dirOrig.apply(this,arguments);};return true;})()`);await mouse('mousePressed',lx,ly,1);await sleep(35);await mouse('mouseMoved',Math.min(952,ps.x+280),ly,1);await sleep(75);await mouse('mouseReleased',Math.min(952,ps.x+280),ly,0);
 const opposite=await E.ev(`(()=>{const r={dir:ac.p.atkDir,face:ac.p.atkFace,sw:ac.p.sw.dir,flips:window.__dirFlips.slice()};acKeys.right=false;acDrawSwordAttack=window.__dirOrig;return r;})()`);
 ok(Math.cos(opposite.dir)<0&&opposite.face===-1&&Math.cos(opposite.sw)<0&&opposite.flips.length>0&&opposite.flips.every(v=>!v),'右移動中でも左攻撃は照準方向を優先し、途中で反転しない');
 ok(E.errors.length===0,'方向同期テストでJSエラーなし');
 console.log('\n'+pass+' passed, '+fail+' failed');if(E.errors.length)console.log(E.errors.join('\n'));E.close();process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
