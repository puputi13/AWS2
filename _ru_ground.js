function acBuildGround(){
  // 森の中の古代遺跡：中央は広い石畳の広場（色と模様は控えめ）、外周は苔・草・木の根の森の地面
  // 光は左上から。ここで描くのは「平らな物」だけ（当たり判定のある物は acDrawProp / acDrawDoor）
  const c=document.createElement('canvas'); c.width=WW; c.height=WH;
  const g=c.getContext('2d'), rnd=acSeeded(ac&&ac.roomDef?ac.roomDef.seed:42);
  const boss=!!(ac&&ac.roomDef&&ac.roomDef.ring), CX=WW/2, CY=WH/2+60;
  const blob=(x,y,r,col)=>{ const gr=g.createRadialGradient(x,y,0,x,y,r); gr.addColorStop(0,col); gr.addColorStop(1,col.replace(/[\d.]+\)$/,'0)')); g.fillStyle=gr; g.fillRect(x-r,y-r,r*2,r*2); };
  // 1) 森の地面：明るめの苔と草（キャラより彩度を低く）
  g.fillStyle='#71894f'; g.fillRect(0,0,WW,WH);
  for(let i=0;i<70;i++) blob(rnd()*WW,rnd()*WH,90+rnd()*200,rnd()<.5?'rgba(52,74,36,.22)':'rgba(170,186,112,.18)');
  // 2) 石畳の広場：大きめの石を少しずつずらして敷く。目地は細く、面取りは弱く
  const edges=[];
  const tile=(x,y,w,h)=>{ const j=()=>(rnd()-.5)*4, gp=2.2;
    const P=[[x+gp+j(),y+gp+j()],[x+w-gp+j(),y+gp+j()],[x+w-gp+j(),y+h-gp+j()],[x+gp+j(),y+h-gp+j()]];
    g.beginPath(); P.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1])); g.closePath();
    g.fillStyle='hsl('+(36+rnd()*8).toFixed(0)+','+(5+rnd()*5).toFixed(0)+'%,'+(62+rnd()*7).toFixed(0)+'%)'; g.fill();
    g.lineWidth=1.6;
    g.strokeStyle='rgba(255,252,240,.22)'; g.beginPath(); g.moveTo(P[3][0],P[3][1]); g.lineTo(P[0][0],P[0][1]); g.lineTo(P[1][0],P[1][1]); g.stroke();
    g.strokeStyle='rgba(60,56,42,.22)'; g.beginPath(); g.moveTo(P[1][0],P[1][1]); g.lineTo(P[2][0],P[2][1]); g.lineTo(P[3][0],P[3][1]); g.stroke(); };
  for(let y=-10;y<WH+60;){ const rh=78+rnd()*18; let x=-60-rnd()*90;
    while(x<WW+80){ const tw=130+rnd()*70, cx0=x+tw/2, cy0=y+rh/2;
      if(acStoneEdge(cx0,cy0)>0&&Math.hypot(cx0-CX,(cy0-CY)*1.25)>(boss?440:330)){
        g.fillStyle='rgba(96,98,76,.55)'; g.fillRect(x-1,y-1,tw+2,rh+2);   // 目地
        tile(x,y,tw,rh);
        if(rnd()<.12){ g.strokeStyle='rgba(70,64,48,.28)'; g.lineWidth=1; g.beginPath(); let px=x+tw*(.2+rnd()*.3), py=y+rh*(.25+rnd()*.3); g.moveTo(px,py);
          for(let k=0;k<3;k++){ px+=10+rnd()*14; py+=(rnd()-.4)*10; g.lineTo(px,py); } g.stroke(); }
        edges.push([x,y,tw,rh]); }
      x+=tw; }
    y+=rh; }
  // 目地にすこしだけ苔
  for(let i=0;i<260&&edges.length;i++){ const e=edges[Math.floor(rnd()*edges.length)];
    blob(e[0]+(rnd()<.5?0:e[2]),e[1]+rnd()*e[3],6+rnd()*9,'rgba(108,138,62,.45)'); }
  acGroundPlaza(g,rnd,CX,CY,boss);
  acGroundEdge(g,rnd);
  acGroundPools(g);
  acGroundRoots(g,rnd);
  // 3) 光：左上が少し明るく、右下が少し暗い（部屋全体で同じ向き）
  const lg=g.createLinearGradient(0,0,WW,WH); lg.addColorStop(0,'rgba(255,246,214,.10)'); lg.addColorStop(.55,'rgba(255,246,214,0)'); lg.addColorStop(1,'rgba(30,36,20,.10)');
  g.fillStyle=lg; g.fillRect(0,0,WW,WH);
  // 4) 外周の森の影（入れない帯を少し暗く）
  const band=(x0,y0,x1,y1,w,a)=>{ const gr=g.createLinearGradient(x0,y0,x1,y1); gr.addColorStop(0,'rgba(22,36,16,'+a+')'); gr.addColorStop(1,'rgba(22,36,16,0)'); g.fillStyle=gr; };
  band(0,0,0,100,0,.5); g.fillRect(0,0,WW,100);
  band(0,WH,0,WH-50,0,.4); g.fillRect(0,WH-50,WW,50);
  band(0,0,70,0,0,.45); g.fillRect(0,0,70,WH);
  band(WW,0,WW-70,0,0,.45); g.fillRect(WW-70,0,70,WH);
  return c;
}
// 中央の円形広場（同心円の石）。ボスの間は大きく、紋様の輪がうすく光る
function acGroundPlaza(g,rnd,CX,CY,boss){
  const RO=boss?440:340, rings=boss?[[440,350,30],[350,262,24],[262,186,18],[186,112,12],[112,58,8]]:[[340,262,22],[262,186,16],[186,112,12],[112,58,8]];
  g.fillStyle='rgba(30,30,20,.16)'; g.beginPath(); g.ellipse(CX+10,CY+12,RO+14,(RO+14)*.8,0,0,Math.PI*2); g.fill();   // 広場のふちの影（右下）
  g.fillStyle='rgba(96,98,76,.6)'; g.beginPath(); g.ellipse(CX,CY,RO,RO*.8,0,0,Math.PI*2); g.fill();
  rings.forEach(([ro,ri,n],ringI)=>{ for(let k=0;k<n;k++){ const a0=k/n*Math.PI*2+ringI*.2, a1=(k+1)/n*Math.PI*2+ringI*.2, gap=.01;
      const P=(r,a)=>[CX+Math.cos(a)*r,CY+Math.sin(a)*r*.8];
      g.beginPath(); for(let t=0;t<=6;t++){ const q=P(ro-2.5,a0+gap+(a1-a0-2*gap)*t/6); t?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]); }
      for(let t=6;t>=0;t--){ const q=P(ri+2.5,a0+gap+(a1-a0-2*gap)*t/6); g.lineTo(q[0],q[1]); }
      g.closePath();
      // 左上の石ほど明るい（光の向き）
      const lit=-Math.cos((a0+a1)/2+Math.PI*.25)*3;
      g.fillStyle='hsl('+(38+rnd()*6).toFixed(0)+','+(6+rnd()*4).toFixed(0)+'%,'+(64+rnd()*5+(ringI%2)*2+lit).toFixed(0)+'%)'; g.fill();
      g.strokeStyle='rgba(60,56,42,.2)'; g.lineWidth=1.2; g.stroke(); } });
  g.beginPath(); g.ellipse(CX,CY,56,45,0,0,Math.PI*2); g.fillStyle='hsl(40,9%,72%)'; g.fill(); g.strokeStyle='rgba(60,56,42,.25)'; g.lineWidth=1.5; g.stroke();
  // 刻まれた紋様（細く・うすく。赤い予告や魔法が見やすいように）
  g.strokeStyle=boss?'rgba(255,236,170,.32)':'rgba(255,250,232,.2)'; g.lineWidth=boss?2.4:1.6;
  g.beginPath(); g.ellipse(CX,CY,RO-40,(RO-40)*.8,0,0,Math.PI*2); g.stroke();
  g.beginPath(); for(let k=0;k<=8;k++){ const a=k/8*Math.PI*2*3; const q=[CX+Math.cos(a)*44,CY+Math.sin(a)*35]; k?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]); } g.stroke();
  for(let k=0;k<8;k++){ const a=k/8*Math.PI*2; g.beginPath(); g.moveTo(CX+Math.cos(a)*120,CY+Math.sin(a)*96); g.lineTo(CX+Math.cos(a)*176,CY+Math.sin(a)*141); g.stroke(); }
  if(boss) for(let k=0;k<16;k++){ const a=k/16*Math.PI*2, x=CX+Math.cos(a)*(RO-40), y=CY+Math.sin(a)*(RO-40)*.8;   // 輪の上の小さな刻印
    g.fillStyle='rgba(255,236,170,.35)'; g.beginPath(); g.moveTo(x,y-6); g.lineTo(x+5,y); g.lineTo(x,y+6); g.lineTo(x-5,y); g.closePath(); g.fill(); }
  // 広場のふちに苔
  for(let i=0;i<40;i++){ const a=rnd()*Math.PI*2, r=RO*(.92+rnd()*.12); const x=CX+Math.cos(a)*r, y=CY+Math.sin(a)*r*.8, R=8+rnd()*14;
    const gr=g.createRadialGradient(x,y,0,x,y,R); gr.addColorStop(0,'rgba(108,138,62,.5)'); gr.addColorStop(1,'rgba(108,138,62,0)'); g.fillStyle=gr; g.fillRect(x-R,y-R,R*2,R*2); }
}
// 石畳と森の地面のさかい目：草がはみ出し、ところどころに小さな花
function acGroundEdge(g,rnd){
  for(let i=0;i<1000;i++){ const x=rnd()*WW, y=rnd()*WH, e=acStoneEdge(x,y);
    if(e>-24&&e<26){ const r=9+rnd()*20; g.fillStyle='rgba('+(92+rnd()*24).toFixed(0)+','+(120+rnd()*22).toFixed(0)+',64,'+(.45+rnd()*.3).toFixed(2)+')';
      g.beginPath(); g.ellipse(x,y,r,r*.6,0,0,Math.PI*2); g.fill(); } }
  const tuft=(x,y)=>{ g.strokeStyle='rgba(84,118,50,.85)'; g.lineWidth=1.4; g.beginPath();
    for(let k=-2;k<=2;k++){ g.moveTo(x+k*1.6,y); g.lineTo(x+k*2.4+(rnd()-.5)*2,y-4-rnd()*6); } g.stroke();
    g.strokeStyle='rgba(178,206,120,.6)'; g.lineWidth=1; g.beginPath(); g.moveTo(x-1,y); g.lineTo(x-2,y-6); g.stroke(); };
  for(let i=0;i<420;i++){ const x=rnd()*WW, y=rnd()*WH; if(acStoneEdge(x,y)<12) tuft(x,y); }
  for(let i=0;i<46;i++){ const x=rnd()*WW, y=rnd()*WH; if(acStoneEdge(x,y)>-26) continue;
    const cs=['#f6f0c8','#ece0f6','#f6d2da'][Math.floor(rnd()*3)];
    for(let j=0;j<4;j++){ g.fillStyle=cs; g.beginPath(); g.arc(x+(rnd()-.5)*16,y+(rnd()-.5)*10,1.9,0,Math.PI*2); g.fill(); } }
}
// 水盤（池）：石のふちと水面。入れない範囲（AC_POOLS）と同じ位置・大きさ
function acGroundPools(g){
  for(const [x,y,rx,ry] of AC_POOLS){
    g.fillStyle='rgba(20,24,12,.22)'; g.beginPath(); g.ellipse(x+10,y+12,rx+26,ry+20,0,0,Math.PI*2); g.fill();
    const n=18; for(let k=0;k<n;k++){ const a0=k/n*Math.PI*2, a1=(k+1)/n*Math.PI*2-.03;
      g.beginPath(); for(let t=0;t<=4;t++){ const a=a0+(a1-a0)*t/4; g.lineTo(x+Math.cos(a)*(rx+22),y+Math.sin(a)*(ry+18)); }
      for(let t=4;t>=0;t--){ const a=a0+(a1-a0)*t/4; g.lineTo(x+Math.cos(a)*(rx+2),y+Math.sin(a)*(ry+2)); }
      g.closePath(); const lit=Math.sin(a0+Math.PI*.75); g.fillStyle='hsl(40,8%,'+(62+lit*8).toFixed(0)+'%)'; g.fill(); g.strokeStyle='rgba(60,56,42,.3)'; g.lineWidth=1.2; g.stroke(); }
    const wg=g.createLinearGradient(x-rx,y-ry,x+rx,y+ry); wg.addColorStop(0,'#7ab4c0'); wg.addColorStop(1,'#2e6070');
    g.fillStyle=wg; g.beginPath(); g.ellipse(x,y,rx,ry,0,0,Math.PI*2); g.fill();
    g.strokeStyle='rgba(16,34,40,.4)'; g.lineWidth=5; g.beginPath(); g.ellipse(x+2,y+2,rx-3,ry-3,0,Math.PI*1.05,Math.PI*1.95); g.stroke();
    g.strokeStyle='rgba(255,255,255,.4)'; g.lineWidth=2; g.beginPath(); g.ellipse(x-rx*.2,y-ry*.25,rx*.4,ry*.16,0,Math.PI,Math.PI*1.8); g.stroke();
    [[.35,.2],[-.3,.35]].forEach(([fx,fy])=>{ g.fillStyle='#5a8a42'; g.beginPath(); g.arc(x+rx*fx,y+ry*fy,9,.3,Math.PI*2-.3); g.lineTo(x+rx*fx,y+ry*fy); g.fill(); });
  }
}
// 木の根（地面をはう平らな根）・石柱と石壁のまわりのがれき・岩のまわりの苔。どれも当たり判定なし
function acGroundRoots(g,rnd){
  for(const o of AC_PROPS){
    const s=o.s||1;
    if(o.k==='tree'){
      const n=4+Math.floor(rnd()*3);
      for(let i=0;i<n;i++){ const a=(i/n)*Math.PI*2+rnd()*.6, L=(30+rnd()*34)*s, w=7*s;
        const ex=o.x+Math.cos(a)*L, ey=o.y+Math.sin(a)*L*.45+2, mx=o.x+Math.cos(a+.3)*L*.5, my=o.y+Math.sin(a+.3)*L*.25+2;
        g.lineCap='round';
        g.strokeStyle='rgba(30,22,10,.35)'; g.lineWidth=w+2; g.beginPath(); g.moveTo(o.x+2,o.y+3); g.quadraticCurveTo(mx+2,my+3,ex+2,ey+2); g.stroke();
        const rg=g.createLinearGradient(o.x,o.y,ex,ey); rg.addColorStop(0,'#7a5634'); rg.addColorStop(1,'#5a3e22');
        g.strokeStyle=rg; g.lineWidth=w; g.beginPath(); g.moveTo(o.x,o.y+1); g.quadraticCurveTo(mx,my,ex,ey); g.stroke();
        g.strokeStyle='rgba(200,170,120,.35)'; g.lineWidth=w*.3; g.beginPath(); g.moveTo(o.x-1,o.y-1); g.quadraticCurveTo(mx-1,my-2,ex-1,ey-1); g.stroke();
        if(rnd()<.5){ const R=10*s; const gr=g.createRadialGradient(mx,my,0,mx,my,R); gr.addColorStop(0,'rgba(108,138,62,.5)'); gr.addColorStop(1,'rgba(108,138,62,0)'); g.fillStyle=gr; g.fillRect(mx-R,my-R,R*2,R*2); } }
      g.lineCap='butt';
    }else if(o.k==='pillar'){
      for(let i=0;i<5;i++){ const a=rnd()*Math.PI*2, d=(24+rnd()*30)*s, x=o.x+Math.cos(a)*d, y=o.y+Math.sin(a)*d*.5+4, r=(2.5+rnd()*4)*s;
        g.fillStyle='rgba(40,36,26,.28)'; g.beginPath(); g.ellipse(x+1.5,y+1.5,r,r*.6,0,0,Math.PI*2); g.fill();
        g.fillStyle='hsl(40,8%,'+(62+rnd()*10).toFixed(0)+'%)'; g.beginPath(); g.ellipse(x,y,r,r*.6,0,0,Math.PI*2); g.fill(); }
    }else if(o.k==='rock'){
      const R=40*s, gr=g.createRadialGradient(o.x,o.y,0,o.x,o.y,R); gr.addColorStop(0,'rgba(96,128,56,.4)'); gr.addColorStop(1,'rgba(96,128,56,0)'); g.fillStyle=gr; g.fillRect(o.x-R,o.y-R,R*2,R*2);
    }
  }
}
