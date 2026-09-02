const STAGES=['IFR','IFA','IFC','IFU','IFI','IFD','IFP','RLM','AB'];
const CONTRACTORS=['Enerflex','ILF','Technomak','Emerson','ENKA','Havatek','IGCC','Specserv'];
const DOC_RE=/\bMR-(?:EPF|SRU|BPP|WP2)-\d{3}-(?:[A-Z0-9]{1,4}-)?[A-Z]{2}-[A-Z&]{2,4}-\d{4}\b/gi;

function clean(s=''){return String(s).replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim()}
function uniq(a){return [...new Set(a.filter(Boolean))]}
function detectStage(text){
 const upper=text.toUpperCase();
 const direct=STAGES.find(x=>new RegExp(`\\b${x}\\b`,'i').test(text)); if(direct)return direct;
 const phrases=[['IFR','ISSUED FOR REVIEW'],['IFA','ISSUED FOR APPROVAL'],['IFC','ISSUED FOR CONSTRUCTION'],['IFU','ISSUED FOR USE'],['IFI','ISSUED FOR INFORMATION'],['IFD','ISSUED FOR DESIGN'],['IFP','ISSUED FOR PURCHASE'],['RLM','RED-LINE MARKUP'],['AB','AS-BUILT']];
 return phrases.find(x=>upper.includes(x[1]))?.[0]||null;
}
function titleNear(text,doc){
 const i=text.toUpperCase().indexOf(doc); if(i<0)return null;
 let s=text.slice(i+doc.length,i+doc.length+180).replace(/^\s*[-–—:|]+\s*/,'');
 s=s.split(/\b(?:REV(?:ISION)?|IFR|IFA|IFC|IFU|IFI|IFD|IFP|CODE\s*[-:]?\s*[1-4]|TRANSMITTAL)\b/i)[0];
 s=s.replace(/[|;]+.*$/,'').trim().replace(/^[-–—:]+|[-–—:]+$/g,'').trim();
 return s.length>=5&&s.length<=120?s:null;
}
export function parseEmail(m,attachmentNames=[]){
  const subject=clean(m.subject), body=clean(m.body?.content||m.bodyPreview||''), attach=attachmentNames.join(' ');
  const text=`${subject}\n${body}\n${attach}`;
  const docs=uniq(text.match(DOC_RE)||[]).map(x=>x.toUpperCase());
  const lower=text.toLowerCase();
  const stage=detectStage(text);
  const codeMatch=text.match(/\b(?:code\s*[-:]?\s*)([1-4])\b/i);
  const returnCode=codeMatch?Number(codeMatch[1]):null;
  const revMatch=text.match(/\b(?:rev(?:ision)?\.?\s*[:#-]?\s*)(AB\d+|\d+\.\d+|[A-Z]+|\d+)\b/i);
  const revision=revMatch?revMatch[1].toUpperCase():null;
  const transMatch=text.match(/\b(?:transmittal(?:\s*(?:no\.?|number))?)\s*[:#-]?\s*([A-Z0-9][A-Z0-9._\/-]{3,})/i);
  const transmittal=transMatch?transMatch[1].replace(/[),.;]+$/,''):null;
  const contractor=CONTRACTORS.find(c=>lower.includes(c.toLowerCase()))||null;
  const sender=(m.from?.emailAddress?.address||'').toLowerCase();
  const isDccSender=sender==='lazo.rizkar@miranenergy.com'||lower.includes('lazo.rizkar@miranenergy.com');
  const isRelevant=isDccSender||docs.length>0||/\b(transmittal|document control|document controller|IFR|IFA|IFC|revision|code[- ]?[1-4])\b/i.test(text);
  let confidence='LOW'; if(docs.length&&stage&&(revision||returnCode))confidence='HIGH'; else if(docs.length&&(stage||returnCode||revision))confidence='MEDIUM';
  const documentTitles=Object.fromEntries(docs.map(d=>[d,titleNear(text,d)]));
  return {isRelevant,confidence,documents:docs,documentTitles,stage,returnCode,revision,transmittal,contractor,attachmentNames};
}
