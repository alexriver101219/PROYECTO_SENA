// Revisión de CORS y caché: solo lecturas; cuerpos y sesiones permanecen en memoria.
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');const base='https://sesha-app.vercel.app';
const outputDir=path.resolve(root,process.env.ZAP_VERCEL_OUTPUT||'.qa/zap-vercel-2026-11-13');
if(!outputDir.startsWith(path.join(root,'.qa')+path.sep))throw Error('Salida no privada');
const output=path.join(outputDir,'review.json');
const fields=['access-control-allow-origin','access-control-allow-credentials','cache-control','age','x-vercel-cache','vary'];
const summarize=(name,res)=>({name,status:res.status,headers:Object.fromEntries(fields.map(k=>[k,res.headers.get(k)]))});
const pause=()=>new Promise(resolve=>setTimeout(resolve,1600));
async function request(route,options={}){await pause();return fetch(base+route,{...options,redirect:'error',signal:AbortSignal.timeout(30000)});}
(async()=>{
 const sessions=(process.env.QA_ZAP_SESSION_FILE||process.env.QA_ZAP_SESSION_JSON)?require('./private-zap-session.cjs').readSessions(root):null;
 if (!sessions && (!process.env.QA_ADMIN_PASSWORD || !process.env.QA_CARLOS_PASSWORD)) throw Error("Se requieren sesiones privadas");
 const checks=[];const profiles=[];
 for(const account of [{email:'admin@sesha.com',password: process.env.QA_ADMIN_PASSWORD,role:'admin'},{email:process.env.QA_ZAP_EMPLOYEE_EMAIL||'carlos.mendoza@sesha.com',password: process.env.QA_CARLOS_PASSWORD,role:'employee'}]){
  let cookie;
  if(sessions)cookie=sessions.find(entry=>entry.email===account.email&&entry.role===account.role).cookie;
  else {const login=await request('/api/auth/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({email:account.email,password:account.password})});
   assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];await login.arrayBuffer();}
  const me=await request('/api/auth/me',{headers:{Cookie:cookie,Origin:base}});assert.equal(me.status,200);
  const data=await me.json();assert.equal(data.user.email,account.email);assert.equal(data.user.role,account.role);
  profiles.push(data.user._id);checks.push({...summarize('perfil '+account.role,me),expectedAccount:true});
  if(account.role==='admin'){
   const foreign=await request('/api/auth/me',{headers:{Cookie:cookie,Origin:'https://example.invalid'}});assert.equal(foreign.status,403);await foreign.arrayBuffer();checks.push(summarize('API con origen ajeno y sesión',foreign));
  } else {
   const contextResponse=await request('/api/solicitudes/formulario',{headers:{Cookie:cookie,Origin:base}});assert.equal(contextResponse.status,200);
   const context=await contextResponse.json();assert.equal(context.employee.email,account.email);assert.equal(context.employee.document,data.profile.document);assert.equal(context.types.length,4);
   checks.push({...summarize('formato propio empleado',contextResponse),expectedAccount:true});
   const period=require('../backend/services/payrollPeriods').latestClosedFortnight();const query='?period='+period.period+'&half='+period.half;
   const preview=await request('/api/documentos/nomina'+query,{headers:{Cookie:cookie,Origin:base}});assert.equal(preview.status,200);
   const payroll=await preview.json();assert.equal(payroll.email,account.email);assert.equal(payroll.document,data.profile.document);assert.equal(payroll.gross-payroll.deductions,payroll.net);
   checks.push({...summarize('nómina propia empleado',preview),expectedAccount:true,amountsReconciled:true});
   const pdf=await request('/api/documentos/nomina/pdf'+query,{headers:{Cookie:cookie,Origin:base}});assert.equal(pdf.status,200);
   assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0,5).toString(),'%PDF-');
   checks.push({...summarize('PDF de nómina propio',pdf),expectedAccount:true,pdf:true});
  }
 }
 assert.notEqual(profiles[0],profiles[1]);
 const anon=await request('/api/auth/me');assert.equal(anon.status,401);await anon.arrayBuffer();checks.push(summarize('perfil sin sesión',anon));
 const page=await request('/',{headers:{Origin:'https://example.invalid'}});assert.equal(page.status,200);await page.arrayBuffer();checks.push(summarize('HTML público con origen ajeno',page));
 const result={checkedAt:new Date().toISOString(),target:base,checks,distinctAccounts:true,leakObserved:false,note:'No se observó respuesta de otra cuenta en estas lecturas; no constituye auditoría exhaustiva de caché o CORS.'};
 fs.writeFileSync(output,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(()=>{console.error('Contraste Vercel no completado; detalles privados omitidos.');process.exitCode=1;});
