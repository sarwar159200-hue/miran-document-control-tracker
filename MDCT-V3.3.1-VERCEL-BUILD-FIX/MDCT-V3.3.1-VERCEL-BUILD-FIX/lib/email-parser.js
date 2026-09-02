const STAGES=['IFR','IFA','IFC','IFU','IFI','IFD','IFP','RLM','AB'];
const CONTRACTORS=['Enerflex','ILF','Technomak','Emerson','ENKA','Havatek','IGCC','Specserv','Flowserve'];
const DOC_RE=/\bMR-(?:EPF|SRU|BPP|WP2)-\d{3}-(?:[A-Z0-9]{1,4}-)?[A-Z]{2}-[A-Z&]{2,4}-\d{4}\b/gi;
const IGNORE_EXT=/\.(?:png|jpe?g|gif|bmp|svg|ico|vcf)$/i;

function clean(s=''){return String(s).replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim()}
function uniq(a){return [...new Set(a.filter(Boolean))]}
function detectStage(text){
 const upper=text.toUpperCase();
 const direct=STAGES.find(x=>new RegExp(`\\b${x}\\b`,'i').test(text)); if(direct)return direct;
 const phrases=[['IFR','ISSUED FOR REVIEW'],['IFA','ISSUED FOR APPROVAL'],['IFC','ISSUED FOR CONSTRUCTION'],['IFU','ISSUED FOR USE'],['IFI','ISSUED FOR INFORMATION'],['IFD','ISSUED FOR DESIGN'],['IFP','ISSUED FOR PURCHASE'],['RLM','RED-LINE MARKUP'],['AB','AS-BUILT']];
 return phrases.find(x=>upper.includes(x[1]))?.[0]||null;
}
function detectRevision(text){
 const m=text.match(/\b(?:rev(?:ision)?\.?\s*[:#-]?\s*)(AB\d+|\d+\.\d+|[A-Z]+|\d+)\b/i);if(m)return m[1].toUpperCase();
 const n=text.match(/(?:^|[\s_\-.])(AB\d+|\d+\.\d+|[A-Z]|\d{1,2})(?=[\s_\-.](?:IFR|IFA|IFC|IFU|IFI|IFD|IFP|RLM|AB|pdf|dwg|docx?|xlsx?|xls|zip)|\.[a-z0-9]{2,5}$)/i);return n?n[1].toUpperCase():null;
}
function stripExt(s=''){return s.replace(/\.[a-z0-9]{2,6}$/i,'')}
function titleFromAttachment(name,doc){
 let s=String(name).split(' :: ').pop()||name;s=stripExt(s);s=s.replace(new RegExp(doc.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'ig'),' ');
 s=s.replace(/\b(?:REV(?:ISION)?\.?\s*[:#-]?\s*)?(?:AB\d+|\d+\.\d+|[A-Z]|\d{1,2})\b/ig,' ').replace(/\b(?:IFR|IFA|IFC|IFU|IFI|IFD|IFP|RLM|AB)\b/ig,' ');
 s=s.replace(/[_|]+/g,' ').replace(/[-–—]+/g,' ').replace(/\s+/g,' ').trim();return s.length>=4&&s.length<=180?s:null;
}
function titleNear(text,doc){
 const i=text.toUpperCase().indexOf(doc); if(i<0)return null;
 let s=text.slice(i+doc.length,i+doc.length+180).replace(/^\s*[-–—:|]+\s*/,'');
 s=s.split(/\b(?:REV(?:ISION)?|IFR|IFA|IFC|IFU|IFI|IFD|IFP|CODE\s*[-:]?\s*[1-4]|TRANSMITTAL)\b/i)[0];
 s=s.replace(/[|;]+.*$/,'').trim().replace(/^[-–—:]+|[-–—:]+$/g,'').trim();return s.length>=5&&s.length<=120?s:null;
}
function eventFromAttachment(name,global){
 const docs=uniq(String(name).match(DOC_RE)||[]).map(x=>x.toUpperCase());
 return docs.map(doc=>({documentNumber:doc,attachmentName:name,title:titleFromAttachment(name,doc),revision:detectRevision(name)||global.revision,stage:detectStage(name)||global.stage,returnCode:global.returnCode}));
}
function classifyDirection({sender,to,cc,subject,body,returnCode,stage}){
 const s=String(sender||'').toLowerCase(),recipients=`${to||''} ${cc||''}`.toLowerCase(),t=`${subject||''}\n${body||''}`;
 const isLazo=s.includes('lazo.rizkar@miranenergy.com')||t.toLowerCase().includes('lazo.rizkar@miranenergy.com');
 const colleagues=/\bdear\s+(?:all\s+)?colleagues\b/i.test(t);
 const returnWords=/\b(return(?:ed)?|response|review(?:ed)?|approved|approved with comments|rejected|code\s*[-:]?\s*[1-4]|comments? incorporated)\b/i.test(t);
 let direction='UNKNOWN',reason='insufficient evidence',score=0;
 if(isLazo&&colleagues){direction='SUBMISSION';reason='Lazo + “Dear colleagues” internal circulation pattern';score=95}
 else if(isLazo&&!colleagues&&(returnCode||returnWords)){direction='RETURN';reason='Lazo without “Dear colleagues” + return/review signal';score=90}
 else if(isLazo&&!colleagues&&stage){direction='RETURN';reason='Lazo without “Dear colleagues”; likely outbound return per Miran workflow';score=72}
 else if(colleagues){direction='SUBMISSION';reason='“Dear colleagues” circulation pattern';score=80}
 else if(returnCode||returnWords){direction='RETURN';reason='return/review terminology';score=75}
 // Do not force low-confidence direction. Recipients are retained for manual audit.
 return {direction,directionReason:reason,directionConfidence:score,isLazo,colleagues,recipients};
}

export function parseEmail(m,attachmentNames=[]){
  const subject=clean(m.subject), body=clean(m.body?.content||m.bodyPreview||''), extra=clean(m.attachmentText||''), attach=attachmentNames.join('\n');
  const text=`${subject}\n${body}\n${extra}\n${attach}`;
  const docs=uniq(text.match(DOC_RE)||[]).map(x=>x.toUpperCase()); const lower=text.toLowerCase();
  const stage=detectStage(text); const codeMatch=text.match(/\b(?:code\s*[-:]?\s*)([1-4])\b/i); const returnCode=codeMatch?Number(codeMatch[1]):null;
  const revision=detectRevision(text); const transMatch=text.match(/\b(?:transmittal(?:\s*(?:no\.?|number))?)\s*[:#-]?\s*([A-Z0-9][A-Z0-9._\/-]{3,})/i); const transmittal=transMatch?transMatch[1].replace(/[),.;]+$/,''):null;
  const contractor=CONTRACTORS.find(c=>lower.includes(c.toLowerCase()))||null;
  const sender=(m.from?.emailAddress?.address||'').toLowerCase();
  const direction=classifyDirection({sender,to:m.to,cc:m.cc,subject,body,returnCode,stage});
  const isRelevant=direction.isLazo||docs.length>0||/\b(transmittal|document control|document controller|IFR|IFA|IFC|revision|code[- ]?[1-4])\b/i.test(text);
  let confidence='LOW'; if(docs.length&&direction.direction!=='UNKNOWN'&&(stage||returnCode||revision))confidence='HIGH'; else if(docs.length&&(stage||returnCode||revision||direction.direction!=='UNKNOWN'))confidence='MEDIUM';
  const usableAttachments=attachmentNames.filter(n=>!IGNORE_EXT.test(String(n).split(' :: ').pop()||''));
  const documentEvents=[]; for(const n of usableAttachments)documentEvents.push(...eventFromAttachment(n,{stage,revision,returnCode}));
  // Ensure documents found only in body/subject are not lost.
  const eventDocs=new Set(documentEvents.map(x=>x.documentNumber));
  for(const doc of docs)if(!eventDocs.has(doc))documentEvents.push({documentNumber:doc,attachmentName:null,title:titleNear(text,doc),revision,stage,returnCode});
  const documentTitles=Object.fromEntries(documentEvents.map(e=>[e.documentNumber,e.title||titleNear(text,e.documentNumber)]));
  return {isRelevant,confidence,documents:uniq(documentEvents.map(e=>e.documentNumber)),documentEvents,documentTitles,stage,returnCode,revision,transmittal,contractor,attachmentNames:usableAttachments,...direction};
}
