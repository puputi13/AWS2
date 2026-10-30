// 古代遺跡の最終確認：見た目以外の戦闘ロジックを変更前と比較し、完成画面を撮る
const {openEdge,sleep}=require('./_img_lib');
const fs=require('fs'), path=require('path'), os=require('os');
const OUT=path.join(__dirname,'_final_shots'); fs.mkdirSync(OUT,{recursive:true});
const OLD=path.join(__dirname,'_old.html'); fs.copyFileSync(path.join(os.tmpdir(),'index_before_ruins.html'),OLD);
const file=p=>'file:///'+p.replace(/\\/g,'/');
let pass=0,fail=0; const ok=(c,m)=>{console.log((c?'OK  ':'FAIL')+' '+m); c?pass++:fail++;};
const logic=`(()=>({
  dims:[AC_W,AC_H], enemies:ENEMIES, speed:AC_SPEED, range:AC_RANGE,
  rooms:AC_ROOMS.map(r=>({name:r.name,W:r.W,H:r.H,entry:r.entry,door:r.door,D:r.D,path:r.path,pools:r.pools,walls:r.walls,props:r.props,enemies:r.enemies,ring:!!r.ring})),
  stages:AC_STAGES,
  attack:(()=>{ profile=defaultProfile('attack-check'); profile.xp=5000; startAction('self',0); ac.stopped=true; ac.spawnT=99; ac.enemies=[]; acMouse.on=false; const spd=ac.p.spd; acAction('attack'); return {atkT:ac.p.atkT,atkCD:ac.p.atkCD,mR:ac.p.mR,mHalf:ac.p.mHalf,mDmg:ac.p.mDmg,mKb:ac.p.mKb,mStop:ac.p.mStop,spd}; })(),
  funcs:['acBlocked','acRects','acStartTrans','acTransStep','acSpawnRoom','acMakeEnemy','acEnemyAttack','acResolveTele'].map(n=>String(window[n]))
}))()`;
const grid=`(()=>{ profile=defaultProfile('t'); const out=[];
 for(let si=0;si<AC_STAGES.length;si++){ startAction('self',si); for(let ri=0;ri<ac.stageRooms.length;ri++){ acEnterRoom(ri);
  let a=''; for(let y=0;y<WH;y+=9) for(let x=0;x<WW;x+=9) a+=acBlocked(x,y,16)?'1':'0';
  const closed=JSON.stringify(acRects()); ac.door.open=true; const opened=JSON.stringify(acRects());
  out.push([WW,WH,ac.door.x,ac.door.y,ac.door.w,closed,opened,a].join('|')); }
  ac.stopped=true; }
 return out; })()`;
