const text=(v)=>v==null?'':String(v);
const pick=(o,names)=>{for(const n of names){const v=o?.[n];if(v!==undefined&&v!==null&&String(v).trim()!=='')return v;}return ''};
function props(obj){try{return obj?.getAllProperties?.()||{}}catch{return {}}}

function normaliseMessage(msg,folderName){
  const p=props(msg);
  const subject=text(pick(p,['subject','Subject','PidTagSubject','0x0037001F','displayName']));
  const body=text(pick(p,['body','Body','PidTagBody','0x1000001F','bodyHtml','htmlBody']));
  const sender=text(pick(p,['senderEmailAddress','SenderEmailAddress','PidTagSenderEmailAddress','sentRepresentingEmailAddress','senderName']));
  const received=pick(p,['messageDeliveryTime','MessageDeliveryTime','PidTagMessageDeliveryTime','clientSubmitTime','creationTime']);
  const to=text(pick(p,['displayTo','DisplayTo','PidTagDisplayTo']));
  const cc=text(pick(p,['displayCc','DisplayCc','PidTagDisplayCc']));
  const messageId=text(pick(p,['internetMessageId','InternetMessageId','PidTagInternetMessageId']));
  let receivedIso=null;
  try{if(received)receivedIso=new Date(received).toISOString()}catch{}
  return {subject,body,sender,to,cc,received:receivedIso,messageId,folderName};
}

function walkFolder(folder,out,onProgress){
  let name='';
  try{name=folder.displayName||props(folder).displayName||''}catch{}
  let offset=0;
  while(true){
    let entries=[];
    try{entries=folder.getContents(offset,250)||[]}catch{break}
    if(!entries.length)break;
    for(const e of entries){
      try{
        const m=folder.getMessage(e.nid);
        out.push(normaliseMessage(m,name));
        if(onProgress&&out.length%25===0)onProgress({stage:'parsing',messages:out.length});
      }catch{}
    }
    offset+=entries.length;
    if(entries.length<250)break;
  }
  try{
    if(folder.hasSubfolders){
      for(const e of folder.getSubFolderEntries()||[]){
        try{walkFolder(folder.getSubFolder(e.nid),out,onProgress)}catch{}
      }
    }
  }catch{}
}

function readableError(err){
  const name=String(err?.name||'');
  const msg=String(err?.message||err||'');
  return name==='NotReadableError'||/could not be read|permission problems|not readable/i.test(msg);
}

async function readWithStream(file,onProgress){
  if(!file.stream)throw new Error('stream-unavailable');
  const reader=file.stream().getReader();
  const chunks=[];
  let total=0;
  while(true){
    const {done,value}=await reader.read();
    if(done)break;
    const chunk=value instanceof Uint8Array?value:new Uint8Array(value);
    chunks.push(chunk);
    total+=chunk.byteLength;
    if(onProgress)onProgress({stage:'reading',bytes:total,totalBytes:file.size});
  }
  const merged=new Uint8Array(total);
  let offset=0;
  for(const chunk of chunks){merged.set(chunk,offset);offset+=chunk.byteLength;}
  return merged.buffer;
}

function readWithFileReader(file,onProgress){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onprogress=e=>{if(e.lengthComputable&&onProgress)onProgress({stage:'reading',bytes:e.loaded,totalBytes:e.total});};
    reader.onerror=()=>reject(reader.error||new Error('Browser could not read the PST file.'));
    reader.onabort=()=>reject(new Error('PST reading was cancelled.'));
    reader.onload=()=>resolve(reader.result);
    reader.readAsArrayBuffer(file);
  });
}

async function fileToArrayBuffer(file,onProgress){
  if(!file)throw new Error('Select a PST file first.');
  if(!/\.pst$/i.test(file.name||''))throw new Error('Please select an Outlook .pst file.');
  if(!file.size)throw new Error('The selected PST is empty. Export it again from Classic Outlook.');
  let firstError=null;
  try{return await readWithStream(file,onProgress)}catch(e){firstError=e;}
  try{return await readWithFileReader(file,onProgress)}catch(e){
    if(readableError(e)||readableError(firstError)){
      const err=new Error('Windows is still locking this PST file. Close Classic Outlook completely, wait about 10 seconds, then select the same PST again. You do NOT need to export it again.');
      err.code='PST_LOCKED';
      throw err;
    }
    throw e;
  }
}

export async function readPst(file,onProgress){
  const buffer=await fileToArrayBuffer(file,onProgress);
  if(onProgress)onProgress({stage:'opening',bytes:file.size,totalBytes:file.size});
  let PST;
  try{PST=await import('pst-parser')}catch{throw new Error('The PST parser could not load. Redeploy MDCT after replacing package.json and lib/pst-import.js.');}
  let pst;
  try{pst=new PST.PSTFile(buffer)}catch(e){throw new Error(`The PST was read, but Outlook data could not be opened: ${e?.message||'unsupported/corrupt PST format'}`)}
  const store=pst.getMessageStore();
  const root=store.getRootFolder();
  const out=[];
  walkFolder(root,out,onProgress);
  if(!out.length)throw new Error('The PST opened successfully, but no email messages were found. Make sure you exported the MDCT Historical folder and included subfolders.');
  return out;
}
