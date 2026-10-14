const { randomBytes, scryptSync } = require('node:crypto');
function hash(password){const salt=randomBytes(16).toString('hex');return `scrypt:${salt}:${scryptSync(password,salt,64).toString('hex')}`;}
function initialDatabase(){
 const departments=[
  {id:'d1',code:'CSE',name:'Computer Science & Engineering',location:'Block A · Floor 2'},
  {id:'d2',code:'CSD',name:'Computer Science (Data Science)',location:'Block B · Floor 3'},
  {id:'d3',code:'ECE',name:'Electronics & Communication',location:'Block C · Floor 1'},
  {id:'d4',code:'ME',name:'Mechanical Engineering',location:'Block D · Floor 2'}
 ];
 const staff=[
  {id:'f1',name:'Dr. Ananya Rao',employeeId:'EMP1001',email:'faculty@academiapulse.demo',departmentId:'d2',title:'Associate Professor',specialization:'Data Science',phone:'9000000001'},
  {id:'f2',name:'Dr. Vikram Mehta',employeeId:'EMP1002',email:'hod@academiapulse.demo',departmentId:'d2',title:'Head of Department',specialization:'Machine Learning',phone:'9000000002'},
  {id:'f3',name:'Prof. Neha Reddy',employeeId:'EMP1003',email:'neha@academiapulse.demo',departmentId:'d1',title:'Assistant Professor',specialization:'Web Technologies',phone:'9000000003'},
  {id:'f4',name:'Dr. Arjun Patel',employeeId:'EMP1004',email:'arjun@academiapulse.demo',departmentId:'d3',title:'Professor',specialization:'Embedded Systems',phone:'9000000004'},
  {id:'f5',name:'Prof. Kavya Singh',employeeId:'EMP1005',email:'kavya@academiapulse.demo',departmentId:'d4',title:'Assistant Professor',specialization:'Thermodynamics',phone:'9000000005'},
  {id:'f6',name:'Dr. Mira Joshi',employeeId:'EMP1006',email:'mira@academiapulse.demo',departmentId:'d1',title:'Professor',specialization:'Algorithms',phone:'9000000006'},
  {id:'f7',name:'Prof. Ravi Sharma',employeeId:'EMP1007',email:'ravi@academiapulse.demo',departmentId:'d2',title:'Assistant Professor',specialization:'Cloud Computing',phone:'9000000007'},
  {id:'f8',name:'Dr. Sana Iqbal',employeeId:'EMP1008',email:'sana@academiapulse.demo',departmentId:'d3',title:'Associate Professor',specialization:'VLSI',phone:'9000000008'}
 ];
 const subjects=[
  {id:'s1',code:'CSD301',name:'Data Warehousing & BI',departmentId:'d2',semester:5,credits:4,facultyId:'f1'},
  {id:'s2',code:'CSD302',name:'Big Data Analytics',departmentId:'d2',semester:5,credits:4,facultyId:'f2'},
  {id:'s3',code:'CSD303',name:'Node.js Full Stack Lab',departmentId:'d2',semester:5,credits:2,facultyId:'f1'},
  {id:'s4',code:'CSD304',name:'Machine Learning',departmentId:'d2',semester:5,credits:4,facultyId:'f2'},
  {id:'s5',code:'CSD305',name:'Computer Networks',departmentId:'d2',semester:5,credits:3,facultyId:'f7'},
  {id:'s6',code:'CSE301',name:'Design & Analysis of Algorithms',departmentId:'d1',semester:5,credits:4,facultyId:'f6'},
  {id:'s7',code:'CSE302',name:'Web Development',departmentId:'d1',semester:5,credits:3,facultyId:'f3'},
  {id:'s8',code:'ECE301',name:'Digital Signal Processing',departmentId:'d3',semester:5,credits:4,facultyId:'f4'},
  {id:'s9',code:'ECE302',name:'VLSI Design',departmentId:'d3',semester:5,credits:3,facultyId:'f8'},
  {id:'s10',code:'ME301',name:'Thermal Engineering',departmentId:'d4',semester:5,credits:4,facultyId:'f5'},
  {id:'s11',code:'CSD201',name:'Programming with Python',departmentId:'d2',semester:3,credits:3,facultyId:'f7'},
  {id:'s12',code:'CSE201',name:'Database Management Systems',departmentId:'d1',semester:3,credits:3,facultyId:'f3'}
 ];
 const first=['Aarav','Isha','Rohan','Meera','Dev','Sanya','Kiran','Anika','Rahul','Priya','Aditi','Nikhil','Sneha','Varun','Diya','Karthik','Riya','Vivek','Tanvi','Ajay','Nisha','Harsha','Pooja','Manav','Tara','Shreya','Yash','Rithika','Arvind','Keerthi','Pavan','Lavanya'];
 const last=['Kumar','Sharma','Reddy','Nair','Patel','Singh','Rao','Gupta'];
 const students=first.map((n,i)=>({id:'st'+(i+1),rollNo:`26${['CSD','CSE','ECE','ME'][Math.floor(i/8)]}${String(i+1).padStart(3,'0')}`,name:n+' '+last[i%8],email:`student${i+1}@academiapulse.demo`,departmentId:['d2','d1','d3','d4'][Math.floor(i/8)],semester:i!==0&&i%7===0?3:5,section:i%2===0?'A':'B',guardian:'Parent / Guardian',guardianPhone:'900000'+String(1000+i),phone:'800000'+String(1000+i),status:'Active'}));
 students[0].email='student@academiapulse.demo';
 const pass=hash('Pulse@123');
 const accounts=[
  {id:'u1',name:'System Administrator',email:'admin@academiapulse.demo',role:'admin',status:'approved',passwordHash:pass,departmentId:null},
  {id:'u2',name:'Dr. Vikram Mehta',email:'hod@academiapulse.demo',role:'hod',status:'approved',passwordHash:pass,departmentId:'d2',staffId:'f2'},
  {id:'u3',name:'Dr. Ananya Rao',email:'faculty@academiapulse.demo',role:'faculty',status:'approved',passwordHash:pass,departmentId:'d2',staffId:'f1'},
  {id:'u4',name:students[0].name,email:'student@academiapulse.demo',role:'student',status:'approved',passwordHash:pass,departmentId:'d2',studentId:'st1'},
  {id:'u5',name:'Prof. Neha Reddy',email:'neha@academiapulse.demo',role:'faculty',status:'approved',passwordHash:pass,departmentId:'d1',staffId:'f3'}
 ];
 const attendance=[]; let a=0;
 for(const s of students){for(const sub of subjects.filter(x=>x.departmentId===s.departmentId&&x.semester===s.semester)){
  for(let d=1;d<=12;d++){const status=((d+s.id.length+sub.id.length+Number(s.id.slice(2)))%13===0|| (s.id==='st1'&&d%4===0))?'Absent':d%9===0?'Late':'Present';attendance.push({id:'a'+(++a),studentId:s.id,subjectId:sub.id,date:`2026-10-${String(d).padStart(2,'0')}`,status,markedBy:sub.facultyId});}
 }}
 const staffAttendance=[];let sa=0;
 for(const f of staff)for(let day=1;day<=12;day++)staffAttendance.push({id:'fa'+(++sa),staffId:f.id,date:`2026-10-${String(day).padStart(2,'0')}`,status:(day+Number(f.id.slice(1)))%14===0?'Absent':(day%10===0?'Leave':'Present')});
 const marks=[];let m=0;
 for(const s of students)for(const sub of subjects.filter(x=>x.departmentId===s.departmentId&&x.semester===s.semester))marks.push({id:'g'+(++m),studentId:s.id,subjectId:sub.id,internal:25+(m%15),external:36+(m*3%24),updatedAt:'2026-10-12'});
 const feeLedger=students.map((s,i)=>({id:'fee'+(i+1),studentId:s.id,tuition:55000,lab:6500,exam:2500,paid:i%6===0?40000:i%5===0?64000:30000+(i%4)*8500}));
 const timetable=[];let t=0;const days=['Monday','Tuesday','Wednesday','Thursday','Friday'];const slots=['09:00','10:15','11:30','13:15','14:15'];
 for(const dept of departments){const subs=subjects.filter(x=>x.departmentId===dept.id&&x.semester===5);for(let i=0;i<5;i++)for(let j=0;j<5;j++)if(subs.length){const sub=subs[(i+j)%subs.length];timetable.push({id:'tt'+(++t),departmentId:dept.id,semester:5,day:days[i],slot:slots[j],subjectId:sub.id,facultyId:sub.facultyId,room:`${dept.code}-${201+(j%3)}`});}}
 const notices=[
  {id:'n1',title:'Mid-Semester Review Schedule',body:'Internal assessment review begins next week. Check your departmental timetable.',priority:'High',audience:'all',departmentId:null,createdAt:'2026-10-12',createdBy:'u1'},
  {id:'n2',title:'Node.js Lab Submission',body:'Submit your working full-stack lab projects with source code and project reports.',priority:'High',audience:'students',departmentId:'d2',createdAt:'2026-10-11',createdBy:'u3'},
  {id:'n3',title:'Library Digital Resources',body:'New e-journal access is now available in the central library.',priority:'Normal',audience:'all',departmentId:null,createdAt:'2026-10-10',createdBy:'u1'},
  {id:'n4',title:'Faculty Planning Meeting',body:'Department faculty meeting this Friday at 3:30 PM.',priority:'Normal',audience:'staff',departmentId:'d2',createdAt:'2026-10-09',createdBy:'u2'}
 ];
 const leaveRequests=[{id:'l1',staffId:'f1',from:'2026-10-20',to:'2026-10-21',reason:'Personal leave',status:'Pending',createdAt:'2026-10-12'}];
 return {departments,staff,subjects,students,accounts,attendance,staffAttendance,marks,feeLedger,timetable,notices,leaveRequests,payments:[],meta:{seededAt:new Date().toISOString(),version:1}};
}
module.exports={initialDatabase,hash};
