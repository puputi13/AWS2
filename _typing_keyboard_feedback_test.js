// タイピング入力：正解、誤入力、IME警告、次キー表示を実ブラウザーで確認
const {openEdge,sleep}=require('./_img_lib');
const path=require('path'),fs=require('fs');
const url='file:///'+path.resolve(__dirname,'index.html').replace(/\\/g,'/');
let pass=0,fail=0;const ok=(c,m)=>{console.log((c?'OK  ':'FAIL')+' '+m);c?pass++:fail++;};
(async()=>{
 const E=await openEdge(9531,url);await E.send('Emulation.setDeviceMetricsOverride',{width:1024,height:768,deviceScaleFactor:1,mobile:false});await E.send('Page.reload');await sleep(2200);
 await E.ev(`(()=>{profile=defaultProfile('typing-test');playerName='typing-test';showGame();cancelCountdown();tyWaiting=false;gameActive=true;timeLeft=30;sessionKeys=sessionMiss=0;currentPrompt='cat';currentDisplay='ねこ';typedLength=0;typearea.value='';renderPrompt();typearea.focus();tyActiveHint('',false,0);return true;})()`);
 const initial=await E.ev(`(()=>({focus:document.activeElement.id,hint:document.getElementById('ty-ready').textContent}))()`);
 ok(initial.focus==='typearea'&&initial.hint.includes('C'),'入力欄へフォーカスし、最初に押すCキーを表示');
 await E.send('Input.insertText',{text:'c'});await sleep(80);
 const correct=await E.ev(`(()=>({value:typearea.value,typed:typedLength,hint:document.getElementById('ty-ready').textContent}))()`);
 ok(correct.value==='c'&&correct.typed===1&&correct.hint.includes('A'),'正解キーCを受け付け、次のAキーを表示');
 const before=await E.ev(`(()=>({time:timeLeft,miss:sessionMiss}))()`);await E.send('Input.insertText',{text:'u'});await sleep(80);
 const wrong=await E.ev(`(()=>({value:typearea.value,time:timeLeft,miss:sessionMiss,hint:document.getElementById('ty-ready').textContent,warn:document.getElementById('ty-ready').classList.contains('warn')}))()`);
 ok(wrong.value==='c'&&wrong.time===before.time-3&&wrong.miss===before.miss+1&&wrong.warn&&wrong.hint.includes('U は違います')&&wrong.hint.includes('A'),'誤入力Uを明示し、次の正解Aを表示');
 const shot=await E.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(__dirname,'_typing_keyboard_feedback.png'),Buffer.from(shot.result.data,'base64'));
 const ime=await E.ev(`(()=>{const t=timeLeft,m=sessionMiss;typearea.dispatchEvent(new CompositionEvent('compositionstart'));typearea.value='あ';typearea.dispatchEvent(new InputEvent('input',{data:'あ',inputType:'insertCompositionText',isComposing:true}));typearea.dispatchEvent(new CompositionEvent('compositionend'));return {time:timeLeft,t,miss:sessionMiss,m,value:typearea.value,hint:document.getElementById('ty-ready').textContent};})()`);
 ok(ime.time===ime.t&&ime.miss===ime.m&&ime.value===''&&ime.hint.includes('日本語入力をOFF'),'IME入力は減点せず、半角英数への切替を案内');
 ok(E.errors.length===0,'タイピング入力表示でJSエラーなし');
 console.log('\n'+pass+' passed, '+fail+' failed');if(E.errors.length)console.log(E.errors.join('\n'));E.close();process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
