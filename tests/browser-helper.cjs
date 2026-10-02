const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
async function setup(){
 const root=path.resolve(__dirname,'..'),server=http.createServer((req,res)=>{const file=path.join(root,decodeURIComponent(req.url.split('?')[0]));try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end('Not found');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url=`http://127.0.0.1:${server.address().port}/HeliLab.html`;
 const go=async route=>{await page.goto(url+'#/'+route);await page.waitForFunction(hash=>window.HLApp&&document.querySelector('#hlMain').dataset.route===hash,'#/'+route);};
 const predict=async()=>{if(await page.getByRole('button',{name:'Open the model',exact:true}).isVisible()){await page.locator('.cbt-field textarea').first().fill('I predict a change in local flow. I will hold the other inputs constant and compare the causal mechanism.');await page.getByRole('button',{name:'Open the model',exact:true}).click();}};
 const capture=async()=>{const n=await page.evaluate(()=>HLProgress.get(location.hash.split('/')[2].split('?')[0]).snapshots.length);await page.getByRole('button',{name:/^Save (this model state|completed model evidence)$/}).click();await page.waitForFunction(n=>HLProgress.get(location.hash.split('/')[2].split('?')[0]).snapshots.length>n,n);};
 const control=async(label,value)=>{await page.locator('.hl-widget-mount').evaluate((host,{label,value})=>{const e=[...host.querySelectorAll('input,select')].find((e,i)=>(e.getAttribute('aria-label')||e.closest('label')?.textContent.trim()||`control-${i}`)===label);if(!e)throw Error('Missing control: '+label);if(e.type==='checkbox')e.checked=!!value;else e.value=String(value);e.dispatchEvent(new Event(e.type==='checkbox'||e.tagName==='SELECT'?'change':'input',{bubbles:true}));},{label,value});await page.waitForTimeout(30);};
 const choose=async text=>{const btn=page.locator('.hl-widget-mount .hl-seg-btn').filter({hasText:text});await btn.filter({hasText:new RegExp('^'+text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$')}).click();};
 const shot=async name=>{if(process.env.HL_QA_DIR){fs.mkdirSync(process.env.HL_QA_DIR,{recursive:true});await page.waitForTimeout(250);await page.screenshot({path:path.join(process.env.HL_QA_DIR,name+'.png')});}};
 return {browser,page,errors,url,go,predict,capture,control,choose,shot,close:async()=>{await browser.close();await new Promise(r=>server.close(r));}};
}
module.exports={setup};
