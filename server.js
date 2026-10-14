const http=require('node:http');const fs=require('node:fs');const path=require('node:path');const {handleApi}=require('./src/api');const port=Number(process.env.PORT||3000);const publicRoot=path.join(__dirname,'public');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.ico':'image/x-icon'};
const server=http.createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname.startsWith('/api/'))return handleApi(req,res);
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end('Method not allowed');}
 const allowed=new Set(['/','/index.html','/styles.css','/app.js','/favicon.svg']); if(!allowed.has(pathname)){res.writeHead(404);return res.end('Not found');}
 const target=path.join(publicRoot,pathname==='/'?'index.html':pathname);
 try{const content=fs.readFileSync(target);res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});res.end(content);}catch{res.writeHead(404);res.end('Not found');}
});
if(require.main===module)server.listen(port,()=>console.log(`AcademiaPulse ERP available at http://localhost:${port}`));
module.exports={server};
