import {NextResponse} from 'next/server';
import {requireUser} from '../../../../lib/supabase-server';
import {parseEmail} from '../../../../lib/email-parser';
function isoDate(x){try{return x?new Date(x).toISOString().slice(0,10):null}catch{return null}}
async function contractorId(sb,name){if(!name)return null;const {data}=await sb.from('contractors').select('id').ilike('name',name).maybeSingle();return data?.id||null}
async function transmittalId(sb,p,m,cid){if(!p.transmittal)return null;const payload={transmittal_number:p.transmittal,contractor_id:cid,transmittal_date:isoDate(m.received),outlook_email_web_link:null,email_subject:m.subject,email_sender:m.sender||null,direction:p.direction==='RETURN'?'RETURN':'SUBMISSION'};const {data}=await sb.from('transmittals').upsert(payload,{onConflict:'transmittal_number'}).select('id').single();return data?.id||null}
async function ensureDocument(sb,docno,title,cid){let {data:d}=await sb.from('documents').select('id,document_title,contractor_id').eq('document_number',docno).maybeSingle();if(!d){const ins=await sb.from('documents').insert({document_number:docno,document_title:title||null,contractor_id:cid}).select('id').single();return ins.error?null:ins.data}const patch={};if(!d.document_title&&title)patch.document_title=title;if(!d.contractor_id&&cid)patch.contractor_id=cid;if(Object.keys(patch).length)await sb.from('documents').update(patch).eq('id',d.id);return d}
async function findReturnRevision(sb,documentId,revision,stage){let q=sb.from('document_revisions').select('id,revision,issue_status,submitted_date,returned_date').eq('document_id',documentId).is('returned_date',null);if(revision)q=q.eq('revision',revision);if(stage)q=q.eq('issue_status',stage);let {data}=await q.order('submitted_date',{ascending:false}).limit(1).maybeSingle();if(data)return data;if(revision){const r=await sb.from('document_revisions').select('id,revision,issue_status,submitted_date,returned_date').eq('document_id',documentId).eq('revision',revision).order('submitted_date',{ascending:false}).limit(1).maybeSingle();if(r.data)return r.data}const fallback=await sb.from('document_revisions').select('id,revision,issue_status,submitted_date,returned_date').eq('document_id',documentId).is('returned_date',null).order('submitted_date',{ascending:false}).limit(1).maybeSingle();return fallback.data||null}
async function applyRegister(sb,m,p,emailId){
 if(!p.documentEvents?.length)return{applied:0,needs:p.isRelevant?1:0,events:0};let applied=0,needs=0;const cid=await contractorId(sb,p.contractor);const tid=await transmittalId(sb,p,m,cid);
 for(const e of p.documentEvents){const d=await ensureDocument(sb,e.documentNumber,e.title||p.documentTitles?.[e.documentNumber],cid);if(!d){needs++;continue}
   const rev=e.revision||p.revision,stage=e.stage||p.stage;
   if(p.direction==='RETURN'){
     const rv=await findReturnRevision(sb,d.id,rev,stage);if(!rv){needs++;continue}
     const patch={return_transmittal_id:tid,returned_date:isoDate(m.received),return_email_id:emailId,needs_review:p.confidence!=='HIGH'};if(e.returnCode||p.returnCode)patch.return_code=e.returnCode||p.returnCode;
     const {error}=await sb.from('document_revisions').update(patch).eq('id',rv.id);if(error)needs++;else applied++;
   }else if(p.direction==='SUBMISSION'){
     if(!stage||!rev){needs++;continue}
     const payload={document_id:d.id,revision:rev,issue_status:stage,submission_transmittal_id:tid,submitted_date:isoDate(m.received),submission_email_id:emailId,needs_review:p.confidence!=='HIGH'};
     const {error}=await sb.from('document_revisions').upsert(payload,{onConflict:'document_id,revision,issue_status'});if(error)needs++;else applied++;
   }else needs++;
 }
 return{applied,needs,events:p.documentEvents.length}
}
export async function POST(request){try{
 const {sb,user,profile}=await requireUser(request);if(!['SUPER_ADMIN','ADMIN'].includes(profile.role))return NextResponse.json({error:'Admin access required'},{status:403});const {messages=[]}=await request.json();
 let scanned=0,relevant=0,applied=0,needs=0,attachments=0,nested=0,recognizedEvents=0,submissions=0,returns=0,unknown=0;
 for(const m of messages.slice(0,100)){
   scanned++;attachments+=Number(m.directAttachmentCount||m.attachmentNames?.length||0);nested+=Number(m.nestedAttachmentCount||0);
   const graphShape={subject:m.subject||'',bodyPreview:m.body||'',attachmentText:m.attachmentText||'',to:m.to||'',cc:m.cc||'',from:{emailAddress:{address:m.sender||''}},receivedDateTime:m.received||null};
   const p=parseEmail(graphShape,m.attachmentNames||[]);if(p.isRelevant)relevant++;if(p.direction==='SUBMISSION')submissions++;else if(p.direction==='RETURN')returns++;else unknown++;
   const stable=m.messageId||`${m.received||''}|${m.sender||''}|${m.subject||''}`;const graphId=`pst:${Buffer.from(stable).toString('base64url').slice(0,180)}`;
   const payload={user_id:user.id,graph_message_id:graphId,internet_message_id:m.messageId||null,subject:m.subject||null,sender_email:(m.sender||'').toLowerCase()||null,recipient_emails:[m.to,m.cc].filter(Boolean),received_at:m.received||null,web_link:null,is_relevant:p.isRelevant,parse_confidence:p.confidence,parsed_data:{...p,source:m.source||'PST',folder:m.folderName||null,sourceFile:m.sourceFile||null,directAttachmentCount:m.directAttachmentCount||0,nestedAttachmentCount:m.nestedAttachmentCount||0},import_source:m.source||'PST',source_folder:m.folderName||null,updated_at:new Date().toISOString()};
   const {data:em,error}=await sb.from('email_messages').upsert(payload,{onConflict:'user_id,graph_message_id'}).select('id').single();if(!error&&p.isRelevant){const r=await applyRegister(sb,m,p,em.id);applied+=r.applied;needs+=r.needs;recognizedEvents+=r.events}
 }
 return NextResponse.json({scanned,relevant,register_updates:applied,needs_review:needs,attachments_found:attachments,nested_attachments:nested,document_events:recognizedEvents,submission_emails:submissions,return_emails:returns,unknown_direction:unknown});
}catch(e){return NextResponse.json({error:e.message},{status:400})}}
