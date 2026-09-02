import { NextResponse } from 'next/server';
import { requireUser } from '../../../../lib/supabase-server';
export async function GET(request){
  try{const {sb,user}=await requireUser(request);const {data}=await sb.from('microsoft_connections').select('mailbox_email,connected_at,last_sync_at,history_complete,messages_scanned,relevant_messages,history_started_at,history_completed_at').eq('user_id',user.id).maybeSingle();return NextResponse.json({connected:!!data,...(data||{})})}catch(e){return NextResponse.json({error:e.message},{status:401})}
}
