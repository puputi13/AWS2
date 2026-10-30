// Vercelへ出力したdist単体でHTMLと全PNGが読み込めるか確認
const {openEdge,sleep}=require('./_img_lib');
const path=require('path');
const url='file:///'+path.resolve(__dirname,'dist/index.html').replace(/\\/g,'/');
let pass=0,fail=0;const ok=(c,m)=>{console.log((c?'OK  ':'FAIL')+' '+m);c?pass++:fail++;};
(async()=>{
 const E=await openEdge(9561,url);await E.send('Page.reload');await sleep(2600);
 const r=await E.ev(`(()=>{const heroes=['sword','mage','archer','fighter'].map(j=>!!heroArtFor('ready',j));const enemies=['slime','bat','goblin','golem'].map(enemyArtOk);profile=defaultProfile('vercel-test');playerName='vercel-test';showHome();return {title:document.title,heroes,enemies,home:document.getElementById('screen-home').style.display,relative:['sword','mage','archer','fighter'].map(j=>heroArtCfg(j,'ready').src).concat(Object.values(ENEMY_ART)).every(s=>!!s&&!s.startsWith('/'))};})()`);
 ok(r.title&&r.home==='flex','dist/index.htmlからゲーム画面を開ける');
 ok(r.heroes.every(Boolean),'味方PNG 4枚をdistから読み込める');
 ok(r.enemies.every(Boolean),'敵PNG 4枚をdistから読み込める');
 ok(r.relative,'全PNGをindex.htmlからの相対URLで参照');
 ok(E.errors.length===0,'静的公開版でJSエラーなし');
 console.log('\n'+pass+' passed, '+fail+' failed');if(E.errors.length)console.log(E.errors.join('\n'));E.close();process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
