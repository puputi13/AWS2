// ===== タイピングバトルの背景：森の中の古代遺跡（SVGを重ねる。光は左上から）=====
//  キャラの足元は上から 134px（アリーナ上の余白6px＋キャラの枠128px）。地面は 100px から下
const BT_GROUND_Y=100;
function btBgSvg(w,h,body){ return 'url("data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none">'+body+'</svg>')+'")'; }
function btBuildBg(){
  const el=document.getElementById('bt-bg'); if(!el) return;
  const stone=(x,y,w,h,l)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="hsl(40,9%,'+l+'%)" stroke="rgba(60,54,40,.45)" stroke-width="1"/>';
  // 左：崩れた石柱と倒れた石
  const left=btBgSvg(220,140,
    '<ellipse cx="70" cy="128" rx="62" ry="7" fill="rgba(40,36,20,.22)"/>'
    +stone(26,118,52,10,62)+stone(30,112,44,7,74)
    +'<path d="M36 112 L36 46 L44 38 L52 46 L60 36 L68 44 L68 112 Z" fill="url(#c)" stroke="rgba(60,54,40,.5)"/>'
    +'<path d="M43 108 L43 52 M52 108 L52 48 M61 108 L61 50" stroke="rgba(70,64,48,.3)" stroke-width="1.4"/>'
    +'<path d="M36 70 Q30 86 38 100 Q34 84 40 72 Z M66 58 Q74 76 66 92 Q70 74 64 62 Z" fill="#7aa050" opacity=".85"/>'
    +'<g transform="rotate(-8 140 120)">'+stone(108,104,62,22,66)+stone(112,98,54,7,76)+'</g>'
    +'<ellipse cx="128" cy="100" rx="14" ry="5" fill="#86ac5a" opacity=".8"/><ellipse cx="34" cy="120" rx="16" ry="5" fill="#86ac5a" opacity=".7"/>'
    +'<defs><linearGradient id="c" x1="0" x2="1"><stop offset="0" stop-color="#e6dfcb"/><stop offset=".55" stop-color="#bdb49c"/><stop offset="1" stop-color="#8a826c"/></linearGradient></defs>');
  // 右：くずれかけた石のアーチ
  const right=btBgSvg(220,140,
    '<ellipse cx="150" cy="128" rx="64" ry="7" fill="rgba(40,36,20,.22)"/>'
    +'<path d="M150 124 L150 34 L184 34 L184 124 Z" fill="url(#a)" stroke="rgba(60,54,40,.5)"/>'
    +[0,1,2,3].map(i=>'<path d="M150 '+(46+i*22)+' L184 '+(46+i*22)+'" stroke="rgba(70,64,48,.35)"/>').join('')
    +'<path d="M150 40 Q118 34 98 52 L106 60 Q122 46 150 50 Z" fill="#cfc7b0" stroke="rgba(60,54,40,.5)"/>'
    +'<path d="M98 52 L92 46 L100 44 Z" fill="#b8b098"/>'
    +stone(144,120,48,8,64)+stone(80,116,22,12,60)
    +'<path d="M184 40 Q192 70 182 104 Q188 72 178 46 Z M152 36 Q140 52 146 70 Q146 52 156 40 Z" fill="#7aa050" opacity=".85"/>'
    +'<ellipse cx="166" cy="34" rx="20" ry="6" fill="#86ac5a" opacity=".85"/>'
    +'<defs><linearGradient id="a" x1="0" x2="1"><stop offset="0" stop-color="#e6dfcb"/><stop offset=".55" stop-color="#bdb49c"/><stop offset="1" stop-color="#8a826c"/></linearGradient></defs>');
  // 奥の森（明るくかすんだ緑）
  let trees=''; for(let i=0;i<9;i++){ const x=i*40+(i%2)*12, r=26+(i*7)%14; trees+='<circle cx="'+x+'" cy="'+(56-r*.4)+'" r="'+r+'" fill="'+(i%2?'#9fbe88':'#8cb078')+'"/>'; }
  const forest=btBgSvg(360,80,'<rect y="52" width="360" height="28" fill="#93b47e"/>'+trees+'<rect y="62" width="360" height="18" fill="#a6c290" opacity=".7"/>');
  // 地面：石畳を奥ほどせまく（遠近）。模様はうすく
  let lines=''; [6,16,30,50,78].forEach(y=>{ lines+='<line x1="0" y1="'+y+'" x2="100" y2="'+y+'" stroke="rgba(90,80,58,.2)" stroke-width="1" vector-effect="non-scaling-stroke"/>'; });
  for(let i=-6;i<=16;i++){ const x0=i*10-25; lines+='<line x1="'+(50+(x0-50)*.35)+'" y1="0" x2="'+(50+(x0-50)*1.6)+'" y2="100" stroke="rgba(90,80,58,.16)" stroke-width="1" vector-effect="non-scaling-stroke"/>'; }
  const floor=btBgSvg(100,100,'<defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9d1ba"/><stop offset="1" stop-color="#c3b89c"/></linearGradient>'
    +'<linearGradient id="l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff8e0" stop-opacity=".22"/><stop offset=".6" stop-color="#fff8e0" stop-opacity="0"/></linearGradient></defs>'
    +'<rect width="100" height="100" fill="url(#f)"/>'+lines+'<rect width="100" height="100" fill="url(#l)"/>'
    +'<rect width="100" height="5" fill="#7d9e5a" opacity=".45"/><ellipse cx="8" cy="92" rx="10" ry="5" fill="#86ac5a" opacity=".35"/><ellipse cx="93" cy="70" rx="8" ry="4" fill="#86ac5a" opacity=".3"/>');
  const G=BT_GROUND_Y;
  el.style.backgroundImage=[left,right,floor,forest,'linear-gradient(#cfe5f0 0%,#e9f1e4 '+G+'px)'].join(',');
  el.style.backgroundSize='220px 140px,220px 140px,100% calc(100% - '+G+'px),360px 80px,100% 100%';
  el.style.backgroundPosition='left -6px top 0,right -6px top 0,left 0 top '+G+'px,left 0 top '+(G-58)+'px,0 0';
  el.style.backgroundRepeat='no-repeat,no-repeat,no-repeat,repeat-x,no-repeat';
}
btBuildBg();
