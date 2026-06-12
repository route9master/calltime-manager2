const {Client}=require('pg');
const c=new Client({connectionString:'postgresql://postgres:rfaQiIuIDFeZueqcfgXUVPkVpEjhgHRB@acela.proxy.rlwy.net:38749/railway',ssl:{rejectUnauthorized:false}});
c.connect().then(()=>c.query("DELETE FROM call_logs WHERE call_timestamp::time = '00:00:00'")).then(r=>console.log('삭제됨:',r.rowCount)).catch(e=>console.log(e)).finally(()=>c.end())
