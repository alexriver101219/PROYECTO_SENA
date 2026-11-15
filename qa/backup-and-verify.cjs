// Respaldo lógico completo de proyecto_sena. Restauración exclusivamente local.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const {MongoClient,BSON}=require('mongodb');
const {MongoMemoryReplSet}=require('mongodb-memory-server');
const root=path.resolve(__dirname,'..');
require('dotenv').config({path:path.join(root,'backend/.env'),quiet:true});
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const output=path.join(root,'.qa/backups',stamp);
const config=path.join(output,'source-private.yaml');
const tools=path.join(root,'.qa/tools/mongodb-tools/mongodb-database-tools-windows-x86_64-100.20.1/bin');
let source,local,memory;
fs.mkdirSync(output,{recursive:true});
const hashBytes=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const canonical=value=>{
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
 return value;
};
const stable=value=>JSON.stringify(canonical(BSON.EJSON.serialize(value,{relaxed:false})));
async function manifest(db){
 const result=[];
 for(const info of (await db.listCollections().toArray()).sort((a,b)=>a.name.localeCompare(b.name))){
  if(info.type==='view')throw Error('La verificación requiere adaptar las vistas antes de continuar.');
  const coll=db.collection(info.name);const hashes=[];
  for await(const doc of coll.find({}))hashes.push(hashBytes(stable(doc)));
  const indexes=await coll.listIndexes().toArray();
  const normalized=indexes.map(({ns:_ns,v:_v,...index})=>index).sort((a,b)=>a.name.localeCompare(b.name));
  result.push({name:info.name,count:hashes.length,documentsSha256:hashBytes(hashes.sort().join('\n')),indexesSha256:hashBytes(stable(normalized)),indexCount:indexes.length,optionsSha256:hashBytes(stable(info.options||{}))});
 }
 return result;
}
async function run(name,args){
 return new Promise((resolve,reject)=>{
  const log=fs.createWriteStream(path.join(output,name+'.log'));
  const child=spawn(path.join(tools,name+'.exe'),args,{cwd:output,windowsHide:true});
  child.stdout.on('data',chunk=>log.write(chunk));child.stderr.on('data',chunk=>log.write(chunk));
  child.once('error',()=>reject(Error('No se pudo ejecutar '+name)));
  child.once('close',code=>{log.end();code===0?resolve():reject(Error(name+' terminó con código '+code+'; revisar el registro privado.'));});
 });
}
async function main(){
 const startedAt=new Date().toISOString();
 if(!fs.existsSync(path.join(tools,'mongodump.exe')))throw Error('Instala las herramientas oficiales en la ruta privada documentada.');
 source=new MongoClient(process.env.MONGO_URI,{serverSelectionTimeoutMS:8000});await source.connect();
 const db=source.db();if(db.databaseName!=='proyecto_sena')throw Error('Base de origen inesperada.');
 const build=await db.command({buildInfo:1});const sourceMajor=build.version.split('.')[0];
 const before=await manifest(db);
 fs.writeFileSync(config,JSON.stringify({uri:process.env.MONGO_URI}));
 const archive=path.join(output,'proyecto_sena.archive.gz');
 await run('mongodump',['--config',config,'--db','proyecto_sena','--archive='+archive,'--gzip','--numParallelCollections=1']);
 fs.rmSync(config,{force:true});
 const afterDump=await manifest(db);
 const changedDuringDump=before.filter((item,i)=>stable(item)!==stable(afterDump[i])).map(item=>item.name);
 const cached=fs.readdirSync(path.join(root,'.mongodb-binaries')).find(name=>new RegExp('^mongod-x64-win32-'+sourceMajor+'\\.').test(name)&&name.endsWith('.exe'));
 if(!cached)throw Error('Respaldo creado; falta un binario local de la misma versión mayor para probar su restauración.');
 memory=await MongoMemoryReplSet.create({binary:{systemBinary:path.join(root,'.mongodb-binaries',cached)},instanceOpts:[{ip:'127.0.0.1',args:['--setParameter','ttlMonitorEnabled=false']}],replSet:{count:1,ip:'127.0.0.1'}});
 const localUri=memory.getUri('sesha_restore_validation');
 const parsed=new URL(localUri);if(parsed.hostname!=='127.0.0.1')throw Error('La restauración no apunta a loopback.');
 await run('mongorestore',['--uri',localUri,'--archive='+archive,'--gzip','--nsInclude=proyecto_sena.*','--nsFrom=proyecto_sena.*','--nsTo=sesha_restore_validation.*','--stopOnError']);
 local=new MongoClient(localUri);await local.connect();
 const restored=await manifest(local.db('sesha_restore_validation'));
 const checks=afterDump.map(item=>{
  const restoredItem=restored.find(value=>value.name===item.name);
  return {collection:item.name,documents:item.count,indexes:item.indexCount,documentsMatch:!!restoredItem&&item.documentsSha256===restoredItem.documentsSha256,indexesMatch:!!restoredItem&&item.indexesSha256===restoredItem.indexesSha256,optionsMatch:!!restoredItem&&item.optionsSha256===restoredItem.optionsSha256};
 });
 const passed=changedDuringDump.length===0&&restored.length===afterDump.length&&checks.every(item=>item.documentsMatch&&item.indexesMatch&&item.optionsMatch);
 const result={startedAt,completedAt:new Date().toISOString(),sourceDatabase:'proyecto_sena',sourceVersion:build.version,toolsVersion:'100.20.1',archive:'proyecto_sena.archive.gz',archiveBytes:fs.statSync(archive).size,archiveSha256:hashBytes(fs.readFileSync(archive)),restoreDatabase:'sesha_restore_validation',restoreTarget:'127.0.0.1 temporal aislado',sourceReadOnly:true,changedDuringDump,checks,passed,scope:'Todas las colecciones, documentos BSON, opciones e índices de proyecto_sena. No incluye usuarios de Atlas, claves, configuración de red ni recuperación a un instante mediante oplog.'};
 fs.writeFileSync(path.join(output,'verification-private.json'),JSON.stringify({result,sourceManifest:afterDump,restoredManifest:restored},null,2));
 fs.writeFileSync(path.join(root,'.qa/latest-backup.json'),JSON.stringify({directory:output,result},null,2));
 console.log(JSON.stringify({directory:output,result}));
 if(!passed)throw Error('El respaldo se conserva, pero la restauración no coincide en todas las comprobaciones.');
}
main().catch(()=>{console.error('Respaldo/verificación no completado; detalles privados omitidos. Revisar los registros privados.');process.exitCode=1;}).finally(async()=>{fs.rmSync(config,{force:true});if(local)await local.close();if(memory)await memory.stop();if(source)await source.close();});