(async()=>{
 const O=await openEdge(9431,file(OLD)); await O.send('Page.reload'); await sleep(2300); const lo=await O.ev(logic), go=await O.ev(grid); O.close();
 const E=await openEdge(9433,file(path.join(__dirname,'index.html'))); await E.send('Emulation.setDeviceMetricsOverride',{width:1100,height:820,deviceScaleFactor:1,mobile:false}); await E.send('Page.reload'); await sleep(2500);
 const ln=await E.ev(logic), gn=await E.ev(grid);
 ok(JSON.stringify(lo.dims)===JSON.stringify(ln.dims),'画面内の移動座標系は変更前と同じ');
 ok(JSON.stringify(lo.enemies)===JSON.stringify(ln.enemies),'敵のHP・攻撃力・間隔・報酬は変更前と同じ');
 ok(JSON.stringify(lo.speed)===JSON.stringify(ln.speed)&&JSON.stringify(lo.range)===JSON.stringify(ln.range),'敵の速度・攻撃距離は変更前と同じ');
 ok(JSON.stringify(lo.rooms)===JSON.stringify(ln.rooms)&&JSON.stringify(lo.stages)===JSON.stringify(ln.stages),'全部屋・全ステージの構造と敵構成は変更前と同じ');
 ok(lo.funcs.every((v,i)=>v===ln.funcs[i]),'地形判定・敵AI・ドア移動の関数は変更前と同じ');
 ok(JSON.stringify(lo.attack)===JSON.stringify(ln.attack),'剣士の攻撃力・範囲・間隔・移動速度は変更前と同じ');
 ok(go.length===gn.length&&go.every((v,i)=>v===gn[i]),'30部屋の格子点当たり判定とドア開閉判定は変更前と同じ');
 const shot=async n=>{ await sleep(350); const r=await E.send('Page.captureScreenshot',{format:'png'}); fs.writeFileSync(path.join(OUT,n),Buffer.from(r.result.data,'base64')); };
 // 1部屋目：味方・敵・赤い予告・青い魔法弾が同時に見える完成画面
 await E.ev(`(()=>{ profile=defaultProfile('t'); profile.xp=5000; startAction('mage',0); acEnterRoom(0); ac.spawnT=99; ac.msgT=0; ac.p.inv=0;
   const p=ac.p; p.x=WW/2; p.y=WH/2+145; p.dir=-Math.PI/2; ac.cam.x=Math.max(0,Math.min(WW-AC_W,p.x-AC_W/2)); ac.cam.y=Math.max(0,Math.min(WH-AC_H,p.y-AC_H*.58));
   ac.enemies=[]; for(const [t,dx,dy] of [['slime',-245,-50],['goblin',-120,-165],['bat',100,-190],['golem',235,-55]]){ const e=acMakeEnemy(t,false,0); e.x=p.x+dx;e.y=p.y+dy;e.state='idle';e.t=99;e.face=dx<0?1:-1;ac.enemies.push(e); }
   const go=ac.enemies.find(e=>e.type==='golem'); acTele({kind:'circle',x:go.x,y:go.y,r:130,dur:1,dmg:10,owner:go,act:'slam'});
   ac.pshots.push({kind:'magic',x:p.x+35,y:p.y-90,vx:0,vy:-1,r:9,life:10,dmg:1,hit:new Set(),pierce:false,aoe:0}); ac.fought=true; return 1; })()`);
 await shot('room1_complete.png');
 // 同じ部屋で4人の大きさ・足元を一覧確認
 for(const ch of ['self','mage','archer','fighter']){ await E.ev(`(()=>{ const old=ac; startAction('${ch}',0); acEnterRoom(0); ac.spawnT=99; ac.msgT=0; ac.p.inv=0; ac.p.x=WW/2;ac.p.y=WH/2+120; ac.cam.x=Math.max(0,Math.min(WW-AC_W,ac.p.x-AC_W/2));ac.cam.y=Math.max(0,Math.min(WH-AC_H,ac.p.y-AC_H*.58)); ac.enemies=[]; return 1; })()`); await shot('room1_${ch}.png'); }
 // 門の閉・開。敵を残す／全滅させる
 await E.ev(`(()=>{ startAction('self',0); acEnterRoom(0); ac.spawnT=99; ac.msgT=0; ac.p.inv=0; ac.p.x=ac.door.x;ac.p.y=205;ac.cam.x=Math.max(0,Math.min(WW-AC_W,ac.p.x-AC_W/2));ac.cam.y=0; const e=acMakeEnemy('goblin',false,0);e.x=ac.p.x+160;e.y=235;e.state='idle';e.t=99;ac.enemies=[e]; return 1; })()`); await shot('door_closed.png');
 await E.ev(`(()=>{ ac.enemies=[];ac.door.open=true;ac.door.openT=1;return 1;})()`); await shot('door_open.png');
 // ボス部屋：円形石床と大きい門・ボスを同じ画面へ
 await E.ev(`(()=>{ startAction('self',0); acEnterRoom(2);ac.spawnT=99;ac.msgT=0;ac.p.inv=0; ac.p.x=WW/2;ac.p.y=410;ac.cam.x=Math.max(0,Math.min(WW-AC_W,ac.p.x-AC_W/2));ac.cam.y=0;
   const b=acMakeEnemy('golem',true,0);b.x=WW/2+180;b.y=265;b.state='idle';b.t=99;ac.enemies=[b];return 1;})()`); await shot('boss_room.png');
 // タイピングバトル、通常とボス
 await E.ev(`(()=>{ startBattle();bt.stage=2;spawnEnemy();return 1;})()`);await sleep(1200);await shot('typing_normal.png');
 await E.ev(`(()=>{ bt.stage=5;spawnEnemy();return 1;})()`);await sleep(1200);await shot('typing_boss.png');
 const feet=await E.ev(`(()=>{ const a=document.getElementById('bt-pimg').getBoundingClientRect(),b=document.querySelector('#bt-enemy svg').getBoundingClientRect(),fa=document.querySelector('#bt-player + .bt-foot').getBoundingClientRect(),fb=document.querySelector('#bt-enemy + .bt-foot').getBoundingClientRect();return {char:[Math.round(a.bottom),Math.round(b.bottom)],shadow:[Math.round(fa.top),Math.round(fb.top)]};})()`);
 ok(Math.abs(feet.char[0]-feet.char[1])<=3&&Math.abs(feet.shadow[0]-feet.shadow[1])<=3,'タイピングバトルの味方・敵・影の接地線が一致 '+JSON.stringify(feet));
 ok(E.errors.length===0,'JSエラーなし '+E.errors.join(' / '));
 console.log('\n'+pass+' passed, '+fail+' failed');
 E.close(); fs.unlinkSync(OLD); process.exit(fail?1:0);
})().catch(e=>{ console.error(e); try{fs.unlinkSync(OLD)}catch(_){} process.exit(1); });
