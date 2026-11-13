const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const input=path.join(root,'.qa/zap-vercel-2026-11-13');
const target=path.join(root,'docs/pruebas/2026-11-13/zap-vercel-resultados.json');
const run=JSON.parse(fs.readFileSync(path.join(input,'run.json')));
if(run.code!==0||run.stoppedForHealth)throw Error('No publicar una ejecución incompleta como finalizada.');
const native=JSON.parse(fs.readFileSync(path.join(input,'zap-vercel-native.json')));
const review=JSON.parse(fs.readFileSync(path.join(input,'review.json')));
const homes=fs.readdirSync(input,{withFileTypes:true}).filter(e=>e.isDirectory()&&e.name.startsWith('zap-home-')).map(e=>path.join(input,e.name)).sort((a,b)=>fs.statSync(b).mtimeMs-fs.statSync(a).mtimeMs);
const log=fs.readFileSync(path.join(homes[0],'zap.log'),'utf8');
const activeEvidence=[...log.matchAll(/completed host\/plugin https:\/\/sesha-app\.vercel\.app \| (\w+) in ([\d.]+)s with (\d+) message\(s\) sent and (\d+) alert\(s\) raised/g)].map(m=>({rule:m[1],seconds:Number(m[2]),requests:Number(m[3]),alerts:Number(m[4])}));
if(activeEvidence.length!==2)throw Error('No se confirmó la finalización de las dos reglas activas.');
const unique=new Map();
for(const site of native.site||[])for(const a of site.alerts||[]){
 const reference=a.alertRef||a.pluginid;const key=reference+':'+a.name;
 if(!unique.has(key))unique.set(key,{id:a.pluginid,reference,name:a.name||a.alert,riskCode:Number(a.riskcode),confidence:a.confidence,count:0,paths:[]});
 const item=unique.get(key);item.count+=a.instances?.length||Number(a.count)||0;
 for(const instance of a.instances||[]){const url=new URL(instance.uri);if(url.origin!==run.target)throw Error('Alerta fuera de alcance');if(!item.paths.includes(url.pathname))item.paths.push(url.pathname);}
}
const alerts=[...unique.values()].sort((a,b)=>b.riskCode-a.riskCode||a.id.localeCompare(b.id));
for(const alert of alerts){
 if(alert.id==='10055')alert.reviewDetail="La CSP publicada permite estilos inline. Mejora de endurecimiento confirmada; no se demostró explotación XSS. Migrar estilos necesarios y retirar la excepción tras verificar la interfaz.";
 else if(alert.id==='10098')alert.reviewDetail="Access-Control-Allow-Origin: * aparece en HTML, JavaScript y CSS públicos. No se observó exposición de datos autenticados: la API rechazó con 403 un origen ajeno con sesión válida y el perfil sin sesión respondió 401. Se conserva la clasificación automática media; el alcance revisado es contenido público.";
 else if(alert.id==='10015')alert.reviewDetail="La alerta informativa incluye HTML público y respuestas de perfil/dashboard con Cache-Control: no-store. En las lecturas de contraste cada cuenta recibió su propio perfil y el acceso anónimo fue rechazado. No se confirmó fuga por caché.";
 else if(alert.id==='10050')alert.reviewDetail="La regla se activó por la cabecera Age: 0 en API y Age: 200 en una página pública. La presencia de Age por sí sola no demostró contenido privado compartido; las lecturas de dos cuentas devolvieron perfiles correctos con no-store.";
 else if(alert.id==='10027')alert.reviewDetail="La evidencia marcada fue la palabra select en el JavaScript compilado. No demuestra por sí sola filtración de secretos; no se confirmó exposición en esta revisión.";
 else alert.reviewDetail="Identificación informativa de una aplicación web moderna; no es una explotación demostrada.";
}
const riskCounts={high:0,medium:0,low:0,informational:0};
for(const item of alerts)riskCounts[['informational','low','medium','high'][item.riskCode]]++;
const result={project:'SESHA APP - Proyecto SENA',date:'2026-11-13',timezone:'America/Bogota',
 deployment:{id:'dpl_6iTJZdo5F9dMqL1V3EqVfYiqVTFq',commit:'3adb3b85901b867c5a502f0bad387f876bd28275'},
 target:run.target,start:run.start,end:run.end,zapVersion:run.zapVersion,addOns:run.addOns,
 execution:{code:run.code,stoppedForHealth:run.stoppedForHealth,passiveRoutes:run.passiveRoutes,activeRoute:run.activeRoute,parameters:run.parameters,activeRules:run.activeRules,activeEvidence,activeMinutesLimit:run.activeMinutesLimit,threads:run.threads,delayMs:run.delayMs},
 checks:{before:run.before,after:run.after,countersUnchanged:run.countersUnchanged,readyStatus:run.readyStatus,anonymousDashboardStatus:run.anonymousDashboardStatus},
 limitations:run.limitations,riskCounts,alerts,manualReview:review};
const json=JSON.stringify(result,null,2);
if(/mongodb\+srv:\/\/|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|sesha_session=/.test(json))throw Error('Contenido sensible detectado');
fs.writeFileSync(target,json);
console.log(JSON.stringify({riskCounts,alerts:alerts.map(a=>({id:a.id,name:a.name,count:a.count,paths:a.paths}))}));
