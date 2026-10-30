// 遺跡の見た目の確認：当たり判定が変わっていないか（変更前のファイルと比べる）＋画面を撮る
const {openEdge,sleep}=require('./_img_lib');
const path=require('path'), fs=require('fs'), os=require('os');
const OUT=path.join(__dirname,'_shots'); fs.mkdirSync(OUT,{recursive:true});
const NEWF='file:///'+path.resolve(__dirname,'index.html').replace(/\\/g,'/');
// 変更前のファイルは同じフォルダに一時コピー（画像を同じ場所から読むため）
fs.copyFileSync(path.join(os.tmpdir(),'index_before_ruins.html'),path.join(__dirname,'_old.html'));
const OLDF='file:///'+path.resolve(__dirname,'_old.html').replace(/\\/g,'/');
let pass=0, fail=0; function ok(c,m){ if(c){pass++;console.log('OK  ',m);} else {fail++;console.log('FAIL',m);} }
// 全ステージ・全部屋で、格子点ごとの acBlocked（半径16）と扉の位置を文字列にする
const SIG=`(()=>{ profile=defaultProfile('t'); profile.xp=5000; saveProfile(profile); const out=[];
  for(let si=0;si<AC_STAGES.length;si++){ startAction('self',si); for(let i=0;i<ac.stageRooms.length;i++){ acEnterRoom(i);
    let s=WW+'x'+WH+'|'+ac.door.x+','+ac.door.y+','+ac.door.w+'|';
    for(let y=0;y<WH;y+=12) for(let x=0;x<WW;x+=12) s+=acBlocked(x,y,16)?'1':'0';
    ac.door.open=true; for(let y=0;y<200;y+=6) for(let x=0;x<WW;x+=6) s+=acBlocked(x,y,16)?'1':'0';
    out.push(s); } ac.stopped=true; }
  return out; })()`;
