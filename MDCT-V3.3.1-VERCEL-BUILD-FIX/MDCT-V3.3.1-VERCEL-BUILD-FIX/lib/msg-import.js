const text = (v) => v == null ? '' : String(v);

function getHeader(headers, name) {
  if (!headers) return '';
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = String(headers).match(new RegExp(`^${escaped}:\\s*(.+(?:\\r?\\n[ \\t].+)*)`, 'im'));
  return m ? m[1].replace(/\r?\n[ \t]+/g, ' ').trim() : '';
}

function normaliseDate(info) {
  const raw = info?.messageDeliveryTime || info?.clientSubmitTime || info?.creationTime || getHeader(info?.headers, 'Date');
  if (!raw) return null;
  try { return new Date(raw).toISOString(); } catch { return null; }
}

function recipientText(info) {
  const recipients = Array.isArray(info?.recipients) ? info.recipients : [];
  return recipients.map(r => r?.email || r?.name || '').filter(Boolean).join('; ');
}

function safeName(a){return text(a?.fileName || a?.fileNameShort || '').trim()}
function ext(name=''){const m=String(name).toLowerCase().match(/\.([a-z0-9]{1,8})$/);return m?m[1]:''}
function decodeText(bytes){
  try{return new TextDecoder('utf-8',{fatal:false}).decode(bytes).replace(/\u0000/g,' ')}catch{return ''}
}

async function inspectZip(bytes, prefix, depth=0){
  if(depth>2)return {names:[],texts:[],nested:0};
  try{
    const JSZip=(await import('jszip')).default;
    const zip=await JSZip.loadAsync(bytes);
    const names=[],texts=[]; let nested=0;
    for(const [path,entry] of Object.entries(zip.files)){
      if(entry.dir)continue;
      const label=`${prefix} :: ${path}`;
      names.push(label); nested++;
      const e=ext(path);
      if(['txt','csv','xml','html','htm','log'].includes(e) && (entry._data?.uncompressedSize||0)<2_000_000){
        try{texts.push((await entry.async('string')).slice(0,250000))}catch{}
      } else if(e==='zip' && (entry._data?.uncompressedSize||0)<100_000_000){
        try{const b=await entry.async('uint8array');const z=await inspectZip(b,label,depth+1);names.push(...z.names);texts.push(...z.texts);nested+=z.nested}catch{}
      }
    }
    return {names,texts,nested};
  }catch{return {names:[],texts:[],nested:0}}
}

async function inspectNestedMsg(bytes, prefix, depth=0){
  if(depth>2)return {names:[],texts:[],nested:0};
  try{
    const mod=await import('@kenjiuno/msgreader');
    const MsgReader=mod.default||mod.MsgReader||mod;
    const reader=new MsgReader(bytes instanceof Uint8Array?bytes:new Uint8Array(bytes));
    const info=reader.getFileData();
    if(info?.error)return {names:[],texts:[],nested:0};
    const names=[],texts=[];let nested=0;
    const hdr=[text(info?.subject),text(info?.body||info?.bodyHTML||info?.bodyHtml),text(info?.headers)].filter(Boolean).join('\n');
    if(hdr)texts.push(hdr.slice(0,300000));
    for(const a of info?.attachments||[]){
      const n=safeName(a); if(!n)continue;
      const label=`${prefix} :: ${n}`;names.push(label);nested++;
      try{
        const att=reader.getAttachment(a);const content=att?.content; if(!content)continue;
        const e=ext(n);
        if(e==='msg'){const z=await inspectNestedMsg(content,label,depth+1);names.push(...z.names);texts.push(...z.texts);nested+=z.nested}
        else if(e==='zip'){const z=await inspectZip(content,label,depth+1);names.push(...z.names);texts.push(...z.texts);nested+=z.nested}
        else if(['txt','csv','xml','html','htm'].includes(e) && content.length<2_000_000)texts.push(decodeText(content).slice(0,250000));
      }catch{}
    }
    return {names,texts,nested};
  }catch{return {names:[],texts:[],nested:0}}
}

export async function readMsgFile(file) {
  if (!file || !/\.msg$/i.test(file.name || '')) throw new Error('Not an Outlook .msg file.');
  const arrayBuffer = await file.arrayBuffer();
  const mod = await import('@kenjiuno/msgreader');
  const MsgReader = mod.default || mod.MsgReader || mod;
  const reader = new MsgReader(new Uint8Array(arrayBuffer));
  const info = reader.getFileData();
  if (info?.error) throw new Error(info.error);

  const sender = text(info?.senderEmail || getHeader(info?.headers, 'From') || info?.senderName);
  const subject = text(info?.subject || getHeader(info?.headers, 'Subject'));
  const body = text(info?.body || info?.bodyHTML || info?.bodyHtml || '');
  const messageId = text(getHeader(info?.headers, 'Message-ID'));
  const to = text(getHeader(info?.headers, 'To') || recipientText(info));
  const cc = text(getHeader(info?.headers, 'Cc'));
  const directNames=[]; const deepNames=[]; const deepTexts=[]; let nestedAttachmentCount=0;

  for(const a of info?.attachments||[]){
    const n=safeName(a); if(!n)continue; directNames.push(n);
    // Inspect only container/text attachments. PDF/DWG/DOCX contents are not persisted or uploaded.
    try{
      const e=ext(n); if(!['zip','msg','txt','csv','xml','html','htm'].includes(e))continue;
      const att=reader.getAttachment(a);const content=att?.content;if(!content)continue;
      if(e==='zip'){
        const z=await inspectZip(content,n);deepNames.push(...z.names);deepTexts.push(...z.texts);nestedAttachmentCount+=z.nested;
      }else if(e==='msg'){
        const z=await inspectNestedMsg(content,n);deepNames.push(...z.names);deepTexts.push(...z.texts);nestedAttachmentCount+=z.nested;
      }else if(content.length<2_000_000){deepTexts.push(decodeText(content).slice(0,250000))}
    }catch{}
  }

  return {
    subject, body, sender, to, cc,
    received: normaliseDate(info), messageId,
    folderName: file.webkitRelativePath ? file.webkitRelativePath.split('/').slice(0,-1).join('/') : 'MSG Import',
    sourceFile: file.name, source: 'MSG',
    attachmentNames: [...new Set([...directNames,...deepNames])],
    directAttachmentNames: directNames,
    deepAttachmentNames: deepNames,
    attachmentText: deepTexts.join('\n').slice(0,700000),
    directAttachmentCount: directNames.length,
    nestedAttachmentCount
  };
}

export function filterMsgFiles(fileList) {
  return Array.from(fileList || []).filter(f => /\.msg$/i.test(f.name || ''));
}
