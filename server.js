const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pipeline } = require('node:stream');
const { promisify } = require('node:util');
const pipe = promisify(pipeline);
const ROOT = __dirname;
const DATA = path.join(ROOT, 'movie-data');
const MOVIE = path.join(DATA, 'movie.bin');
const META = path.join(DATA, 'movie.json');
const PORT = Number(process.env.PORT || 8080);
const ACCESS_CODE = process.env.ACCESS_CODE || crypto.randomBytes(4).toString('hex').toUpperCase();
const COOKIE_SECRET = crypto.randomBytes(32).toString('hex');
const MAX_UPLOAD = 5 * 1024 ** 3;
fs.mkdirSync(DATA, { recursive: true });
console.log('\nMovie Night local server');
console.log('Access code: ' + ACCESS_CODE);
console.log('Local address: http://localhost:' + PORT);
console.log('Keep this Terminal window open. Start a tunnel in a second window to share remotely.\n');
const sign = value => crypto.createHmac('sha256', COOKIE_SECRET).update(value).digest('hex');
function authorized(req) {
  const cookies = Object.fromEntries((req.headers.cookie || '').split(';').map(s => s.trim().split('=').map(decodeURIComponent)).filter(a => a.length === 2));
  const value = cookies.session || '';
  const [payload, signature] = value.split('.');
  if (!payload || !signature) return false;
  const expected = sign(payload);
  return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) && payload === 'movie-night';
}
function send(res, status, body, type='text/plain; charset=utf-8') { res.writeHead(status, {'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body); }
function needAuth(req,res){if(!authorized(req)){send(res,401,'Access code required');return false}return true}
const server = http.createServer(async (req,res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; media-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"});
    return fs.createReadStream(path.join(ROOT,'index.html')).pipe(res);
  }
  if (req.method === 'POST' && url.pathname === '/login') {
    let body='';req.on('data',chunk=>{body+=chunk;if(body.length>4096)req.destroy()});
    req.on('end',()=>{try{const data=JSON.parse(body);const submitted=String(data.code||'');const a=crypto.createHash('sha256').update(submitted).digest();const b=crypto.createHash('sha256').update(ACCESS_CODE).digest();if(!crypto.timingSafeEqual(a,b))return send(res,401,'Wrong access code');const payload='movie-night';const token=payload+'.'+sign(payload);res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':'session='+encodeURIComponent(token)+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400'});res.end('{"ok":true}') }catch{send(res,400,'Invalid request')}});
    return;
  }
  if (!needAuth(req,res)) return;
  if (req.method === 'GET' && url.pathname === '/status') {
    const exists=fs.existsSync(MOVIE);let meta={name:'movie'};try{meta=JSON.parse(fs.readFileSync(META,'utf8'))}catch{}
    return send(res,200,JSON.stringify({exists,name:meta.name||'movie'}),'application/json');
  }
  if (req.method === 'PUT' && url.pathname === '/upload') {
    const length=Number(req.headers['content-length']||0);
    if(length>MAX_UPLOAD)return send(res,413,'File exceeds the 5 GiB limit.');
    const temp=MOVIE+'.uploading';
    const out=fs.createWriteStream(temp);
    req.on('aborted',()=>{out.destroy();fs.rm(temp,{force:true},()=>{})});
    out.on('error',err=>{console.error(err);if(!res.headersSent)send(res,500,'Could not save the movie. Check free disk space.')});
    out.on('finish',()=>{
      try {
        fs.renameSync(temp,MOVIE);
        let name='movie';try{name=decodeURIComponent(req.headers['x-movie-name']||'movie')}catch{}
        name=path.basename(name).replace(/[\r\n\0]/g,'').slice(0,200)||'movie';
        const mime=String(req.headers['content-type']||'application/octet-stream').split(';')[0];
        fs.writeFileSync(META,JSON.stringify({name,mime}));
        send(res,200,'Upload complete');
      } catch(err){console.error(err);send(res,500,'Could not finish saving the movie.')}
    });
    req.pipe(out);return;
  }
  if (req.method === 'GET' && url.pathname === '/movie') {
    let stat;try{stat=fs.statSync(MOVIE)}catch{return send(res,404,'Upload a movie first.')}
    let meta={mime:'video/mp4'};try{meta=JSON.parse(fs.readFileSync(META,'utf8'))}catch{}
    const mime=/^(video\/[a-zA-Z0-9.+-]+|application\/octet-stream)$/.test(meta.mime)?meta.mime:'application/octet-stream';
    const range=req.headers.range;
    if(range){
      const m=/^bytes=(\d*)-(\d*)$/.exec(range);
      if(!m)return send(res,416,'Invalid range');
      let start=m[1]?Number(m[1]):0;let end=m[2]?Number(m[2]):stat.size-1;
      if(!m[1]&&m[2]){const suffix=Number(m[2]);start=Math.max(0,stat.size-suffix);end=stat.size-1}
      if(start>=stat.size||end<start){res.writeHead(416,{'Content-Range':'bytes */'+stat.size});return res.end()}
      end=Math.min(end,stat.size-1);
      res.writeHead(206,{'Content-Type':mime,'Content-Length':end-start+1,'Content-Range':'bytes '+start+'-'+end+'/'+stat.size,'Accept-Ranges':'bytes','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      return fs.createReadStream(MOVIE,{start,end}).pipe(res);
    }
    res.writeHead(200,{'Content-Type':mime,'Content-Length':stat.size,'Accept-Ranges':'bytes','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    return fs.createReadStream(MOVIE).pipe(res);
  }
  send(res,404,'Not found');
});
server.listen(PORT,'0.0.0.0',()=>{});
process.on('SIGINT',()=>{console.log('\nStopping server.');server.close(()=>process.exit(0))});
