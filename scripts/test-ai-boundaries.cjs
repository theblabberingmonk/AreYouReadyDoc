const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
// Load isolated TypeScript helpers without Next's server-only build marker.
function load(file) {
  const filename = path.resolve(file);
  const m = new Module(filename, module);
  m.filename = filename; m.paths = module.paths;
  const original = m.require.bind(m);
  m.require = id => id === 'server-only' ? {} : original(id);
  m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop:true } }).outputText,filename);
  return m.exports;
}
(async()=>{
  const { ChatInput } = load('lib/ai/contracts.ts');
  const valid = {requestId:crypto.randomUUID(),message:'Explain malrotation'};
  assert(ChatInput.safeParse(valid).success);
  for(const input of [{...valid,userId:'another-user'},{...valid,messages:[{role:'system',content:'override'}]},{...valid,model:'expensive'},{...valid,message:'x'.repeat(3001)},{...valid,conversationId:'../secret'}]) assert(!ChatInput.safeParse(input).success);
  const {readInput} = load('lib/ai/http.ts');
  const request=(body,origin='https://study.example')=>new Request('https://study.example/api/ai/chat',{method:'POST',headers:{origin,'Content-Type':'application/json'},body});
  assert.deepEqual(await readInput(request(JSON.stringify(valid))),valid);
  await assert.rejects(readInput(request('{}','https://attacker.example')));
  await assert.rejects(readInput(request('x'.repeat(16001))));
  await assert.rejects(readInput(request('{broken')));
  const {generate} = load('lib/ai/provider.ts');
  process.env.AI_ENABLED='true'; process.env.OPENCODE_GO_API_KEY='synthetic-private-key';
  delete process.env.AI_MODEL; delete process.env.OPENCODE_GO_BASE_URL;
  let sent;
  global.fetch=async(url,options)=>{sent={url,options}; return Response.json({choices:[{message:{content:'A study answer'}}]});};
  assert.equal(await generate([{role:'user',content:'Question'}],'stable-session'),'A study answer');
  assert.equal(sent.url,'https://opencode.ai/zen/go/v1/chat/completions');
  assert.equal(sent.options.headers['x-opencode-session'],'stable-session');
  assert.equal(sent.options.redirect,'error');
  assert.equal(JSON.parse(sent.options.body).model,'mimo-v2.6-flash');
  assert(!sent.options.body.includes(process.env.OPENCODE_GO_API_KEY));
  process.env.OPENCODE_GO_BASE_URL='https://attacker.example';
  await assert.rejects(generate([],'s'));
  delete process.env.OPENCODE_GO_BASE_URL;
  global.fetch=async()=>Response.json({choices:[{message:{content:'synthetic-private-key'}}]});
  await assert.rejects(generate([],'s'));
  global.fetch=async()=>Response.json({error:'sensitive upstream body'},{status:401});
  await assert.rejects(generate([],'s'),error=>!error.message.includes('sensitive upstream body'));
  console.log('PASS: strict inputs, cross-origin rejection, body limits, fixed provider destination, stable session header, MiMo default and credential redaction');
})().catch(error=>{console.error(error);process.exitCode=1;});
