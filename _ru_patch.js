// 戦う場所の見た目を「森の中の古代遺跡」に（見た目だけ。当たり判定・移動範囲・攻撃範囲は変えない）
const fs=require('fs'), path=require('path');
const F=path.join(__dirname,'index.html');
let s=fs.readFileSync(F,'utf8').replace(/\r\n/g,'\n');
function rep(a,b,n=1){ const c=s.split(a).length-1; if(c!==n) throw new Error('count '+c+' != '+n+' for: '+a.slice(0,90)); s=s.split(a).join(b); }
function cut(a,b,txt){ const i=s.indexOf(a); if(i<0) throw new Error('start not found: '+a.slice(0,60)); const j=s.indexOf(b,i); if(j<0) throw new Error('end not found: '+b.slice(0,60)); s=s.slice(0,i)+txt+s.slice(j); }
const rd=n=>fs.readFileSync(path.join(__dirname,n),'utf8').replace(/\r\n/g,'\n');

// ===== アクション：地面と門 =====
cut('function acBuildGround(){','// 木と岩（キャラと一緒に奥行き順で描く',rd('_ru_ground.js'));
cut('// 出口のドア：石のアーチ＋木の扉','// ---------- パーティクル',rd('_ru_door.js')+'\n');
// 石柱：見た目の太さを当たり判定（半径12×大きさ）に近づける
rep("    const R=15*s, h=(70+(Math.floor(o.x+o.y)%40))*s, intact=seed%4===0;","    const R=12*s, h=(70+(Math.floor(o.x+o.y)%40))*s, intact=seed%4===0;");
rep("    g.fillStyle='#8e8774'; g.fillRect(o.x-R-7,o.y-12,2*R+14,12); g.fillStyle='#c8c0aa'; g.fillRect(o.x-R-7,o.y-15,2*R+14,4);\n    g.strokeStyle='#4a463a'; g.lineWidth=1; g.strokeRect(o.x-R-7,o.y-15,2*R+14,15);",
    "    g.fillStyle='#8e8774'; g.fillRect(o.x-R-5,o.y-12,2*R+10,12); g.fillStyle='#d2cab4'; g.fillRect(o.x-R-5,o.y-15,2*R+10,4);\n    g.strokeStyle='#4a463a'; g.lineWidth=1; g.strokeRect(o.x-R-5,o.y-15,2*R+10,15);");
rep("  if(k==='pillar') return {w:26*s,h:(70+(Math.floor(o.x+o.y)%40))*s+30};","  if(k==='pillar') return {w:22*s,h:(70+(Math.floor(o.x+o.y)%40))*s+30};");
// 外周の飾り：崩れた石柱（入れない帯の中だけ。当たり判定なし）
rep("  for(let y=200;y<WH-160;y+=280+rnd()*160){ deco.push({k:'wallV',x:12,y,w:90+rnd()*70,s:1}); deco.push({k:'wallV',x:WW-12,y:y+80,w:90+rnd()*70,s:1}); }\n  AC_PROPS=a;",
    "  for(let y=200;y<WH-160;y+=280+rnd()*160){ deco.push({k:'wallV',x:12,y,w:90+rnd()*70,s:1}); deco.push({k:'wallV',x:WW-12,y:y+80,w:90+rnd()*70,s:1}); }\n"
   +"  // 外周の崩れた石柱：足元が入れない帯（上は y<70、左右は x<30）にくる位置だけに置く\n"
   +"  for(let x=230;x<WW-200;x+=300+rnd()*160){ if(Math.abs(x-dx)>(r.ring?190:150)) deco.push({k:'pillar',x,y:62,s:.8+rnd()*.25,deco:true}); }\n"
   +"  for(let y=330;y<WH-200;y+=360+rnd()*200){ deco.push({k:'pillar',x:22,y,s:.75,deco:true}); deco.push({k:'pillar',x:WW-22,y:y+120,s:.75,deco:true}); }\n"
   +"  AC_PROPS=a;");
// ===== アクション：影と画面の明るさ =====
rep("  for(const e of ac.enemies){ if(e.dead) continue;\n    if(e.type==='slime'){","  for(const e of ac.enemies){ if(e.dead) continue;\n    if(e.type==='slime'&&!enemyArtOk('slime')){");
rep("    const gr=g.createRadialGradient(p.x,p.y,0,p.x,p.y,rx);\n    gr.addColorStop(0,'rgba(20,28,12,'+(.34*k)+')');",
    "    const sx0=p.x+rx*.18, gr=g.createRadialGradient(sx0,p.y+1,0,sx0,p.y+1,rx);   // 光は左上から：影は少し右下\n    gr.addColorStop(0,'rgba(20,28,12,'+(.34*k)+')');");
rep("    g.save(); g.fillStyle=gr; g.translate(p.x,p.y); g.scale(1,ry/rx); g.beginPath(); g.arc(0,0,rx,0,Math.PI*2); g.fill(); g.restore(); }",
    "    g.save(); g.fillStyle=gr; g.translate(sx0,p.y+1); g.scale(1,ry/rx); g.beginPath(); g.arc(0,0,rx,0,Math.PI*2); g.fill(); g.restore(); }");
rep("vg.addColorStop(1,boss?'rgba(40,0,20,.5)':'rgba(10,20,10,.38)');","vg.addColorStop(1,boss?'rgba(40,0,20,.42)':'rgba(10,20,10,.26)');");
rep("sun.addColorStop(0,'rgba(255,240,190,.2)');","sun.addColorStop(0,'rgba(255,244,200,.24)');");

// ===== タイピングバトル =====
rep('  <div id="bt-arena">\n','  <div id="bt-arena">\n    <div id="bt-bg" aria-hidden="true"></div>\n');
rep('      <div class="bt-fighter" id="bt-player"></div>','      <div class="bt-fighter" id="bt-player"></div><div class="bt-foot" aria-hidden="true"></div>');
rep('      <div class="bt-fighter" id="bt-enemy"></div>','      <div class="bt-fighter" id="bt-enemy"></div><div class="bt-foot" aria-hidden="true"></div>');
rep("    #bt-arena{min-height:176px !important;padding:6px 10px 6px !important;}",
    "    #bt-arena{min-height:176px !important;padding:6px 10px 6px !important;}\n"+rd('_ru_css.txt'));
// 敵の絵を足元（体の下はし＝y180）で切って、下そろえにする
rep("  en.innerHTML=enemyHtml(e.draw,e.color);",
    "  en.innerHTML=enemyHtml(e.draw,e.color);\n  { const sv=en.querySelector('svg'); if(sv){ sv.setAttribute('viewBox','0 0 200 182'); sv.setAttribute('preserveAspectRatio','xMidYMax meet'); sv.style.overflow='visible'; } }\n  en.dataset.fly=(e.draw==='bat'||e.draw==='ghost')?'1':'';");
rep("function enemySvg(type,c){",rd('_ru_btbg.js')+"function enemySvg(type,c){");
fs.writeFileSync(F,s.replace(/\n/g,'\r\n'),'utf8');
console.log('patched');