(async()=>{
  const O=await openEdge(9421,OLDF); await O.send('Page.reload'); await sleep(2500);
  const sOld=await O.ev(SIG); O.close();
  const E=await openEdge(9423,NEWF);
  await E.send('Emulation.setDeviceMetricsOverride',{width:1100,height:820,deviceScaleFactor:1,mobile:false});
  await E.send('Page.reload'); await sleep(2500);
  const sNew=await E.ev(SIG);
  ok(sOld.length===sNew.length&&sOld.every((v,i)=>v===sNew[i]),'当たり判定・移動範囲・扉の位置が全ステージの全部屋で変更前と同じ ('+sNew.length+'部屋)');
  const shot=async n=>{ await sleep(400); const r=await E.send('Page.captureScreenshot',{format:'png'}); fs.writeFileSync(path.join(OUT,n),Buffer.from(r.result.data,'base64')); };
  // 部屋1：4人の味方と敵を並べる（味方は1人ずつしか出ないので、1人目で撮り、残りは別の撮影）
  const setup=(ch,room,extra)=>`(async()=>{ startAction('${ch}',0); await new Promise(r=>setTimeout(r,300)); acEnterRoom(${room}); ac.spawnT=99; ac.msgT=0;
    const p=ac.p; p.x=WW/2; p.y=WH/2+150; p.inv=0; ac.cam.x=Math.max(0,Math.min(WW-AC_W,p.x-AC_W/2)); ac.cam.y=Math.max(0,Math.min(WH-AC_H,p.y-AC_H*.58));
    ac.enemies=[]; const L=${JSON.stringify(extra)}; for(const [t,dx,dy,b] of L){ const e=acMakeEnemy(t,!!b,0); e.x=p.x+dx; e.y=p.y+dy; e.state='idle'; e.t=99; e.face=dx<0?1:-1; ac.enemies.push(e); }
    ac.fought=true; return 1; })()`;
  await E.ev(setup('self',0,[['slime',-230,-60],['goblin',-110,-170],['bat',90,-190],['golem',240,-70]]));
  await E.ev(`(()=>{ const e=ac.enemies[3]; acEnemyAttack(e); const g=ac.enemies[1]; acEnemyAttack(g); return 1; })()`);
  await E.ev(`(()=>{ ac.paused=true; return 1; })()`).catch(()=>0);
  await shot('room1_self.png');
  for(const ch of ['mage','archer','fighter']){ await E.ev(setup(ch,0,[['slime',-200,-80],['goblin',150,-120]])); await shot('room1_'+ch+'.png'); }
  // 魔法弾が見えるか（ルナで撃つ）
  await E.ev(setup('mage',0,[['golem',0,-260]])); await E.ev(`(()=>{ ac.p.dir=-Math.PI/2; acAction('attack'); return 1; })()`); await sleep(350); await shot('room1_magic.png');
  // 門（閉じている・開いている）
  await E.ev(`(()=>{ startAction('self',0); acEnterRoom(0); ac.spawnT=99; ac.msgT=0; const p=ac.p; p.x=ac.door.x-60; p.y=200; ac.cam.x=Math.max(0,Math.min(WW-AC_W,p.x-AC_W/2)); ac.cam.y=0; ac.enemies=[acMakeEnemy('goblin',false,0)]; ac.enemies[0].x=p.x+150; ac.enemies[0].y=260; ac.enemies[0].state='idle'; ac.enemies[0].t=99; return 1; })()`);
  await shot('door_closed.png');
  await E.ev(`(()=>{ ac.enemies=[]; ac.door.open=true; ac.door.openT=1; return 1; })()`); await shot('door_open.png');
  // 部屋2・ボスの間
  await E.ev(setup('self',1,[['ghost',-160,-120],['bat',160,-140]])); await shot('room2.png');
  await E.ev(`(()=>{ startAction('self',0); acEnterRoom(2); ac.spawnT=99; ac.msgT=0; const p=ac.p; p.x=WW/2; p.y=WH/2+200; ac.cam.x=Math.max(0,Math.min(WW-AC_W,p.x-AC_W/2)); ac.cam.y=Math.max(0,Math.min(WH-AC_H,p.y-AC_H*.58));
    const b=acMakeEnemy('golem',true,0); b.x=WW/2; b.y=WH*.42; b.state='idle'; b.t=99; ac.enemies=[b]; return 1; })()`); await shot('boss.png');
  await E.ev(`(()=>{ ac.enemies=[]; const p=ac.p; p.y=230; ac.cam.y=0; ac.door.open=true; ac.door.openT=1; return 1; })()`); await shot('boss_door.png');
  await E.ev(`(()=>{ ac.stopped=true; return 1; })()`);
  // タイピングバトル
  for(const [st,t] of [[1,'slime'],[2,'goblin'],[4,'bat'],[5,'golem']]){
    await E.ev(`(()=>{ startBattle(); bt.stage=${st}; spawnEnemy(); return 1; })()`); await sleep(1300); await shot('bt_'+t+'.png'); }
  const al=await E.ev(`(()=>{ const a=document.getElementById('bt-pimg').getBoundingClientRect(), b=document.querySelector('#bt-enemy svg').getBoundingClientRect(); return [Math.round(a.bottom),Math.round(b.bottom)]; })()`);
  ok(Math.abs(al[0]-al[1])<=3,'バトル：味方と敵の足元の高さ '+al);
  await E.ev(`(()=>{ bt.over=true; clearInterval(bt.timer); return 1; })()`);
  await E.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await E.ev(`(()=>{ startBattle(); bt.stage=2; spawnEnemy(); return 1; })()`); await sleep(1300); await shot('bt_390.png');
  await E.ev(`(()=>{ bt.over=true; clearInterval(bt.timer); return 1; })()`);
  ok(E.errors.length===0,'JSエラーなし '+E.errors.join(' / '));
  console.log('\n'+pass+' passed, '+fail+' failed');
  E.close(); fs.unlinkSync(path.join(__dirname,'_old.html')); process.exit(0);
})().catch(e=>{ console.error(e); try{fs.unlinkSync(path.join(__dirname,'_old.html'));}catch(_){} process.exit(1); });
