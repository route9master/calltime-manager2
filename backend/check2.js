const {Client}=require('pg');
const c=new Client({connectionString:'postgresql://postgres:rfaQiIuIDFeZueqcfgXUVPkVpEjhgHRB@acela.proxy.rlwy.net:38749/railway',ssl:{rejectUnauthorized:false}});
c.connect().then(()=>c.query("SELECT phone_number, call_date, duration, call_timestamp FROM call_logs WHERE user_id=(SELECT id FROM users WHERE username='route01') AND phone_number='01077634873' ORDER BY call_timestamp")).then(r=>console.log(r.rows)).catch(e=>console.log(e)).finally(()=>c.end())
