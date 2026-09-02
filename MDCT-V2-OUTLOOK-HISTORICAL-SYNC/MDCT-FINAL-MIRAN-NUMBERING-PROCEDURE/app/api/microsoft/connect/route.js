import { NextResponse } from 'next/server';
import { requireUser } from '../../../../lib/supabase-server';
import { authorizeUrl } from '../../../../lib/microsoft';
export async function GET(request){
  try{const {user}=await requireUser(request);return NextResponse.json({authorize_url:authorizeUrl(user.id)});}
  catch(e){return NextResponse.json({error:e.message},{status:e.message==='UNAUTHORIZED'?401:400});}
}
