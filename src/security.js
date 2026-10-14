const crypto=require('node:crypto');
const localDevSecret='academiapulse-local-development-secret-DO-NOT-USE-IN-PRODUCTION';
function secret(){const v=process.env.AUTH_SECRET;if(v&&v.length>=24)return v;if(process.env.VERCEL||process.env.NODE_ENV==='production')throw new Error('AUTH_SECRET must be set (at least 24 characters) in production.');return localDevSecret;}
function base64(s){return Buffer.from(typeof s==='string'?s:JSON.stringify(s)).toString('base64url');}
function sign(payload,ttl=60*60*10){const head=base64({alg:'HS256',typ:'JWT'}),body=base64({...payload,exp:Math.floor(Date.now()/1000)+ttl});const bodyToSign=head+'.'+body;return bodyToSign+'.'+crypto.createHmac('sha256',secret()).update(bodyToSign).digest('base64url');}
function verify(token){try{const [head,body,sig]=String(token||'').split('.');if(!head||!body||!sig)return null;const expected=crypto.createHmac('sha256',secret()).update(head+'.'+body).digest('base64url');if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;const x=JSON.parse(Buffer.from(body,'base64url').toString());return x.exp>Math.floor(Date.now()/1000)?x:null;}catch{return null;}}
function checkPassword(p,encoded){try{let [method,salt,key]=encoded.split(':');if(method!=='scrypt')return false;const actual=crypto.scryptSync(p,salt,64),expected=Buffer.from(key,'hex');return expected.length===actual.length&&crypto.timingSafeEqual(expected,actual);}catch{return false;}}
function sanitizeUser(u){if(!u)return null;const {passwordHash,...safe}=u;return safe;}
module.exports={sign,verify,checkPassword,sanitizeUser};
