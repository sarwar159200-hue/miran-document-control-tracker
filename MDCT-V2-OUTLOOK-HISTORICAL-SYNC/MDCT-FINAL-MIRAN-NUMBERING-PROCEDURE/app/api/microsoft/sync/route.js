import { NextResponse } from 'next/server';
import { requireUser } from '../../../../lib/supabase-server';
import { refreshMicrosoft,graph } from '../../../../lib/microsoft';
import { parseEmail } from '../../../../lib/email-parser';

function isoDate(x){return x?new Date(x).toISOString().slice(0,10):null}
async function attachmentNames(token,id,has){if(!has)return[];try{const j=await graph(token,`/me/messages/${encodeURIComponent(id)}/attachments?$select=name`);return (j.value||[]).map(a=>a.name).filter(Boolean)}catch{return[]}}
async function contractorId(sb,name){if(!name)return null;const {data}=await sb.from('contractors').select('id').ilike('name',name).maybeSingle();return data?.id||null}
async function transmittalId(sb,p,m,cid){if(!p.transmittal)return null;const payload={transmittal_number:p.transmittal,contractor_id:cid,transmittal_date:isoDate(m.receivedDateTime||m.sentDateTime),outlook_email_web_link:m.webLink,email_subject:m.subject,email_sender:m.from?.emailAddress?.address||null,direction:p.returnCode?'RETURN':'SUBMISSION'};const {data,error}=await sb.from('transmittals').upsert(payload,{onConflict:'transmittal_number'}).select('id').single();return error?null:data?.id}
async function applyRegister(sb,userId,m,p,emailId){
  if(!p.documents.length) return {applied:0,needs:1}; let applied=0,needs=0; const cid=await contractorId(sb,p.contractor); const tid=await transmittalId(sb,p,m,cid);
  for(const docno of p.documents){
    let {data:d}=await sb.from('documents').select('id').eq('document_number',docno).maybeSingle();
    if(!d){const ins=await sb.from('documents').insert({document_number:docno,document_title:p.documentTitles?.[docno]||null,contractor_id:cid}).select('id').single();if(ins.error){needs++;continue}d=ins.data}else if(p.documentTitles?.[docno]){await sb.from('documents').update({document_title:p.documentTitles[docno],contractor_id:cid||undefined}).eq('id',d.id).is('document_title',null)}
    if(p.returnCode){
      let q=sb.from('document_revisions').select('id,revision,issue_status').eq('document_id',d.id);
      if(p.revision) q=q.eq('revision',p.revision); q=q.order('submitted_date',{ascending:false}).limit(1); const {data:rv}=await q.maybeSingle();
      if(!rv){needs++;continue}
      await sb.from('document_revisions').update({return_transmittal_id:tid,returned_date:isoDate(m.receivedDateTime||m.sentDateTime),return_code:p.returnCode,return_email_id:emailId,needs_review:p.confidence!=='HIGH'}).eq('id',rv.id);applied++;
    }else if(p.stage&&p.revision){
      const payload={document_id:d.id,revision:p.revision,issue_status:p.stage,submission_transmittal_id:tid,submitted_date:isoDate(m.receivedDateTime||m.sentDateTime),submission_email_id:emailId,needs_review:p.confidence!=='HIGH'};
      const {error}=await sb.from('document_revisions').upsert(payload,{onConflict:'document_id,revision,issue_status'}); if(error)needs++;else applied++;
    }else needs++;
  }
  return {applied,needs};
}
export async function POST(request){
  try{
    const {sb,user,profile}=await requireUser(request); if(!['SUPER_ADMIN','ADMIN'].includes(profile.role)) return NextResponse.json({error:'Admin access required'},{status:403});
    const body=await request.json().catch(()=>({})); const mode=body.mode==='recent'?'recent':'historical'; const c=await refreshMicrosoft(user.id);
    let url;
    if(mode==='historical') url=c.history_next_link||'https://graph.microsoft.com/v1.0/me/messages?$top=25&$select=id,internetMessageId,subject,bodyPreview,body,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,webLink,hasAttachments&$orderby=receivedDateTime%20desc';
    else url='https://graph.microsoft.com/v1.0/me/messages?$top=100&$select=id,internetMessageId,subject,bodyPreview,body,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,webLink,hasAttachments&$orderby=receivedDateTime%20desc';
    const page=await graph(c.access_token,url); let scanned=0,relevant=0,applied=0,needs=0;
    for(const m of page.value||[]){
      scanned++; let p=parseEmail(m,[]); let names=[]; if(p.isRelevant&&m.hasAttachments){names=await attachmentNames(c.access_token,m.id,true);p=parseEmail(m,names)} if(p.isRelevant)relevant++;
      const emailPayload={user_id:user.id,graph_message_id:m.id,internet_message_id:m.internetMessageId||null,subject:m.subject||null,sender_email:m.from?.emailAddress?.address?.toLowerCase()||null,recipient_emails:[...(m.toRecipients||[]),...(m.ccRecipients||[])].map(x=>x.emailAddress?.address).filter(Boolean),received_at:m.receivedDateTime||m.sentDateTime||null,web_link:m.webLink||null,is_relevant:p.isRelevant,parse_confidence:p.confidence,parsed_data:p,updated_at:new Date().toISOString()};
      const {data:em,error}=await sb.from('email_messages').upsert(emailPayload,{onConflict:'user_id,graph_message_id'}).select('id').single();
      if(!error&&p.isRelevant){const r=await applyRegister(sb,user.id,m,p,em.id);applied+=r.applied;needs+=r.needs}
    }
    const [{count:allCount},{count:relCount}]=await Promise.all([sb.from('email_messages').select('*',{count:'exact',head:true}).eq('user_id',user.id),sb.from('email_messages').select('*',{count:'exact',head:true}).eq('user_id',user.id).eq('is_relevant',true)]); const patch={last_sync_at:new Date().toISOString(),messages_scanned:allCount||0,relevant_messages:relCount||0,updated_at:new Date().toISOString()};
    if(mode==='historical'){patch.history_started_at=c.history_started_at||new Date().toISOString();patch.history_next_link=page['@odata.nextLink']||null;patch.history_complete=!page['@odata.nextLink'];if(patch.history_complete)patch.history_completed_at=new Date().toISOString()}
    await sb.from('microsoft_connections').update(patch).eq('user_id',user.id);
    return NextResponse.json({mode,scanned,relevant,register_updates:applied,needs_review:needs,has_more:mode==='historical'?!!page['@odata.nextLink']:false});
  }catch(e){return NextResponse.json({error:e.message},{status:400})}
}
