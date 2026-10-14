const fs=require('node:fs');const path=require('node:path');const {initialDatabase}=require('./seed');
const file=path.join(__dirname,'..','data','database.json');
let db;
function getDb(){if(db)return db;try{db=JSON.parse(fs.readFileSync(file,'utf8'));}catch{db=initialDatabase();saveDb();}return db;}
function saveDb(){if(!db)return; if(process.env.VERCEL){return;} const folder=path.dirname(file);fs.mkdirSync(folder,{recursive:true}); const tmp=file+'.tmp'; fs.writeFileSync(tmp,JSON.stringify(db,null,2));fs.renameSync(tmp,file);}
function resetForTest(){db=initialDatabase();}
module.exports={getDb,saveDb,resetForTest};
