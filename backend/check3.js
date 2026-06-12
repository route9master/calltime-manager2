const {Client}=require('pg');
const c=new Client({connectionString:'postgresql://postgres:rfaQiIuIDFeZueqcfgXUVPkVpEjhgHRB@acela.proxy.rlwy.net:38749/railway',ssl:{rejectUnauthorized:false}});
c.connect().then(()=>c.query("SELECT call_type, COUNT(*) FROM call_logs WHERE user_id=(SELECT id FROM users WHERE username='route01') AND call_date >= '2026-06-01' GROUP BY call_type")).then(r=>console.log(r.rows)).catch(e=>console.log(e)).finally(()=>c.end())
