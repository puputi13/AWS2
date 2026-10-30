// ルナ・レン・カイの部位分割歩行、通常攻撃、E/Q動作を確認
const {openEdge,sleep}=require('./_img_lib');
const path=require('path'),fs=require('fs');
const url='file:///'+path.resolve(__dirname,'index.html').replace(/\\/g,'/'),out=path.join(__dirname,'_other_motion_shots');fs.mkdirSync(out,{recursive:true});
let pass=0,fail=0;const ok=(c,m)=>{console.log((c?'OK  ':'FAIL')+' '+m);c?pass++:fail++;};
(async()=>{
 const E=await openEdge(9551,url);await E.send('Emulation.setDeviceMetricsOverride',{width:1100,height:820,deviceScaleFactor:1,mobile:false});await E.send('Page.reload');await sleep(2400);
 await E.ev(`(()=>{profile=defaultProfile('motion-test');profile.xp=5000;return true;})()`);
 const built=await E.ev(`(()=>Object.fromEntries(['mage','archer','fighter'].map(j=>[j,{ok:!!heroRoleMotionState[j]?.ok,w:heroRoleMotionState[j]?.walk.body.width,h:heroRoleMotionState[j]?.walk.body.height,parts:heroRoleMotionState[j]?.attack.parts.length}])))()`);
 ok(built.mage.ok&&built.mage.w===619&&built.mage.h===744&&built.mage.parts===2,'ルナの脚・杖腕を分割');
 ok(built.archer.ok&&built.archer.w===563&&built.archer.h===713&&built.archer.parts===2,'レンの脚・弓腕を分割');
 ok(built.fighter.ok&&built.fighter.w===480&&built.fighter.h===718&&built.fighter.parts===2,'カイの脚・両腕を分割');
 const shot=async name=>{const r=await E.send('Page.captureScreenshot',{format:'png',clip:{x:450,y:245,width:220,height:220,scale:3}});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(r.result.data,'base64'));};
 for(const ch of ['mage','archer','fighter']){
  await E.ev(`(()=>{startAction('${ch}',0);ac.stopped=true;ac.spawnT=99;ac.enemies=[];ac.p.inv=0;ac.p.sp=100;ac.p.x=WW/2;ac.p.y=WH/2+100;ac.cam.x=Math.max(0,ac.p.x-AC_W/2);ac.cam.y=Math.max(0,ac.p.y-AC_H*.58);acResetInput();acDraw();return true;})()`);await shot(ch+'_idle');
  const walk=await E.ev(`(()=>{acKeys.right=true;ac.walkDist=18;let n=0;const f=acDrawRoleWalk;acDrawRoleWalk=function(){n++;return f.apply(this,arguments);};acDraw();acDrawRoleWalk=f;acKeys.right=false;return n;})()`);await shot(ch+'_walk');ok(walk>0,ch+'：移動中に左右脚の歩行動作');
  const attack=await E.ev(`(()=>{const p=ac.p;p.skill=null;p.atkT=0;p.atkCD=0;p.comboT=0;acAction('attack');ac.atkT0=p.atkT;p.atkT*=.48;let n=0;const f=acDrawRoleAttack;acDrawRoleAttack=function(){n++;return f.apply(this,arguments);};acDraw();acDrawRoleAttack=f;return n;})()`);await shot(ch+'_attack');ok(attack>0,ch+'：通常攻撃で腕・武器動作');
  const skill1=await E.ev(`(()=>{const p=ac.p;p.skill=null;p.atkT=0;p.atkCD=0;p.rollT=0;p.sp=100;p.eCD=0;acAction('skill1');ac.atkT0=p.atkT;if(p.skill==='spin')p.skT*=.55;else p.atkT*=.5;let n=0;const f=acDrawRoleAttack;acDrawRoleAttack=function(){n++;return f.apply(this,arguments);};acDraw();acDrawRoleAttack=f;return n;})()`);await shot(ch+'_skill_e');ok(skill1>0,ch+'：Eスキルで役割別動作');
  const skill2=await E.ev(`(()=>{const p=ac.p;p.skill=null;p.atkT=0;p.atkCD=0;p.rollT=0;p.sp=100;p.qCD=0;acAction('skill2');ac.atkT0=p.atkT;if(p.skill==='rush')p.skT*=.5;else p.atkT*=.5;let n=0;const f=acDrawRoleAttack;acDrawRoleAttack=function(){n++;return f.apply(this,arguments);};acDraw();acDrawRoleAttack=f;return n;})()`);await shot(ch+'_skill_q');ok(skill2>0,ch+'：Qスキルで役割別動作');
  const idle=await E.ev(`(()=>{const p=ac.p;p.skill=null;p.atkT=0;p.rollT=0;let n=0;const f=acDrawRoleAttack;acDrawRoleAttack=function(){n++;return f.apply(this,arguments);};acDraw();acDrawRoleAttack=f;return n;})()`);ok(idle===0,ch+'：停止時は元の待機PNGへ復帰');
 }
 // 実際のゲームループへWASD・左クリック・E・Qを送り、動作後も操作可能か確認
 const rect=await E.ev(`(()=>{const r=acCanvas.getBoundingClientRect();return {x:r.left+r.width*.72,y:r.top+r.height*.5};})()`);
 for(const ch of ['mage','archer','fighter']){
  await E.ev(`(()=>{startAction('${ch}',0);ac.spawnT=99;ac.enemies=[];ac.p.inv=0;ac.p.sp=100;window.__wm=window.__am=0;window.__ow=acDrawRoleWalk;window.__oa=acDrawRoleAttack;acDrawRoleWalk=function(){window.__wm++;return window.__ow.apply(this,arguments);};acDrawRoleAttack=function(){window.__am++;return window.__oa.apply(this,arguments);};return true;})()`);await sleep(100);
  await E.send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyD',key:'d'});await sleep(260);await E.send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyD',key:'d'});
  await E.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:rect.x,y:rect.y});await E.send('Input.dispatchMouseEvent',{type:'mousePressed',x:rect.x,y:rect.y,button:'left',buttons:1,clickCount:1});await E.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:rect.x,y:rect.y,button:'left',buttons:0,clickCount:1});await sleep(420);
  await E.ev(`(()=>{ac.p.sp=100;return true;})()`);await E.send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyE',key:'e'});await E.send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyE',key:'e'});await sleep(800);
  await E.ev(`(()=>{ac.p.sp=100;return true;})()`);await E.send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyQ',key:'q'});await E.send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyQ',key:'q'});await sleep(650);
  const live=await E.ev(`(()=>{const r={walk:window.__wm,attack:window.__am,active:!!ac&&!ac.stopped&&!ac.ended,skill:ac.p.skill,finite:[ac.p.x,ac.p.y].every(Number.isFinite)};acDrawRoleWalk=window.__ow;acDrawRoleAttack=window.__oa;return r;})()`);
  ok(live.walk>0&&live.attack>0&&live.active&&live.skill===null&&live.finite,ch+'：実入力の移動・攻撃・E・Q後も操作可能');
 }
 ok(E.errors.length===0,'3キャラの部位動作でJSエラーなし');
 console.log('\n'+pass+' passed, '+fail+' failed');if(E.errors.length)console.log(E.errors.join('\n'));E.close();process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
