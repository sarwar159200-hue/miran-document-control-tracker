import { NextResponse } from 'next/server';
import { adminSb } from '../../../../lib/supabase-server';
import { exchangeCode,graph,readState } from '../../../../lib/microsoft';
export async function GET(request){
  const url=new URL(request.url); const code=url.searchParams.get('code'),state=url.searchParams.get('state'),err=url.searchParams.get('error');
  const home=new URL('/',request.url);
  if(err){home.searchParams.set('microsoft','error');home.searchParams.set('reason',err);return NextResponse.redirect(home)}
  try{
    const s=readState(state); const t=await exchangeCode(code); const me=await graph(t.access_token,'/me?$select=id,displayName,mail,userPrincipalName');
    const sb=adminSb();
    await sb.from('microsoft_connections').upsert({user_id:s.u,mailbox_email:(me.mail||me.userPrincipalName||'').toLowerCase(),microsoft_user_id:me.id,access_token:t.access_token,refresh_token:t.refresh_token,expires_at:new Date(Date.now()+(t.expires_in||3600)*1000).toISOString(),connected_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:'user_id'});
    home.searchParams.set('microsoft','connected'); return NextResponse.redirect(home);
  }catch(e){home.searchParams.set('microsoft','error');home.searchParams.set('reason',String(e.message).slice(0,120));return NextResponse.redirect(home)}
}
