const {Client}=require('pg');
const c=new Client({connectionString:'postgresql://postgres:rfaQiIuIDFeZueqcfgXUVPkVpEjhgHRB@acela.proxy.rlwy.net:38749/railway',ssl:{rejectUnauthorized:false}});
c.connect().then(()=>c.query("SELECT phone_number, call_date, duration, COUNT(*) as cnt FROM call_logs WHERE user_id=(SELECT id FROM users WHERE username='route01') AND call_date >= '2026-06-01' AND call_type='OUTGOING' GROUP BY phone_number, call_date, duration HAVING COUNT(*) > 1")).then(r=>console.log(r.rows.length,'개 중복',r.rows.slice(0,5))).catch(e=>console.log(e)).finally(()=>c.end())
