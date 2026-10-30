// Enter後の3・2・1・GO中はお題を隠し、開始・キャンセル時に戻す
const {openEdge,sleep}=require('./_img_lib');
const path=require('path'),fs=require('fs');
const url='file:///'+path.resolve(__dirname,'index.html').replace(/\\/g,'/');
let pass=0,fail=0;const ok=(c,m)=>{console.log((c?'OK  ':'FAIL')+' '+m);c?pass++:fail++;};
(async()=>{
 const E=await openEdge(9541,url);await E.send('Emulation.setDeviceMetricsOverride',{width:1024,height:768,deviceScaleFactor:1,mobile:false});await E.send('Page.reload');await sleep(2200);
 await E.ev(`(()=>{profile=defaultProfile('countdown-test');playerName='countdown-test';showGame();typearea.focus();return true;})()`);
 const waiting=await E.ev(`(()=>{const s=document.getElementById('screen-game');return {waiting:s.classList.contains('waiting'),prompt:getComputedStyle(document.getElementById('prompt-box')).visibility,input:getComputedStyle(typearea).visibility,hint:getComputedStyle(document.getElementById('ty-ready')).visibility,text:document.getElementById('ty-ready').textContent};})()`);
 ok(waiting.waiting&&waiting.prompt==='hidden'&&waiting.input==='hidden'&&waiting.hint==='visible'&&waiting.text.includes('Enter'),'Enter待ちはお題と入力欄を隠し、開始案内だけ表示');
 const waitShot=await E.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(__dirname,'_typing_waiting_hidden.png'),Buffer.from(waitShot.result.data,'base64'));
 await E.send('Input.dispatchKeyEvent',{type:'keyDown',code:'Enter',key:'Enter'});await E.send('Input.dispatchKeyEvent',{type:'keyUp',code:'Enter',key:'Enter'});await sleep(120);
 const during=await E.ev(`(()=>{const s=document.getElementById('screen-game');return {counting:s.classList.contains('counting'),overlay:cdOverlay.style.display,prompt:getComputedStyle(document.getElementById('prompt-box')).visibility,input:getComputedStyle(typearea).visibility,hint:getComputedStyle(document.getElementById('ty-ready')).visibility,num:cdNum.textContent,active:gameActive};})()`);
 ok(during.counting&&during.overlay==='flex'&&during.prompt==='hidden'&&during.input==='hidden'&&during.hint==='hidden'&&!during.active,'カウントダウン中はお題・入力欄・次キー案内を非表示');
 const shot=await E.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(__dirname,'_typing_countdown_hidden.png'),Buffer.from(shot.result.data,'base64'));
 await sleep(3600);
 const after=await E.ev(`(()=>{const s=document.getElementById('screen-game');return {counting:s.classList.contains('counting'),prompt:getComputedStyle(document.getElementById('prompt-box')).visibility,input:getComputedStyle(typearea).visibility,active:gameActive,focus:document.activeElement.id};})()`);
 ok(!after.counting&&after.prompt==='visible'&&after.input==='visible'&&after.active&&after.focus==='typearea','GO終了後にお題を表示し入力開始');
 const cancel=await E.ev(`(()=>{gameActive=false;startCountdown();cancelCountdown();return {counting:document.getElementById('screen-game').classList.contains('counting'),prompt:getComputedStyle(document.getElementById('prompt-box')).visibility,overlay:cdOverlay.style.display,readonly:typearea.readOnly};})()`);
 ok(!cancel.counting&&cancel.prompt==='visible'&&cancel.overlay==='none'&&!cancel.readonly,'途中キャンセル時もお題を表示可能な状態へ復帰');
 ok(E.errors.length===0,'カウントダウン表示でJSエラーなし');
 console.log('\n'+pass+' passed, '+fail+' failed');if(E.errors.length)console.log(E.errors.join('\n'));E.close();process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
