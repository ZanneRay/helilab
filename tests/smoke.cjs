const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
const root=path.resolve(__dirname,'..');const server=http.createServer((req,res)=>{const file=path.join(root,decodeURIComponent(req.url.split('?')[0]));try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(file));}catch(e){res.statusCode=404;res.end('Not found');}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const url=`http://127.0.0.1:${server.address().port}/HeliLab.html`;
await page.goto(url);await page.waitForTimeout(300);
const acts=await page.evaluate(()=>HLTraining.activities().map(a=>a.lessonId));const results=[];
for(const width of [1280,768,390]){
await page.setViewportSize({width,height:900});
for(const id of acts){await page.goto(url+'#/activity/'+id);await page.getByLabel('Before you explore:',{exact:false}).fill('I predict the resulting force changes because the airflow changes.');await page.getByRole('button',{name:'Save prediction and open the task',exact:true}).click();await page.waitForTimeout(80);results.push({width,id,...await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,errors:[...document.querySelectorAll('.hl-err')].map(e=>e.textContent),title:document.querySelector('h1')?.textContent}))});}
}
console.log(JSON.stringify({activities:acts.length,failures:results.filter(x=>x.overflow||x.errors.length||!x.title),errors},null,2));
await browser.close();server.close();if(errors.length||results.some(x=>x.overflow||x.errors.length||!x.title))process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
