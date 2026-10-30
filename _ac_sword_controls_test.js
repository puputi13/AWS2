// 剣士操作感：移動、照準補助、攻撃予約、回避キャンセル、E/Q、壁衝突、連続操作
const {openEdge,sleep}=require('./_img_lib');
const path=require('path');
const url='file:///'+path.resolve(__dirname,'index.html').replace(/\\/g,'/');
let pass=0,fail=0;const ok=(c,m)=>{console.log((c?'OK  ':'FAIL')+' '+m);c?pass++:fail++;};
(async()=>{
 const E=await openEdge(9501,url);await E.send('Emulation.setDeviceMetricsOverride',{width:1100,height:820,deviceScaleFactor:1,mobile:false});await E.send('Page.reload');await sleep(2200);
 const fresh=`(()=>{profile=defaultProfile('feel-test');profile.xp=5000;startAction('self',0);ac.stopped=true;ac.spawnT=99;ac.enemies=[];ac.p.inv=0;ac.p.sp=100;acMouse.on=false;return true;})()`;
 await E.ev(fresh);
 // 斜めと直線で同じ移動速度
 const speeds=await E.ev(`(()=>{AC_PROPS=[];AC_POOLS=[];AC_RECTS=[];ac.door.open=true;const p=ac.p,run=(keys)=>{p.x=700;p.y=500;for(const k in acKeys)acKeys[k]=false;keys.forEach(k=>acKeys[k]=true);const x=p.x,y=p.y;acUpdate(.05);return Math.hypot(p.x-x,p.y-y);};const straight=run(['right']),diag=run(['right','down']);acResetInput();return {straight,diag,spd:p.spd};})()`);
 ok(Math.abs(speeds.straight-speeds.diag)<1e-6&&Math.abs(speeds.straight-speeds.spd*.05)<1e-6,'WASDの直線・斜め移動速度が一定 '+speeds.diag.toFixed(2)+'px/50ms');
 // 前方補助だけ。近い背後とカーソルから外れた敵を無視
 const assist=await E.ev(`(()=>{const p=ac.p;p.x=700;p.y=500;p.dir=0;const mk=(a,d,id)=>{const e=acMakeEnemy('goblin',false,0);e.x=p.x+Math.cos(a)*d;e.y=p.y+Math.sin(a)*d;e.state='idle';e.t=99;e._id=id;return e;};ac.enemies=[mk(.18,150,'front'),mk(Math.PI,70,'back'),mk(.8,90,'side')];acAim();return {dir:p.dir,target:ac.enemies.reduce((b,e)=>Math.abs(Math.atan2(e.y-p.y,e.x-p.x)-p.dir)<.001?e._id:b,'')};})()`);
 ok(assist.target==='front'&&Math.abs(assist.dir-.18)<.01,'照準補助はカーソル方向に近い前方の敵だけを選択');
 // 通常攻撃の物理座標は動かさず、終盤入力を次段へ予約
 const buffered=await E.ev(`(()=>{ac.enemies=[];const p=ac.p;p.x=700;p.y=500;p.atkT=0;p.atkCD=0;p.comboT=0;p.atkBuffer=0;p.dir=0;acAction('attack');const fixed=[p.x,p.y];ac.atkT0=.18;p.atkT=.07;p.atkCD=.13;acAction('attack');const queued=p.atkBuffer>0;for(let i=0;i<4;i++)acUpdate(.04);return {fixed:fixed[0]===700&&fixed[1]===500,queued,combo:p.combo,active:p.atkT>0};})()`);
 ok(buffered.fixed,'通常攻撃の踏み込みは見た目だけで実座標を動かさない');
 ok(buffered.queued&&buffered.combo===2&&buffered.active,'攻撃終盤の入力予約から2段目へ接続');
 // 攻撃前半のShiftは予約され、42%以降で回避キャンセル
 const cancel=await E.ev(`(()=>{const p=ac.p;p.atkT=0;p.atkCD=0;p.rollT=0;p.rollCD=0;p.dashBuffer=0;p.dir=0;acAction('attack');ac.atkT0=.18;acAction('dash');const early={roll:p.rollT,buf:p.dashBuffer};for(let i=0;i<4;i++)acUpdate(.025);return {early,roll:p.rollT,atk:p.atkT,cd:p.rollCD};})()`);
 ok(cancel.early.roll===0&&cancel.early.buf>0&&cancel.roll>0&&cancel.atk===0,'攻撃前半のShiftを予約し、42%経過後に回避キャンセル');
 // ダッシュ距離・CD・停止時方向
 const dash=await E.ev(`(()=>{acEnterRoom(0);ac.stopped=true;ac.spawnT=99;ac.enemies=[];AC_PROPS=[];AC_POOLS=[];AC_RECTS=[];ac.door.open=true;const p=ac.p;p.x=700;p.y=500;p.dir=Math.PI;p.face=-1;p.rollCD=0;acResetInput();const x=p.x,y=p.y;acAction('dash');const startCd=p.rollCD;for(let i=0;i<11;i++)acUpdate(.02);return {dist:Math.hypot(p.x-x,p.y-y),dx:p.x-x,cd:p.rollCD,startCd,expected:AC_SWORD_FEEL.dashDistance};})()`);
 ok(Math.abs(dash.dist-dash.expected)<1&&dash.dx<0&&dash.startCd===.6,'停止中は向いている方向へ約'+dash.dist.toFixed(1)+'px回避・CD '+dash.startCd.toFixed(1)+'秒');
 // 薄い壁へ高速移動しても反対側へ抜けない
 const wall=await E.ev(`(()=>{const p=ac.p;p.x=700;p.y=500;p.dir=0;p.rollT=0;p.rollCD=0;AC_PROPS=[];AC_POOLS=[];AC_RECTS=[{x0:750,x1:766,y0:400,y1:600}];ac.door.open=true;acAction('dash');for(let i=0;i<6;i++)acUpdate(.05);return {x:p.x,limit:736};})()`);
 ok(wall.x<=wall.limit+.01,'回避を10px単位で判定し薄い壁を通過しない');
 // E/Qの割り当て、SP、クールダウン、終了復帰
 const skills=await E.ev(`(()=>{acEnterRoom(0);ac.stopped=true;ac.spawnT=99;ac.enemies=[];const p=ac.p;p.sp=100;p.eCD=p.qCD=0;const keys=[acKeyAct({code:'KeyE',key:'e'}),acKeyAct({code:'KeyQ',key:'q'}),acKeyAct({code:'ShiftLeft',key:'Shift'})];acAction('skill1');const e0={skill:p.skill,cd:p.eCD,sp:p.sp};for(let i=0;i<14;i++)acUpdate(.05);const eDone=p.skill===null,spBefore=p.sp;acAction('skill1');const eBlocked=p.skill===null&&p.sp===spBefore;p.sp=100;acAction('skill2');const q0={skill:p.skill,cd:p.qCD,sp:p.sp};for(let i=0;i<8;i++)acUpdate(.05);return {keys,e0,eDone,eBlocked,q0,qDone:p.skill===null};})()`);
 ok(JSON.stringify(skills.keys)===JSON.stringify(['skill1','skill2','dash']),'E=スキル、Q=必殺技、Shift=回避に整理');
 ok(skills.e0.skill==='spin'&&skills.e0.cd===5&&skills.e0.sp===70&&skills.eDone&&skills.eBlocked,'E 回転斬り：SP30・CD 5秒・終了後に操作復帰');
 ok(skills.q0.skill==='rush'&&skills.q0.cd===12&&skills.q0.sp===50&&skills.qDone,'Q 突進斬り：SP50・CD 12秒・終了後に操作復帰');
 // HUDと操作ボタンに再使用時間が出る
 const hud=await E.ev(`(()=>{acDraw();const text=[...document.querySelectorAll('#ac-pad button')].map(b=>b.textContent);return {text,help:document.getElementById('ac-help').textContent};})()`);
 ok(hud.text.some(t=>t.includes('Shift')&&/s|READY/.test(t))&&hud.text.some(t=>t.startsWith('E'))&&hud.text.some(t=>t.startsWith('Q'))&&hud.help.includes('CD 5秒')&&hud.help.includes('CD 12秒'),'操作方法と再使用待ち時間を画面表示');
 // 実入力で通常攻撃→回避→E→Qを連続使用し、最後に操作可能へ戻る
 await E.ev(`(()=>{startAction('self',0);ac.spawnT=99;ac.enemies=[];ac.p.inv=0;ac.p.sp=100;acMouse.on=false;return true;})()`);await sleep(120);
 const rect=await E.ev(`(()=>{const r=acCanvas.getBoundingClientRect();return {l:r.left,t:r.top,w:r.width,h:r.height};})()`),cx=rect.l+rect.w*.65,cy=rect.t+rect.h*.5;
 await E.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:cx,y:cy});await E.send('Input.dispatchMouseEvent',{type:'mousePressed',x:cx,y:cy,button:'left',buttons:1,clickCount:1});await E.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:cx,y:cy,button:'left',buttons:0,clickCount:1});await sleep(90);
 await E.send('Input.dispatchKeyEvent',{type:'keyDown',code:'ShiftLeft',key:'Shift'});await E.send('Input.dispatchKeyEvent',{type:'keyUp',code:'ShiftLeft',key:'Shift'});await sleep(360);
 await E.send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyE',key:'e'});await E.send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyE',key:'e'});await sleep(760);
 await E.ev(`(()=>{ac.p.sp=100;return true;})()`);await E.send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyQ',key:'q'});await E.send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyQ',key:'q'});await sleep(520);
 const live=await E.ev(`(()=>({active:!!ac&&!ac.stopped&&!ac.ended,skill:ac.p.skill,roll:ac.p.rollT,finite:[ac.p.x,ac.p.y,ac.p.atkT,ac.p.eCD,ac.p.qCD].every(Number.isFinite)}))()`);
 ok(live.active&&live.skill===null&&live.roll<=0&&live.finite,'通常攻撃・回避・E・Qの連続実操作後も操作可能');
 ok(E.errors.length===0,'剣士操作試作でJSエラーなし');
 console.log('\n'+pass+' passed, '+fail+' failed');if(E.errors.length)console.log(E.errors.join('\n'));E.close();process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
