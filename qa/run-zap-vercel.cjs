// Destino fijo autorizado. No registra contraseñas, cookies ni cuerpos de datos.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const base = 'https://sesha-app.vercel.app';
const output = path.join(root, '.qa/zap-vercel-2026-11-13');
const install = process.env.ZAP_INSTALL || 'C:/Program Files/ZAP/Zed Attack Proxy';
const jar = path.join(install, 'zap-2.17.0.jar');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const privatePlan = path.join(output, 'private-plan.yaml');
fs.mkdirSync(output, { recursive: true });

async function request(route, { cookie, method = 'GET', data } = {}) {
  const res = await fetch(base + route, {
    method, redirect: 'error', signal: AbortSignal.timeout(30000),
    headers: { Origin: base, ...(cookie ? {Cookie:cookie} : {}), ...(data ? {'Content-Type':'application/json'} : {}) },
    body: data ? JSON.stringify(data) : undefined,
  });
  if (res.status === 429 || res.status >= 500) throw Error('Detenido por HTTP ' + res.status + ' en ' + route.split('?')[0]);
  return res;
}
async function counters(cookie) {
  const routes=['/api/dashboard','/api/empleados?limit=1&page=1','/api/documentos?limit=1&page=1','/api/solicitudes?limit=1&page=1'];
  const values=[];
  for (const route of routes) {
    await pause(1600); const res=await request(route,{cookie});
    if(res.status!==200)throw Error('Lectura de control HTTP '+res.status);
    const data=await res.json(); values.push(route==='/api/dashboard'?data:{total:data.total});
  }
  return {dashboard:values[0],employees:values[1].total,documents:values[2].total,requests:values[3].total};
}
async function main() {
  if(!fs.existsSync(jar))throw Error('ZAP 2.17.0 no está instalado en la ruta esperada.');
  const betaDir=path.join(root,'.qa/zap-vercel-tools/plugin');
  const betaFiles=fs.existsSync(betaDir)?fs.readdirSync(betaDir).filter(name=>name.endsWith('.zap')):[];
  if(!betaFiles.some(name=>/^ascanrulesBeta-beta-.*\.zap$/.test(name)))throw Error('Instala el complemento oficial ascanrulesBeta en .qa/zap-vercel-tools antes de ejecutar.');
  const home=await request('/'); if(home.status!==200)throw Error('Inicio no accesible');
  const html=await home.text();
  const assets=[...html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+\.(?:js|css))"/g)].map(m=>m[1]);
  const login=await request('/api/auth/login',{method:'POST',data:{email:'admin@sesha.com',password:'123456'}});
  if(login.status!==200)throw Error('No se obtuvo la sesión académica: HTTP '+login.status);
  const cookie=login.headers.get('set-cookie')?.split(';')[0];
  if(!cookie?.startsWith('sesha_session='))throw Error('No se recibió la cookie esperada.');
  await login.arrayBuffer();
  const before=await counters(cookie);
  const routes=['/','/login','/register','/api/health','/api/ready','/api/auth/positions','/api/auth/me','/api/dashboard','/api/empleados?limit=5&page=1','/api/documentos?limit=5&page=1','/api/solicitudes?limit=5&page=1','/api/documentos/certificado',...new Set(assets)];
  const requests=routes.map(route=>'      - url: '+base+route+'\n        method: GET\n        responseCode: 200').join('\n');
  const plan=fs.readFileSync(path.join(root,'qa/zap/vercel.template.yaml'),'utf8').replace('__SESSION_COOKIE__',cookie).replace('__READ_REQUESTS__',requests).replaceAll('__PRIVATE_OUTPUT__',output.replaceAll('\\','/'));
  fs.writeFileSync(privatePlan,plan);
  const start=new Date().toISOString();
  const zapHome=fs.mkdtempSync(path.join(output,'zap-home-'));
  fs.mkdirSync(path.join(zapHome,'plugin'),{recursive:true});
  for(const addon of betaFiles)fs.copyFileSync(path.join(betaDir,addon),path.join(zapHome,'plugin',addon));
  const log=fs.createWriteStream(path.join(output,'zap-vercel.log'));
  const child=spawn('java',['-Xmx512m','-Djava.awt.headless=true','-jar',jar,'-cmd','-silent','-dir',zapHome,'-installdir',install,'-host','127.0.0.1','-port','8092','-autorun',privatePlan],{cwd:output,windowsHide:true});
  const redact=data=>data.toString().replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[SESION_OMITIDA]');
  for(const stream of [child.stdout,child.stderr])stream.on('data',data=>{
    const text=redact(data);log.write(text);
    for(const line of text.split('\n'))if(/Job .* (started|finished)|WARN|ERROR|warnings:|generated report/.test(line))console.log(line);
  });
  let stoppedForHealth=false, monitoring=false;
  const monitor=setInterval(async()=>{
    if(monitoring)return;monitoring=true;
    try{const response=await request('/api/ready');if(response.status!==200)throw Error('ready HTTP '+response.status);}
    catch(error){stoppedForHealth=true;console.error('Interrumpiendo ZAP: disponibilidad no confirmada.');child.kill();}
    finally{monitoring=false;}
  },30000);
  const timeout=setTimeout(()=>{stoppedForHealth=true;child.kill();},6*60000);
  const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});
  clearInterval(monitor);clearTimeout(timeout);log.end();fs.rmSync(privatePlan,{force:true});
  const after=await counters(cookie);
  const ready=await request('/api/ready');const anonymous=await request('/api/dashboard');
  const run={start,end:new Date().toISOString(),code,stoppedForHealth,target:base,zapVersion:'2.17.0',addOns:betaFiles,passiveRoutes:routes.map(r=>r.split('?')[0]),activeRoute:'/api/empleados',parameters:['limit','page'],activeRules:[40012,40033],activeMinutesLimit:3,threads:1,delayMs:1500,before,after,countersUnchanged:JSON.stringify(before)===JSON.stringify(after),readyStatus:ready.status,anonymousDashboardStatus:anonymous.status,limitations:'Sin spider, DOM/AJAX, escrituras, cargas de archivos, fuerza bruta ni reglas temporizadas. Login académico único previo al escaneo. Solo parámetros GET de paginación en escaneo activo.'};
  fs.writeFileSync(path.join(output,'run.json'),JSON.stringify(run,null,2));
  console.log(JSON.stringify({code,stoppedForHealth,countersUnchanged:run.countersUnchanged,readyStatus:ready.status,anonymousDashboardStatus:anonymous.status}));
  if(code!==0||stoppedForHealth)process.exitCode=1;
}
main().catch(error=>{fs.rmSync(privatePlan,{force:true});console.error(error.message);process.exitCode=1;});
