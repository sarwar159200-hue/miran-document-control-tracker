import {parseEmail} from './email-parser';

const pick=(o,names)=>{for(const n of names){const v=o?.[n]; if(v!==undefined&&v!==null&&String(v).trim()!=='') return v;} return ''};
const text=(v)=>v==null?'':String(v);

function props(obj){try{return obj?.getAllProperties?.()||{}}catch{return {}}}
function normaliseMessage(msg, folderName){
  const p=props(msg);
  const subject=text(pick(p,['subject','Subject','PidTagSubject','0x0037001F','displayName']));
  const body=text(pick(p,['body','Body','PidTagBody','0x1000001F','bodyHtml','htmlBody']));
  const sender=text(pick(p,['senderEmailAddress','SenderEmailAddress','PidTagSenderEmailAddress','sentRepresentingEmailAddress','senderName']));
  const received=pick(p,['messageDeliveryTime','MessageDeliveryTime','PidTagMessageDeliveryTime','clientSubmitTime','creationTime']);
  const to=text(pick(p,['displayTo','DisplayTo','PidTagDisplayTo']));
  const cc=text(pick(p,['displayCc','DisplayCc','PidTagDisplayCc']));
  const messageId=text(pick(p,['internetMessageId','InternetMessageId','PidTagInternetMessageId']));
  return {subject,body,sender,to,cc,received:received?new Date(received).toISOString():null,messageId,folderName,raw:p};
}
function walkFolder(folder, out, onProgress){
  let name=''; try{name=folder.displayName||props(folder).displayName||''}catch{}
  let offset=0;
  while(true){let entries=[];try{entries=folder.getContents(offset,250)||[]}catch{break} if(!entries.length)break;
    for(const e of entries){try{const m=folder.getMessage(e.nid);out.push(normaliseMessage(m,name)); if(onProgress&&out.length%50===0)onProgress(out.length)}catch{}}
    offset+=entries.length; if(entries.length<250)break;
  }
  try{if(folder.hasSubfolders){for(const e of folder.getSubFolderEntries()||[]){try{walkFolder(folder.getSubFolder(e.nid),out,onProgress)}catch{}}}}catch{}
}
export async function readPst(file,onProgress){
  const PST=await import('pst-parser');
  const buffer=await file.arrayBuffer();
  const pst=new PST.PSTFile(buffer);
  const store=pst.getMessageStore();
  const root=store.getRootFolder();
  const out=[]; walkFolder(root,out,onProgress); return out;
}
export function analyzeMessage(m){
  const parsed=parseEmail({subject:m.subject||'',bodyPreview:m.body||'',from:{emailAddress:{address:m.sender||''}},receivedDateTime:m.received||null,webLink:null,id:m.messageId||null,hasAttachments:false});
  return parsed;
}
