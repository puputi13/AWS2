// アクション攻撃予告の回帰確認：再開始・終了・予告完了・撃破・部屋移動
const {openEdge,sleep}=require('./_img_lib');
const path=require('path');
const url='file:///'+path.resolve(__dirname,'index.html').replace(/\\/g,'/');
let pass=0,fail=0;
function ok(c,m){ console.log((c?'OK  ':'FAIL')+' '+m); c?pass++:fail++; }
(async()=>{
  const E=await openEdge(9441,url);
  await E.send('Page.reload'); await sleep(2200);
  await E.ev(`(()=>{ profile=defaultProfile('tele-test'); profile.xp=5000; return true; })()`);

  // 短時間に開始し直し、古い requestAnimationFrame が新しい状態へ触れないことを確認
  await E.ev(`(async()=>{ for(const ch of ['self','mage','archer','fighter','self','mage']){ startAction(ch,0); await new Promise(r=>setTimeout(r,20)); } return true; })()`);
  await sleep(350);
  const restarted=await E.ev(`(()=>({active:!!ac&&!ac.stopped,ch:ac&&ac.ch.id,time:ac&&ac.time}))()`);
  ok(restarted.active&&restarted.ch==='mage'&&restarted.time>=0,'アクション再開始を繰り返しても最新の状態だけが進行');
  ok(E.errors.length===0,'再開始後も描画エラーなし');

  // 正規の敵攻撃経路で円形予告を開始し、dur 到達後に発動・除去されることを確認
  const begun=await E.ev(`(()=>{ ac.spawnT=99; ac.enemies=[]; const e=acMakeEnemy('golem',false,0); e.x=ac.p.x+220; e.y=ac.p.y-120; e.state='idle'; e.t=99; ac.enemies=[e]; acEnemyAttack(e); const t=ac.tele[0]; return {count:ac.tele.length,kind:t.kind,r:t.r,dur:t.dur,start:t.t}; })()`);
  ok(begun.count===1&&begun.kind==='circle'&&begun.r===130&&begun.dur===1&&begun.start>=0,'攻撃予告が従来の半径・時間で開始');
  const ended=await E.ev(`(()=>{ const was=ac.paused; ac.paused=true; for(let i=0;i<25;i++) acUpdate(.05); const r={tele:ac.tele.length,active:!!ac&&!ac.stopped,time:ac.time}; ac.paused=was; return r; })()`);
  ok(ended.tele===0&&ended.active,'攻撃予告が終了時に発動して除去され、描画が継続');
  ok(E.errors.length===0,'攻撃予告の開始から終了まで描画エラーなし');

  // 予告中に画面を離れ、再入場しても古い予告・古いループが残らないことを確認
  await E.ev(`(()=>{ const e=ac.enemies[0]; e.state='idle'; acEnemyAttack(e); showActionSelect(); return {left:ac===null}; })()`);
  await sleep(250);
  await E.ev(`(()=>{ startAction('self',0); return true; })()`); await sleep(300);
  const reentered=await E.ev(`(()=>({tele:ac.tele.length,active:!!ac&&!ac.stopped}))()`);
  ok(reentered.active&&reentered.tele===0,'予告中の退場と再入場で古い予告状態を持ち越さない');
  ok(E.errors.length===0,'入退場後も描画エラーなし');

  // 敵を通常のダメージ処理で倒し、強化選択後に開いたドアを通って次の部屋へ進む
  await E.ev(`(()=>{ ac.spawnT=0; ac.fought=true; ac.roomDone=false; ac.enemies=[]; const e=acMakeEnemy('goblin',false,0); e.x=ac.p.x+80; e.y=ac.p.y-80; e.state='idle'; e.t=99; e.hp=1; e.max=1; ac.enemies=[e]; acHitEnemy(e,10,0,'',0); return e.dead; })()`);
  const killed=await E.ev(`(()=>{ const was=ac.paused; ac.paused=true; for(let i=0;i<25;i++) acUpdate(.05); const r={defeated:ac.defeated,roomDone:ac.roomDone,boon:!!ac.boonPick}; ac.paused=was; return r; })()`);
  ok(killed.defeated===1&&killed.roomDone&&killed.boon,'敵撃破後に部屋クリア処理まで進行');
  await E.ev(`(()=>{ acPickBoon(ac.boonPick.opts[0]); ac.p.x=ac.door.x; ac.p.y=ac.door.y+130; acUpdate(.02); ac.p.x=ac.door.x; ac.p.y=ac.door.y; acUpdate(.02); for(let i=0;i<20;i++) acUpdate(.05); return true; })()`);
  const moved=await E.ev(`(()=>({room:ac.room,tele:ac.tele.length,ptele:ac.ptele.length,trans:!!ac.trans,active:!ac.stopped}))()`);
  ok(moved.room===2&&!moved.trans&&moved.tele===0&&moved.ptele===0&&moved.active,'開いたドアを通り、予告を残さず次の部屋へ移動');
  ok(E.errors.length===0,'撃破と部屋移動後も描画エラーなし');

  console.log('\n'+pass+' passed, '+fail+' failed');
  if(E.errors.length) console.log(E.errors.join('\n'));
  E.close(); process.exit(fail?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
