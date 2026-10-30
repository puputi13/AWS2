// カーソル方向のカメラ先読み：デッドゾーン、端、照準、設定、メニュー、遷移を確認
const {openEdge,sleep}=require('./_img_lib');
const path=require('path');
const url='file:///'+path.resolve(__dirname,'index.html').replace(/\\/g,'/');
let pass=0,fail=0;const ok=(c,m)=>{console.log((c?'OK  ':'FAIL')+' '+m);c?pass++:fail++;};
(async()=>{
 const E=await openEdge(9471,url);await E.send('Emulation.setDeviceMetricsOverride',{width:1100,height:820,deviceScaleFactor:1,mobile:false});await E.send('Page.reload');await sleep(2200);
 await E.ev(`(()=>{profile=defaultProfile('camera-test');profile.xp=5000;startAction('self',0);ac.spawnT=99;ac.enemies=[];ac.p.inv=0;acLookAhead=true;acLookToggle.checked=true;acMouse.on=false;return true;})()`);await sleep(150);
 const rect=await E.ev(`(()=>{const r=acCanvas.getBoundingClientRect();return {l:r.left,t:r.top,w:r.width,h:r.height};})()`);
 const move=async(x,y)=>E.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:rect.l+x/960*rect.w,y:rect.t+y/520*rect.h});
 // プレイヤーの近くでは動かない
 const near=await E.ev(`(()=>{const c=ac.cam;c.lookX=c.lookY=0;acMouse.on=true;const z=ac.zoom||1,ox=AC_W/2,oy=AC_H*.55;acMouse.x=(ac.p.x-c.x-ox)*z+ox+35;acMouse.y=(ac.p.y-c.y-oy)*z+oy+20;for(let i=0;i<90;i++)acUpdateCamera(1/60);return {x:c.lookX,y:c.lookY};})()`);
 ok(Math.hypot(near.x,near.y)<.1,'プレイヤー付近72pxのデッドゾーンでは視点が動かない');
 // 実際のpointermoveで右方向へ先読み
 await move(860,260);await sleep(700);const far=await E.ev(`(()=>({x:ac.cam.lookX,y:ac.cam.lookY,camX:ac.cam.x,maxX:WW-AC_W}))()`);
 ok(far.x>20&&far.x<=90&&Math.abs(far.y)<=52,'カーソル方向へ控えめな上限内で先読み');
 ok(far.camX>=0&&far.camX<=far.maxX,'通常時もステージ外を表示しない');
 // カメラ移動後も照準点と攻撃方向が一致
 const aim=await E.ev(`(()=>{acAim();const w=acMouseWorld(),a=Math.atan2(w.y+30-ac.p.y,w.x-ac.p.x);return {diff:acAngDiff(ac.p.dir,a)};})()`);
 ok(aim.diff<1e-9,'先読み後もカーソル位置と実際の攻撃方向が一致');
 // 移動と攻撃中のフレーム間変化を実操作で測る
 await E.ev(`(()=>{window.__camSamples=[];window.__camSampleN=0;const f=()=>{if(!ac||ac.stopped)return;window.__camSamples.push([ac.cam.x,ac.cam.y]);if(window.__camSampleN++<55)requestAnimationFrame(f);};requestAnimationFrame(f);})()`);
 await E.send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyD',key:'d'});await sleep(260);await E.send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyD',key:'d'});
 await E.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',buttons:1,clickCount:1,x:rect.l+rect.w*.85,y:rect.t+rect.h*.5});await sleep(80);await E.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',buttons:0,clickCount:1,x:rect.l+rect.w*.85,y:rect.t+rect.h*.5});await sleep(620);
 const smooth=await E.ev(`(()=>{let m=0;for(let i=1;i<window.__camSamples.length;i++)m=Math.max(m,Math.hypot(window.__camSamples[i][0]-window.__camSamples[i-1][0],window.__camSamples[i][1]-window.__camSamples[i-1][1]));return {max:m,n:window.__camSamples.length};})()`);
 ok(smooth.n>30&&smooth.max<14,'移動中・攻撃中のカメラに急な跳びがない 最大'+smooth.max.toFixed(2)+'px');
 // ポーズ中は先読み解除し、解除後は滑らかに中央へ戻る
 await E.send('Input.dispatchKeyEvent',{type:'keyDown',code:'Escape',key:'Escape'});await E.send('Input.dispatchKeyEvent',{type:'keyUp',code:'Escape',key:'Escape'});await sleep(900);
 const paused=await E.ev(`(()=>({paused:ac.paused,look:Math.hypot(ac.cam.lookX,ac.cam.lookY)}))()`);
 ok(paused.paused&&paused.look<1,'メニュー操作中は先読みを解除');
 await E.send('Input.dispatchKeyEvent',{type:'keyDown',code:'Escape',key:'Escape'});await E.send('Input.dispatchKeyEvent',{type:'keyUp',code:'Escape',key:'Escape'});await sleep(80);
 // カーソルがCanvas外へ出ると解除
 await move(850,260);await sleep(450);await E.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:rect.l+rect.w+40,y:rect.t+20});await sleep(1500);
 const leave=await E.ev(`(()=>({on:acMouse.on,look:Math.hypot(ac.cam.lookX,ac.cam.lookY)}))()`);
 ok(!leave.on&&leave.look<1,'カーソルがゲーム画面外へ出ると先読み解除');
 // 設定オフを保存し、先読みしない
 await E.ev(`(()=>{acLookToggle.checked=false;acLookToggle.dispatchEvent(new Event('change'));acMouse.on=true;acMouse.x=900;acMouse.y=260;for(let i=0;i<90;i++)acUpdateCamera(1/60);return true;})()`);
 const off=await E.ev(`(()=>({enabled:acLookAhead,saved:localStorage.getItem(AC_LOOK_KEY),look:Math.hypot(ac.cam.lookX,ac.cam.lookY)}))()`);
 ok(!off.enabled&&off.saved==='0'&&off.look<.1,'設定で先読みをオフにして保存できる');
 // 再びオン。右端では上限に固定
 const edge=await E.ev(`(()=>{acLookToggle.checked=true;acLookToggle.dispatchEvent(new Event('change'));ac.paused=false;ac.p.x=WW-30;ac.p.y=WH/2;acMouse.on=true;acMouse.x=AC_W;acMouse.y=AC_H/2;for(let i=0;i<120;i++)acUpdateCamera(1/60);return {x:ac.cam.x,max:WW-AC_W};})()`);
 ok(edge.x===edge.max,'画面端ではカメラをステージ内に固定');
 // 部屋移動中は先読みを減衰させ、移動後に持ち越さない
 const trans=await E.ev(`(()=>{ac.p.x=WW/2;ac.p.y=WH/2;ac.cam.lookX=70;ac.cam.lookY=30;acMouse.on=true;acStartTrans();const a=[];for(let i=0;i<60;i++){if(ac.trans)acTransStep(1/60);acUpdateCamera(1/60);a.push(Math.hypot(ac.cam.lookX,ac.cam.lookY));}return {room:ac.room,last:a[a.length-1],min:Math.min(...a),maxStep:a.slice(1).reduce((m,v,i)=>Math.max(m,Math.abs(v-a[i])),0)};})()`);
 ok(trans.room===2&&trans.min<2&&trans.maxStep<8,'部屋移動中は先読みを滑らかに解除し、移動後も急変しない 最小'+trans.min.toFixed(2)+'px / 最大変化'+trans.maxStep.toFixed(2)+'px');
 ok(E.errors.length===0,'カメラ先読みでJSエラーなし');
 console.log('\n'+pass+' passed, '+fail+' failed');if(E.errors.length)console.log(E.errors.join('\n'));E.close();process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
