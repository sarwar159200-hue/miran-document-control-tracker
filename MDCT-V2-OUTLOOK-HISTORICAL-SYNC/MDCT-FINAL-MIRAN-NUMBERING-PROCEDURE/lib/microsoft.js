import crypto from 'crypto';
import { adminSb } from './supabase-server';

const AUTH='https://login.microsoftonline.com';
const GRAPH='https://graph.microsoft.com/v1.0';
const SCOPES='openid profile offline_access User.Read Mail.Read';

function b64url(s){return Buffer.from(s).toString('base64url')}
function unb64(s){return Buffer.from(s,'base64url').toString('utf8')}
function stateSecret(){return process.env.MICROSOFT_CLIENT_SECRET||process.env.SUPABASE_SECRET_KEY}

export function makeState(userId){
  const payload=JSON.stringify({u:userId,t:Date.now()});
  const p=b64url(payload);
  const sig=crypto.createHmac('sha256',stateSecret()).update(p).digest('base64url');
  return `${p}.${sig}`;
}
export function readState(state){
  const [p,sig]=String(state||'').split('.');
  if(!p||!sig) throw new Error('Invalid OAuth state');
  const expected=crypto.createHmac('sha256',stateSecret()).update(p).digest('base64url');
  if(!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected))) throw new Error('Invalid OAuth state');
  const x=JSON.parse(unb64(p));
  if(!x.u||Date.now()-x.t>15*60*1000) throw new Error('Expired OAuth state');
  return x;
}
export function authorizeUrl(userId){
  const tenant=process.env.MICROSOFT_TENANT_ID, client=process.env.MICROSOFT_CLIENT_ID, redirect=process.env.MICROSOFT_REDIRECT_URI;
  const q=new URLSearchParams({client_id:client,response_type:'code',redirect_uri:redirect,response_mode:'query',scope:SCOPES,state:makeState(userId),prompt:'select_account'});
  return `${AUTH}/${tenant}/oauth2/v2.0/authorize?${q.toString()}`;
}
async function tokenRequest(params){
  const tenant=process.env.MICROSOFT_TENANT_ID;
  const body=new URLSearchParams({client_id:process.env.MICROSOFT_CLIENT_ID,client_secret:process.env.MICROSOFT_CLIENT_SECRET,redirect_uri:process.env.MICROSOFT_REDIRECT_URI,...params});
  const r=await fetch(`${AUTH}/${tenant}/oauth2/v2.0/token`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body,cache:'no-store'});
  const j=await r.json();
  if(!r.ok) throw new Error(j.error_description||j.error||'Microsoft token request failed');
  return j;
}
export async function exchangeCode(code){return tokenRequest({grant_type:'authorization_code',code,scope:SCOPES})}
export async function refreshMicrosoft(userId){
  const sb=adminSb();
  const {data:c,error}=await sb.from('microsoft_connections').select('*').eq('user_id',userId).single();
  if(error||!c?.refresh_token) throw new Error('Microsoft mailbox is not connected');
  if(c.access_token && c.expires_at && new Date(c.expires_at).getTime()>Date.now()+120000) return c;
  const t=await tokenRequest({grant_type:'refresh_token',refresh_token:c.refresh_token,scope:SCOPES});
  const patch={access_token:t.access_token,expires_at:new Date(Date.now()+(t.expires_in||3600)*1000).toISOString(),updated_at:new Date().toISOString()};
  if(t.refresh_token) patch.refresh_token=t.refresh_token;
  const {data}=await sb.from('microsoft_connections').update(patch).eq('user_id',userId).select('*').single();
  return data;
}
export async function graph(accessToken,url){
  const r=await fetch(url.startsWith('http')?url:`${GRAPH}${url}`,{headers:{Authorization:`Bearer ${accessToken}`,Prefer:'outlook.body-content-type="text"'},cache:'no-store'});
  const j=await r.json();
  if(!r.ok) throw new Error(j?.error?.message||'Microsoft Graph request failed');
  return j;
}
