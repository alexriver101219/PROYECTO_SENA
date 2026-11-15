// Revisión de CORS y caché: solo lecturas; cuerpos y sesiones permanecen en memoria.
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const base='https://sesha-app.vercel.app';const output=path.resolve(__dirname,'../.qa/zap-vercel-2026-11-13/review.json');
const fields=['access-control-allow-origin','access-control-allow-credentials','cache-control','age','x-vercel-cache','vary'];
const summarize=(name,res)=>({name,status:res.status,headers:Object.fromEntries(fields.map(k=>[k,res.headers.get(k)]))});
const pause=()=>new Promise(resolve=>setTimeout(resolve,1600));
async function request(route,options={}){await pause();return fetch(base+route,{...options,redirect:'error',signal:AbortSignal.timeout(30000)});}
(async()=>{
 if (!process.env.QA_ADMIN_PASSWORD || !process.env.QA_CARLOS_PASSWORD) throw Error("Configura las claves QA de forma privada");
 const checks=[];const profiles=[];
 for(const account of [{email:'admin@sesha.com',password: process.env.QA_ADMIN_PASSWORD,role:'admin'},{email:'carlos.mendoza@sesha.com',password: process.env.QA_CARLOS_PASSWORD,role:'employee'}]){
  const login=await request('/api/auth/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({email:account.email,password:account.password})});
  assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];await login.arrayBuffer();
  const me=await request('/api/auth/me',{headers:{Cookie:cookie,Origin:base}});assert.equal(me.status,200);
  const data=await me.json();assert.equal(data.user.email,account.email);assert.equal(data.user.role,account.role);
  profiles.push(data.user._id);checks.push({...summarize('perfil '+account.role,me),expectedAccount:true});
  if(account.role==='admin'){
   const foreign=await request('/api/auth/me',{headers:{Cookie:cookie,Origin:'https://example.invalid'}});assert.equal(foreign.status,403);await foreign.arrayBuffer();checks.push(summarize('API con origen ajeno y sesión',foreign));
  }
 }
 assert.notEqual(profiles[0],profiles[1]);
 const anon=await request('/api/auth/me');assert.equal(anon.status,401);await anon.arrayBuffer();checks.push(summarize('perfil sin sesión',anon));
 const page=await request('/',{headers:{Origin:'https://example.invalid'}});assert.equal(page.status,200);await page.arrayBuffer();checks.push(summarize('HTML público con origen ajeno',page));
 const result={checkedAt:new Date().toISOString(),target:base,checks,distinctAccounts:true,leakObserved:false,note:'No se observó respuesta de otra cuenta en estas lecturas; no constituye auditoría exhaustiva de caché o CORS.'};
 fs.writeFileSync(output,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
