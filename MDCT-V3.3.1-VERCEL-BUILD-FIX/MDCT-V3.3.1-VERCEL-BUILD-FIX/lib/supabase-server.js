import { createClient } from '@supabase/supabase-js';

export function adminSb(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SECRET_KEY;
  if(!url||!key) throw new Error('Supabase server environment variables are missing');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}

export async function requireUser(request){
  const auth=request.headers.get('authorization')||'';
  const token=auth.startsWith('Bearer ')?auth.slice(7):null;
  if(!token) throw new Error('UNAUTHORIZED');
  const sb=adminSb();
  const {data,error}=await sb.auth.getUser(token);
  if(error||!data?.user) throw new Error('UNAUTHORIZED');
  const {data:profile}=await sb.from('profiles').select('id,email,role,is_active').eq('id',data.user.id).single();
  if(!profile?.is_active) throw new Error('INACTIVE');
  return {sb,user:data.user,profile};
}
