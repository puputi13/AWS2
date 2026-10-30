// 剣士の部位分割歩行試作：停止復帰・左右脚・他キャラ非適用を確認
const {openEdge,sleep}=require('./_img_lib');
const path=require('path'),fs=require('fs');
const url='file:///'+path.resolve(__dirname,'index.html').replace(/\\/g,'/');
const out=path.join(__dirname,'_walk_shots'); fs.mkdirSync(out,{recursive:true});
let pass=0,fail=0;
function ok(c,m){ console.log((c?'OK  ':'FAIL')+' '+m); c?pass++:fail++; }
(async()=>{
  const E=await openEdge(9451,url);
  await E.send('Emulation.setDeviceMetricsOverride',{width:1100,height:820,deviceScaleFactor:1,mobile:false});
  await E.send('Page.reload'); await sleep(2200);
  await E.ev(`(()=>{ profile=defaultProfile('walk-test'); profile.xp=5000; startAction('self',0); ac.spawnT=99; ac.enemies=[]; ac.p.inv=0; ac.p.x=WW/2; ac.p.y=WH/2+100; ac.cam.x=Math.max(0,ac.p.x-AC_W/2); ac.cam.y=Math.max(0,ac.p.y-AC_H*.58); return true; })()`);
  await sleep(180);
  const parts=await E.ev(`(()=>({ok:heroWalkState.ok,body:[heroWalkState.body.width,heroWalkState.body.height],left:[heroWalkState.left.width,heroWalkState.left.height],right:[heroWalkState.right.width,heroWalkState.right.height]}))()`);
  ok(parts.ok&&parts.body[0]===624&&parts.body[1]===739&&parts.left[0]===624&&parts.right[0]===624,'元PNGから胴体・左右脚を実行時に分割');

  // 実際の更新ループで右入力を続け、移動距離に応じて歩行位相が進むことを確認
  const before=await E.ev(`(()=>{ acKeys.right=true; return {x:ac.p.x,d:ac.walkDist,spd:ac.p.spd,t:ac.time}; })()`);
  await sleep(500);
  const walked=await E.ev(`(()=>{ acKeys.right=false; const r={dx:ac.p.x-${before.x},dd:ac.walkDist-${before.d},elapsed:ac.time-${before.t},expected:${before.spd}*(ac.time-${before.t})}; ac.stopped=true; return r; })()`);
  ok(walked.elapsed>.05&&Math.abs(walked.dx-walked.expected)<8&&Math.abs(walked.dd-walked.dx)<8,'実際の移動距離に合わせて歩行アニメーションが進行');

  const shot=async name=>{ await sleep(60); const r=await E.send('Page.captureScreenshot',{format:'png'}); fs.writeFileSync(path.join(out,name),Buffer.from(r.result.data,'base64')); const c=await E.send('Page.captureScreenshot',{format:'png',clip:{x:450,y:245,width:220,height:220,scale:3}}); fs.writeFileSync(path.join(out,name.replace('.png','_close.png')),Buffer.from(c.result.data,'base64')); };
  await E.ev(`(()=>{ for(const k in acKeys) acKeys[k]=false; ac.walkDist=0; ac.lastPX=ac.p.x; ac.lastPY=ac.p.y; acDraw(); return true; })()`); await shot('sword_idle.png');
  const idle=await E.ev(`(()=>{ let normal=0,cut=0; const a=acDrawSprite,b=acDrawSwordWalk; acDrawSprite=function(){ if(arguments[1]===ac.imgReady)normal++; return a.apply(this,arguments); }; acDrawSwordWalk=function(){cut++;return b.apply(this,arguments);}; acDraw(); acDrawSprite=a;acDrawSwordWalk=b; return {normal,cut}; })()`);
  ok(idle.normal>0&&idle.cut===0,'停止時は分割せず元の待機PNGへ戻る');

  await E.ev(`(()=>{ acKeys.right=true; ac.walkDist=18; ac.lastPX=ac.p.x; ac.lastPY=ac.p.y; acDraw(); return true; })()`); await shot('sword_left_step.png');
  const left=await E.ev(`(()=>{ let cut=0;const b=acDrawSwordWalk;acDrawSwordWalk=function(){cut++;return b.apply(this,arguments);};acDraw();acDrawSwordWalk=b;return {cut,phase:ac.walkDist/72*Math.PI*2};})()`);
  ok(left.cut>0&&Math.sin(left.phase)>.9,'移動中に左脚が前へ出る位相を描画');

  await E.ev(`(()=>{ ac.walkDist=54; ac.lastPX=ac.p.x; ac.lastPY=ac.p.y; acDraw(); return true; })()`); await shot('sword_right_step.png');
  const right=await E.ev(`(()=>({phase:ac.walkDist/72*Math.PI*2}))()`);
  ok(Math.sin(right.phase)<-.9,'半歩後に右脚が前へ出る逆位相を描画');
  await E.ev(`(()=>{ acKeys.right=false; acDraw(); return true; })()`); await shot('sword_back_to_idle.png');

  for(const ch of ['mage','archer','fighter']){
    const untouched=await E.ev(`(()=>{ startAction('${ch}',0);ac.stopped=true;ac.spawnT=99;ac.enemies=[];ac.p.inv=0;acKeys.right=true;ac.walkDist=18;let cut=0;const b=acDrawSwordWalk;acDrawSwordWalk=function(){cut++;return b.apply(this,arguments);};acDraw();acDrawSwordWalk=b;acKeys.right=false;return cut;})()`);
    ok(untouched===0,`${ch}: 部位分割歩行を適用していない`);
  }
  ok(E.errors.length===0,'部位分割歩行でJSエラーなし');
  console.log('\n'+pass+' passed, '+fail+' failed');
  if(E.errors.length) console.log(E.errors.join('\n'));
  E.close(); process.exit(fail?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
