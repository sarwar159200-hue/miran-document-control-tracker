import {createClient} from "@supabase/supabase-js";
let c; export function sb(){if(!c)c=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL||"",process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||"");return c;}
