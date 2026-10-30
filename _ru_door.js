// 出口：石造りの門（左右の石柱＋上の横石）。敵がいる間は石の扉が閉じて赤い封印、全滅で扉が上がり、奥がやわらかく光る
//  見た目の幅：柱の外側 ±(w/2+16)。閉じている間の当たり判定（acRects）は ±(w/2+14)、y は 0〜d.y+12 で、柱の足元とそろう
//  ボスの間は門を大きく（高く）して、柱の上にかがり火
function acDrawDoor(g,d){
  const boss=!!(ac.roomDef&&ac.roomDef.ring), x=d.x, y=d.y, w=d.w, t=ac.time;
  // 門は部屋の上はし（y=74）にあり、上は画面の外になるので高さはおさえて横に広げる（y<86 はもともと入れない帯）
  const H=boss?62:56, pw=boss?32:22, xo=w/2+(boss?40:16), xi=xo-pw, top=y-H, k=d.open?Math.min(1,d.openT/.6):0;
  const ease=k*k*(3-2*k);
  acCastShadow(g,x,y+4,xo+16,14,16,6,.3);
  // 門の中（奥は暗い通路。開くと光る）
  g.fillStyle='#1c1810'; g.fillRect(x-xi,top,xi*2,H+4);
  if(ease>0){ const lg=g.createLinearGradient(0,top,0,y); lg.addColorStop(0,'rgba(255,248,214,'+(.9*ease)+')'); lg.addColorStop(1,'rgba(255,214,130,'+(.8*ease)+')');
    g.fillStyle=lg; g.fillRect(x-xi,top,xi*2,H+4); }
  // 石の扉（開くと上に上がる。門の中だけに描く）
  if(ease<1){ g.save(); g.beginPath(); g.rect(x-xi,top,xi*2,H+4); g.clip();
    const sy=top-ease*(H+6), sg=g.createLinearGradient(x-xi,0,x+xi,0); sg.addColorStop(0,'#a8a08a'); sg.addColorStop(.5,'#8a8370'); sg.addColorStop(1,'#625c4c');
    g.fillStyle=sg; g.fillRect(x-xi,sy,xi*2,H+4);
    g.strokeStyle='rgba(40,36,26,.45)'; g.lineWidth=1.2;
    for(let i=1;i<4;i++){ const yy=sy+(H+4)*i/4; g.beginPath(); g.moveTo(x-xi,yy); g.lineTo(x+xi,yy); g.stroke(); }
    g.beginPath(); g.moveTo(x,sy); g.lineTo(x,sy+H+4); g.stroke();
    // 刻まれた紋（円と菱形）
    g.strokeStyle='rgba(240,228,196,.35)'; g.lineWidth=1.6; g.beginPath(); g.arc(x,sy+H*.48,15,0,Math.PI*2); g.stroke();
    g.restore();
    if(!d.open){ const a=.55+.25*Math.sin(t*4), cy=top+H*.48;   // 封印
      g.save(); g.globalCompositeOperation='lighter';
      const rg=g.createRadialGradient(x,cy,0,x,cy,30); rg.addColorStop(0,'rgba(255,70,50,'+(a*.6)+')'); rg.addColorStop(1,'rgba(255,40,30,0)');
      g.fillStyle=rg; g.fillRect(x-30,cy-30,60,60); g.restore();
      g.fillStyle='rgba(230,60,45,'+(a+.2)+')'; g.beginPath(); g.moveTo(x,cy-11); g.lineTo(x+9,cy); g.lineTo(x,cy+11); g.lineTo(x-9,cy); g.closePath(); g.fill(); }
  }
  // 左右の石柱（ブロックを積む。左の面が明るい）
  for(const sd of [-1,1]){ const px=sd<0?x-xo:x+xi;
    const cg=g.createLinearGradient(px,0,px+pw,0); cg.addColorStop(0,'#ddd5bf'); cg.addColorStop(.55,'#b3aa92'); cg.addColorStop(1,'#7a735f');
    g.fillStyle=cg; g.fillRect(px,top,pw,H+6);
    g.strokeStyle='rgba(50,46,34,.5)'; g.lineWidth=1; g.strokeRect(px,top,pw,H+6);
    for(let yy=y-22;yy>top+6;yy-=24){ g.beginPath(); g.moveTo(px,yy); g.lineTo(px+pw,yy); g.stroke(); }
    g.fillStyle='#8e8774'; g.fillRect(px-4,y-2,pw+8,8); g.strokeRect(px-4,y-2,pw+8,8);   // 台座
    g.fillStyle='rgba(98,132,56,.75)'; acBlob(g,px+pw*(sd<0?.3:.7),y-10,9,Math.floor(px),6); g.fill();   // 根元の苔
  }
  // 上の横石（要石つき）
  const lt=top-18, lw=xo*2+16;
  const lg2=g.createLinearGradient(0,lt,0,top); lg2.addColorStop(0,'#e4dcc6'); lg2.addColorStop(1,'#9c947e');
  g.fillStyle=lg2; g.fillRect(x-lw/2,lt,lw,18); g.strokeStyle='rgba(50,46,34,.55)'; g.lineWidth=1.2; g.strokeRect(x-lw/2,lt,lw,18);
  g.fillStyle='#cfc6ae'; g.beginPath(); g.moveTo(x-11,lt-4); g.lineTo(x+11,lt-4); g.lineTo(x+7,top+2); g.lineTo(x-7,top+2); g.closePath(); g.fill(); g.stroke();
  g.fillStyle='rgba(98,132,56,.7)'; acBlob(g,x-lw/2+14,lt+2,10,7,7); g.fill(); acBlob(g,x+lw/2-22,lt,7,11,6); g.fill();
  // ボスの間：かがり火
  if(boss) for(const sd of [-1,1]){ const fx=x+sd*(xo+20), fy=y-34, f=Math.sin(t*9+sd)*2;   // 門の両わきに立つかがり火（足元も入れない帯の中）
    acCastShadow(g,fx,y+6,14,5,6,3,.3);
    g.fillStyle='#6a6252'; g.fillRect(fx-4,fy+8,8,y+6-(fy+8)); g.fillStyle='#8e8774'; g.fillRect(fx-9,y+2,18,6);
    g.fillStyle='#4a443a'; g.beginPath(); g.moveTo(fx-12,fy); g.lineTo(fx+12,fy); g.lineTo(fx+7,fy+10); g.lineTo(fx-7,fy+10); g.closePath(); g.fill();
    g.save(); g.globalCompositeOperation='lighter';
    const fg=g.createRadialGradient(fx,fy-6,0,fx,fy-6,46); fg.addColorStop(0,'rgba(255,200,90,.55)'); fg.addColorStop(1,'rgba(255,120,30,0)'); g.fillStyle=fg; g.fillRect(fx-46,fy-52,92,92);
    g.fillStyle='rgba(255,170,60,.9)'; g.beginPath(); g.moveTo(fx-7,fy+2); g.quadraticCurveTo(fx-6,fy-12,fx+f,fy-22); g.quadraticCurveTo(fx+6,fy-10,fx+7,fy+2); g.closePath(); g.fill();
    g.fillStyle='rgba(255,240,180,.9)'; g.beginPath(); g.ellipse(fx,fy-4,3,6,0,0,Math.PI*2); g.fill(); g.restore(); }
  // 開いた門：足元のやわらかい光と「次の部屋へ」
  if(ease>0){ const pu=.85+.15*Math.sin(t*3);
    g.save(); g.globalCompositeOperation='lighter';
    const fg=g.createRadialGradient(x,y+16,0,x,y+16,110); fg.addColorStop(0,'rgba(255,224,140,'+(.38*ease*pu)+')'); fg.addColorStop(1,'rgba(255,200,90,0)');
    g.fillStyle=fg; g.save(); g.translate(x,y+16); g.scale(1,.35); g.translate(-x,-(y+16)); g.beginPath(); g.arc(x,y+16,110,0,Math.PI*2); g.fill(); g.restore();
    const ag=g.createRadialGradient(x,top+H*.5,0,x,top+H*.5,xo*1.4); ag.addColorStop(0,'rgba(255,236,170,'+(.28*ease*pu)+')'); ag.addColorStop(1,'rgba(255,210,120,0)');
    g.fillStyle=ag; g.fillRect(x-xo*1.4,top+H*.5-xo*1.4,xo*2.8,xo*2.8); g.restore();
    const lb=ac.room>=ac.rooms?'出口へ':'次の部屋へ', by=y+46+Math.sin(t*4)*3;
    g.font='bold 14px "Noto Serif JP",serif'; g.textAlign='center';
    const tw=g.measureText(lb).width+30;
    g.fillStyle='rgba(30,22,10,.72)'; g.beginPath(); if(g.roundRect) g.roundRect(x-tw/2,by-15,tw,24,12); else g.rect(x-tw/2,by-15,tw,24); g.fill();
    g.fillStyle='#ffe6a0'; g.fillText('▲ '+lb,x,by+2);
  }
}
