const crypto=require('node:crypto');
const {getDb,saveDb}=require('./store');
const {hash}=require('./seed');
const {sign,verify,checkPassword,sanitizeUser}=require('./security');
const loginAttempts=new Map();
const roles=['admin','hod','faculty','student'];
const uid=(p)=>p+'_'+crypto.randomUUID().slice(0,8);
const text=(v,n=180)=>String(v??'').trim().slice(0,n);
const emailValid=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const today=()=>new Date().toISOString().slice(0,10);
function json(res,code,data){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Access-Control-Allow-Origin':'same-origin'});res.end(JSON.stringify(data));}
function error(res,status,message){return json(res,status,{error:message});}
function readBody(req){return new Promise((resolve,reject)=>{let size=0;const chunks=[];req.on('data',b=>{size+=b.length;if(size>120000){reject(new Error('Request too large'));req.destroy();return;}chunks.push(b);});req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}'));}catch{reject(new Error('Invalid JSON'));}});req.on('error',reject);});}
function activeUser(req,db){const header=req.headers.authorization||'';const auth=verify(header.replace(/^Bearer\s+/i,''));if(!auth)return null;const user=db.accounts.find(x=>x.id===auth.sub&&x.status==='approved');return user||null;}
const isLeader=u=>u.role==='admin'||u.role==='hod';
function canDept(u,dep){return u.role==='admin'||(u.role==='hod'&&u.departmentId===dep);}
function canSubject(u,subject){return u.role==='admin'||(u.role==='hod'&&u.departmentId===subject.departmentId)||(u.role==='faculty'&&u.staffId===subject.facultyId);}
function publicRows(db,u){
 const admin=u.role==='admin',student=u.role==='student',leader=u.role==='hod',faculty=u.role==='faculty';
 const depAllowed=x=>admin||x.departmentId===u.departmentId;
 const ownedSubjectIds=new Set(db.subjects.filter(x=>canSubject(u,x)).map(x=>x.id));
 const students=admin?db.students:student?db.students.filter(x=>x.id===u.studentId):leader?db.students.filter(depAllowed):db.students.filter(x=>depAllowed(x)&&db.subjects.some(y=>ownedSubjectIds.has(y.id)&&y.departmentId===x.departmentId&&y.semester===x.semester));
 const studentIds=new Set(students.map(x=>x.id));
 const staff=admin?db.staff:student?db.staff.filter(x=>x.departmentId===u.departmentId):db.staff.filter(depAllowed);
 const staffIds=new Set(staff.map(x=>x.id));
 const subjects=admin?db.subjects:student?db.subjects.filter(x=>x.departmentId===u.departmentId&&x.semester===students[0]?.semester):leader?db.subjects.filter(depAllowed):db.subjects.filter(x=>ownedSubjectIds.has(x.id));
 const subjectIds=new Set(subjects.map(x=>x.id));
 const attendance=db.attendance.filter(x=>studentIds.has(x.studentId)&&(student||admin||leader||subjectIds.has(x.subjectId)));
 const marks=db.marks.filter(x=>studentIds.has(x.studentId)&&(student||admin||leader||subjectIds.has(x.subjectId)));
 const notices=db.notices.filter(x=>(!x.departmentId||x.departmentId===u.departmentId)&& (x.audience==='all'||(student&&x.audience==='students')||(!student&&x.audience==='staff')||admin));
 const ledger=admin?db.feeLedger:student?db.feeLedger.filter(x=>x.studentId===u.studentId):[];
 const payments=admin?db.payments:student?db.payments.filter(x=>x.studentId===u.studentId):[];
 const staffAttendance=admin?db.staffAttendance:student?[]:leader?db.staffAttendance.filter(x=>staffIds.has(x.staffId)):db.staffAttendance.filter(x=>x.staffId===u.staffId);
 const leaveRequests=admin?db.leaveRequests:student?[]:leader?db.leaveRequests.filter(x=>staffIds.has(x.staffId)):db.leaveRequests.filter(x=>x.staffId===u.staffId);
 const timetable=admin?db.timetable:student?db.timetable.filter(x=>x.departmentId===u.departmentId&&x.semester===students[0]?.semester):leader?db.timetable.filter(x=>x.departmentId===u.departmentId):db.timetable.filter(x=>x.facultyId===u.staffId);
 return {currentUser:sanitizeUser(u),departments:db.departments,staff,subjects,students,attendance,staffAttendance,marks,feeLedger:ledger,payments,timetable,notices,leaveRequests,accounts:admin?db.accounts.map(sanitizeUser):[],cloudDemo:Boolean(process.env.VERCEL)};
}
function ensureText(val,label,min=2,max=120){const value=text(val,max);if(value.length<min)throw new Error(`${label} is required (${min}+ characters)`);return value;}
function grade(internal,external){const sum=Number(internal)+Number(external);return sum>=90?'A+':sum>=80?'A':sum>=70?'B+':sum>=60?'B':sum>=50?'C':'F';}
function acceptMark(n,max){return Number.isFinite(Number(n))&&Number(n)>=0&&Number(n)<=max;}
function apiError(fn){return async(req,res,ctx)=>{try{await fn(req,res,ctx);}catch(e){error(res,e.status||400,e.message||'Request failed');}};}
const routes={};function route(method,path,fn){routes[method+' '+path]=apiError(fn);}
route('GET','/api/health',async(req,res)=>json(res,200,{ok:true,name:'AcademiaPulse ERP',cloudDemo:!!process.env.VERCEL}));
route('POST','/api/auth/login',async(req,res,{db,body})=>{
 const email=text(body.email,150).toLowerCase(),password=String(body.password||''),role=text(body.role);
 const key=(req.socket?.remoteAddress||'remote')+':'+email;const attempts=loginAttempts.get(key)||[];const now=Date.now();const recent=attempts.filter(x=>now-x<600000);if(recent.length>=12)return error(res,429,'Too many login attempts. Try again later.');
 if(!emailValid(email)||!roles.includes(role)||!password)return error(res,400,'Enter a valid email, password, and login portal.');
 const user=db.accounts.find(x=>x.email.toLowerCase()===email&&x.role===role);
 if(!user||!checkPassword(password,user.passwordHash)){recent.push(now);loginAttempts.set(key,recent);return error(res,401,'Invalid credentials for this portal.');}
 if(user.status!=='approved')return error(res,403,'Account is awaiting administrator approval.');
 loginAttempts.delete(key);
 return json(res,200,{token:sign({sub:user.id,role:user.role}),user:sanitizeUser(user)});
});
route('POST','/api/auth/register',async(req,res,{db,body})=>{
 const name=ensureText(body.name,'Full name'),email=text(body.email,150).toLowerCase(),password=String(body.password||''),role=text(body.role),departmentId=text(body.departmentId),rollNo=text(body.rollNo,50),employeeId=text(body.employeeId,50);
 if(!emailValid(email)||password.length<8||password.length>128)return error(res,400,'Valid email and password of 8–128 characters required.');
 if(!['student','faculty'].includes(role))return error(res,403,'Only students and faculty can request registration.');
 if(!db.departments.some(x=>x.id===departmentId))return error(res,400,'Select a department.');
 if(db.accounts.some(x=>x.email.toLowerCase()===email)||db.students.some(x=>x.email.toLowerCase()===email)||db.staff.some(x=>x.email.toLowerCase()===email))return error(res,409,'Email address already exists.');
 if(role==='student'&&(!rollNo||db.students.some(x=>x.rollNo.toLowerCase()===rollNo.toLowerCase())))return error(res,409,'Provide a unique student roll number.');
 if(role==='faculty'&&(!employeeId||db.staff.some(x=>x.employeeId.toLowerCase()===employeeId.toLowerCase())))return error(res,409,'Provide a unique employee ID.');
 db.accounts.push({id:uid('u'),name,email,role,passwordHash:hash(password),departmentId,rollNo:role==='student'?rollNo:undefined,employeeId:role==='faculty'?employeeId:undefined,status:'pending',requestedAt:new Date().toISOString()});saveDb();
 json(res,201,{message:'Registration submitted. An administrator must approve the account before login.'});
});
route('GET','/api/bootstrap',async(req,res,{db,u})=>json(res,200,publicRows(db,u)));
route('POST','/api/admin/accounts/approve',async(req,res,{db,u,body})=>{
 if(u.role!=='admin')return error(res,403,'Administrator only.');
 const account=db.accounts.find(x=>x.id===body.id&&x.status==='pending');if(!account)return error(res,404,'Pending account not found.');
 const decision=body.decision==='reject'?'rejected':'approved';account.status=decision;
 if(decision==='approved'&&account.role==='student'){
  const profile=db.students.find(x=>x.rollNo===account.rollNo);
  if(profile&&profile.email!==account.email)return error(res,409,'Student roll number already linked to another profile.');
  const st=profile||{id:uid('st'),name:account.name,email:account.email,rollNo:account.rollNo,departmentId:account.departmentId,semester:1,section:'A',guardian:'—',guardianPhone:'—',phone:'—',status:'Active'};if(!profile)db.students.push(st);account.studentId=st.id;
 }else if(decision==='approved'&&account.role==='faculty'){
  const f={id:uid('f'),name:account.name,email:account.email,employeeId:account.employeeId,departmentId:account.departmentId,title:'Lecturer',specialization:'General',phone:'—'};db.staff.push(f);account.staffId=f.id;
 }saveDb();json(res,200,{message:`Account ${decision}.`});
});
route('POST','/api/attendance/mark',async(req,res,{db,u,body})=>{
 const subject=db.subjects.find(x=>x.id===body.subjectId),date=text(body.date,10);if(!subject||!canSubject(u,subject))return error(res,403,'Not authorized for this subject.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Array.isArray(body.records)||body.records.length>250)return error(res,400,'Choose a valid date and student records.');
 let count=0;for(const item of body.records){const student=db.students.find(x=>x.id===item.studentId);if(!student||student.departmentId!==subject.departmentId||student.semester!==subject.semester||!['Present','Absent','Late'].includes(item.status))continue;
  let record=db.attendance.find(x=>x.studentId===student.id&&x.subjectId===subject.id&&x.date===date);if(record){record.status=item.status;record.markedBy=u.id;}else db.attendance.push({id:uid('a'),studentId:student.id,subjectId:subject.id,date,status:item.status,markedBy:u.id});count++;
 }saveDb();json(res,200,{message:`Attendance saved for ${count} students.`,count});
});
route('POST','/api/staff-attendance/mark',async(req,res,{db,u,body})=>{
 if(!isLeader(u))return error(res,403,'Only an Admin or HOD can mark staff attendance.');
 const date=text(body.date,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Array.isArray(body.records)||body.records.length>100)return error(res,400,'Invalid attendance register.');
 let count=0;for(const item of body.records){const st=db.staff.find(x=>x.id===item.staffId);if(!st||!canDept(u,st.departmentId)||!['Present','Absent','Leave'].includes(item.status))continue;
  const old=db.staffAttendance.find(x=>x.staffId===st.id&&x.date===date);if(old)old.status=item.status;else db.staffAttendance.push({id:uid('fa'),staffId:st.id,date,status:item.status});count++;
 }saveDb();json(res,200,{message:`Staff attendance saved for ${count} records.`});
});
route('POST','/api/grades/save',async(req,res,{db,u,body})=>{
 const subject=db.subjects.find(x=>x.id===body.subjectId),student=db.students.find(x=>x.id===body.studentId);
 if(!subject||!student||!canSubject(u,subject)||student.departmentId!==subject.departmentId||student.semester!==subject.semester)return error(res,403,'Student or subject not assigned to you.');
 if(!acceptMark(body.internal,40)||!acceptMark(body.external,60))return error(res,400,'Internal marks must be 0–40 and end-semester marks 0–60.');
 const internal=Number(body.internal),external=Number(body.external);let record=db.marks.find(x=>x.studentId===student.id&&x.subjectId===subject.id);if(record){record.internal=internal;record.external=external;record.updatedAt=today();}else db.marks.push({id:uid('g'),studentId:student.id,subjectId:subject.id,internal,external,updatedAt:today()});saveDb();json(res,200,{message:`Grades saved. Total ${internal+external}/100 · ${grade(internal,external)}`});
});
route('POST','/api/notices/create',async(req,res,{db,u,body})=>{
 if(!['admin','hod','faculty'].includes(u.role))return error(res,403,'Students cannot publish notices.');
 const title=ensureText(body.title,'Title',3,100),content=ensureText(body.body,'Notice content',8,1000),audience=['all','students','staff'].includes(body.audience)?body.audience:'all';const departmentId=u.role==='admin'?(body.departmentId||null):u.departmentId;
 db.notices.unshift({id:uid('n'),title,body:content,priority:body.priority==='High'?'High':'Normal',audience,departmentId,createdBy:u.id,createdAt:today()});saveDb();json(res,201,{message:'Notice published.'});
});
route('POST','/api/leave/request',async(req,res,{db,u,body})=>{
 if(!['faculty','hod'].includes(u.role)||!u.staffId)return error(res,403,'Faculty only.');
 const from=text(body.from,10),to=text(body.to,10),reason=ensureText(body.reason,'Leave reason',5,500);if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||to<from)return error(res,400,'Choose valid leave dates.');
 db.leaveRequests.push({id:uid('l'),staffId:u.staffId,from,to,reason,status:'Pending',createdAt:today()});saveDb();json(res,201,{message:'Leave request submitted.'});
});
route('POST','/api/leave/decision',async(req,res,{db,u,body})=>{
 if(!isLeader(u))return error(res,403,'Admin/HOD only.');const x=db.leaveRequests.find(x=>x.id===body.id),st=db.staff.find(s=>s.id===x?.staffId);if(!x||!st||!canDept(u,st.departmentId))return error(res,403,'Request not in your department.');if(!['Approved','Rejected'].includes(body.status))return error(res,400,'Choose Approved or Rejected.');x.status=body.status;saveDb();json(res,200,{message:`Leave request ${x.status.toLowerCase()}.`});
});
route('POST','/api/admin/fee-payment',async(req,res,{db,u,body})=>{
 if(u.role!=='admin')return error(res,403,'Admin accounts only.');const ledger=db.feeLedger.find(x=>x.studentId===body.studentId);if(!ledger)return error(res,404,'Student fee record not found.');
 const due=ledger.tuition+ledger.lab+ledger.exam-ledger.paid,amount=Number(body.amount);if(!Number.isFinite(amount)||amount<=0||amount>due)return error(res,400,'Amount must be positive and no greater than outstanding dues.');
 const method=['Cash','Bank Transfer','UPI (recorded externally)'].includes(body.method)?body.method:'Cash';ledger.paid+=amount;const receipt={id:uid('rc'),studentId:ledger.studentId,amount,method,createdAt:new Date().toISOString(),recordedBy:u.id,demo:true};db.payments.unshift(receipt);saveDb();json(res,200,{message:'Offline/demo fee receipt recorded. No payment was processed.',receipt});
});
route('POST','/api/admin/department',async(req,res,{db,u,body})=>{
 if(u.role!=='admin')return error(res,403,'Admin only.');const code=ensureText(body.code,'Department code',2,10).toUpperCase(),name=ensureText(body.name,'Department name');if(db.departments.some(d=>d.code===code))return error(res,409,'Department code already exists.');db.departments.push({id:uid('d'),code,name,location:text(body.location,80)||'Main Campus'});saveDb();json(res,201,{message:'Department added.'});
});
route('POST','/api/admin/subject',async(req,res,{db,u,body})=>{
 if(!isLeader(u))return error(res,403,'Admin/HOD only.');const departmentId=text(body.departmentId);if(!canDept(u,departmentId))return error(res,403,'Outside your department.');const faculty=db.staff.find(f=>f.id===body.facultyId&&f.departmentId===departmentId);if(!faculty)return error(res,400,'Select an instructor from this department.');const code=ensureText(body.code,'Subject code',3,20).toUpperCase(),name=ensureText(body.name,'Subject name');if(db.subjects.some(s=>s.code===code))return error(res,409,'Subject code already exists.');const semester=Number(body.semester),credits=Number(body.credits);if(!Number.isInteger(semester)||semester<1||semester>8||!Number.isInteger(credits)||credits<1||credits>6)return error(res,400,'Semester must be 1–8 and credits 1–6.');db.subjects.push({id:uid('s'),code,name,departmentId,facultyId:faculty.id,semester,credits});saveDb();json(res,201,{message:'Subject created.'});
});
route('POST','/api/admin/timetable',async(req,res,{db,u,body})=>{
 if(!isLeader(u))return error(res,403,'Admin/HOD only.');const sub=db.subjects.find(x=>x.id===body.subjectId);if(!sub||!canDept(u,sub.departmentId))return error(res,403,'Subject not allowed.');const day=text(body.day),slot=text(body.slot),room=ensureText(body.room,'Room',2,30);if(!['Monday','Tuesday','Wednesday','Thursday','Friday'].includes(day)||!['09:00','10:15','11:30','13:15','14:15'].includes(slot))return error(res,400,'Choose a valid weekday and period.');if(db.timetable.some(x=>x.departmentId===sub.departmentId&&x.semester===sub.semester&&x.day===day&&x.slot===slot))return error(res,409,'This class already has a scheduled period.');
 db.timetable.push({id:uid('tt'),departmentId:sub.departmentId,semester:sub.semester,day,slot,room,subjectId:sub.id,facultyId:sub.facultyId});saveDb();json(res,201,{message:'Class scheduled.'});
});
route('POST','/api/admin/timetable/delete',async(req,res,{db,u,body})=>{
 if(!isLeader(u))return error(res,403,'Admin/HOD only.');const x=db.timetable.find(x=>x.id===body.id);if(!x||!canDept(u,x.departmentId))return error(res,403,'Schedule not authorized.');db.timetable=db.timetable.filter(y=>y.id!==x.id);saveDb();json(res,200,{message:'Timetable entry removed.'});
});
async function handleApi(req,res){
 let pathname;try{pathname=new URL(req.url,'http://localhost').pathname;}catch{return error(res,400,'Invalid request URL');}
 if(pathname==='/api/index.js'&&req.headers['x-original-url'])pathname=req.headers['x-original-url'];
 if(req.method==='OPTIONS'){res.writeHead(204,{'Allow':'GET, POST, OPTIONS'});return res.end();}
 if(!['GET','POST'].includes(req.method))return error(res,405,'Method not allowed');
 let body={};if(req.method==='POST'){try{body=await readBody(req);}catch(e){return error(res,400,e.message);}}
 const db=getDb();const publicPaths=new Set(['/api/health','/api/auth/login','/api/auth/register']);const u=activeUser(req,db);
 if(!publicPaths.has(pathname)&&!u)return error(res,401,'Sign in to continue.');
 const fn=routes[req.method+' '+pathname];if(!fn)return error(res,404,'API endpoint not found');return fn(req,res,{db,u,body});
}
module.exports={handleApi,publicRows};
