// Edge headless + CDP（テスト用）
const {spawn}=require('child_process'), path=require('path'), os=require('os');
const EDGE='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function openEdge(port,url){
  const UD=path.join(os.tmpdir(),'ttw_img_'+Date.now()+'_'+port);
  const p=spawn(EDGE,['--headless=new','--disable-gpu','--allow-file-access-from-files','--remote-debugging-port='+port,'--user-data-dir='+UD,'about:blank'],{stdio:'ignore'});
  let t=null,lastErr=null;
  for(let i=0;i<20&&!t;i++){
    await sleep(i===0?2500:500);
    try{ t=await (await fetch('http://127.0.0.1:'+port+'/json/new?'+url,{method:'PUT'})).json(); }
    catch(e){ lastErr=e; }
  }
  if(!t){ try{p.kill();}catch(e){} throw lastErr||new Error('Edge debugging port did not open: '+port); }
  const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.onopen=r);
  let mid=0; const pend={}, errors=[];
  ws.onmessage=m=>{ const d=JSON.parse(m.data); if(d.id&&pend[d.id]){pend[d.id](d);delete pend[d.id];}
    if(d.method==='Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?d.params.exceptionDetails.exception.description:d.params.exceptionDetails.text); };
  const send=(method,params={})=>new Promise(res=>{ const id=++mid; pend[id]=res; ws.send(JSON.stringify({id,method,params})); });
  const ev=async e=>{ const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});
    if(r.result.exceptionDetails) throw new Error((r.result.exceptionDetails.exception||{}).description||JSON.stringify(r.result.exceptionDetails)); return r.result.result.value; };
  await send('Runtime.enable'); await send('Page.enable'); await sleep(1200);
  return {send,ev,errors,close:()=>{ ws.close(); p.kill(); }};
}
module.exports={openEdge,sleep};
