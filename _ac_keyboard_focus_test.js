// 実キーボードとCanvasフォーカス復帰の確認
const {openEdge,sleep}=require('./_img_lib');
const path=require('path');
const url='file:///'+path.resolve(__dirname,'index.html').replace(/\\/g,'/');
let pass=0,fail=0;const ok=(c,m)=>{console.log((c?'OK  ':'FAIL')+' '+m);c?pass++:fail++;};
(async()=>{
 const E=await openEdge(9521,url);await E.send('Emulation.setDeviceMetricsOverride',{width:1100,height:820,deviceScaleFactor:1,mobile:false});await E.send('Page.reload');await sleep(2200);
 await E.ev(`(()=>{profile=defaultProfile('keyboard-test');profile.xp=5000;startAction('self',0);ac.spawnT=99;ac.enemies=[];ac.p.inv=0;return true;})()`);await sleep(120);
 const start=await E.ev(`(()=>({focus:document.activeElement&&document.activeElement.id,x:ac.p.x,y:ac.p.y,paused:ac.paused}))()`);
 ok(start.focus==='ac-canvas'&&!start.paused,'開始時にゲーム画面へキーボードフォーカス');
 await E.send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyD',key:'d'});await sleep(320);await E.send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyD',key:'d'});await sleep(40);
 const moved=await E.ev(`(()=>({x:ac.p.x,key:acKeys.right}))()`);
 ok(moved.x>start.x+20&&!moved.key,'Dキーで右移動し、キーを離すと停止');
 // IDEや別タブへ移った状態を再現。一時停止後、Canvasクリックで安全に再開
 await E.ev(`(()=>{window.dispatchEvent(new Event('blur'));return {paused:ac.paused};})()`);await sleep(50);
 const rect=await E.ev(`(()=>{const r=acCanvas.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
 await E.send('Input.dispatchMouseEvent',{type:'mousePressed',x:rect.x,y:rect.y,button:'left',buttons:1,clickCount:1});await E.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:rect.x,y:rect.y,button:'left',buttons:0,clickCount:1});await sleep(60);
 const resumed=await E.ev(`(()=>({paused:ac.paused,focus:document.activeElement&&document.activeElement.id,y:ac.p.y}))()`);
 ok(!resumed.paused&&resumed.focus==='ac-canvas','一時停止中の画面クリックで再開しフォーカス復帰');
 await E.send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyW',key:'w'});await sleep(260);await E.send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyW',key:'w'});await sleep(40);
 const up=await E.ev(`(()=>({y:ac.p.y,paused:ac.paused}))()`);
 ok(up.y<resumed.y-15&&!up.paused,'フォーカス復帰後もWキーで上移動');
 const actions=await E.ev(`(()=>{ac.p.rollCD=0;ac.p.sp=100;const out=[];for(const [code,key] of [['ShiftLeft','Shift'],['KeyE','e'],['KeyQ','q']])out.push(acKeyAct({code,key}));return out;})()`);
 ok(JSON.stringify(actions)===JSON.stringify(['dash','skill1','skill2']),'Shift・E・Qのキー割り当てが有効');
 ok(E.errors.length===0,'キーボード操作でJSエラーなし');
 console.log('\n'+pass+' passed, '+fail+' failed');if(E.errors.length)console.log(E.errors.join('\n'));E.close();process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
