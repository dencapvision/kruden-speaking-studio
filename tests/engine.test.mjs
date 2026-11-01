import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,agenda,MODES,initialSequences} from '../src/data.js';
import {makePrompt,makeOutline,validateBackup,safeUrl} from '../src/engine.js';

test('workshop agenda totals exactly 180 minutes',()=>assert.equal(agenda.reduce((sum,x)=>sum+x[2],0),180));

test('all five speaking modes produce usable prompts without inventing evidence',()=>{
  for(const mode of MODES){
    const form={...initialState.form,mode:mode.id,facts:'',topic:'ระบบขนส่ง'};
    const prompt=makePrompt(form,[]);
    assert.ok(prompt.includes('ระบบขนส่ง'));
    assert.ok(prompt.includes(mode.name));
    assert.ok(prompt.includes('ห้ามเติมสถิติ'));
    assert.ok(prompt.includes('ไม่ชี้นำ'));
    assert.ok(makeOutline(form).includes('ไม่ใช่ข้อความที่ AI สร้าง'));
  }
});

test('source citations are opt-in and manually checked status is correctly described',()=>{
  const prompt=makePrompt(initialState.form,[{title:'เอกสาร ก',url:'https://example.org',status:'checked'}]);
  assert.ok(prompt.includes('[1] เอกสาร ก: https://example.org'));
  assert.ok(prompt.includes('ผู้ใช้ระบุว่าตรวจแล้ว'));
});

test('backup round trip retains sequences and drafts without trusting arbitrary fields',()=>{
  const result=validateBackup(JSON.parse(JSON.stringify({...initialState,admin:true})));
  assert.equal(result.sequences.length,3);
  assert.equal(result.form.topic,initialState.form.topic);
  assert.equal(result.admin,undefined);
  assert.equal(result.script,'');
});

test('unsafe source links cannot be imported',()=>{
  assert.equal(safeUrl('javascript:alert(1)'),null);
  assert.equal(safeUrl('data:text/html,test'),null);
  assert.equal(safeUrl('https://example.com'),'https://example.com/');
  assert.throws(()=>validateBackup({...initialState,sources:[{title:'x',url:'javascript:alert(1)'}]}));
});

test('malformed backups are rejected and imported durations are bounded',()=>{
  assert.throws(()=>validateBackup(null));
  assert.throws(()=>validateBackup({version:1,sequences:[{title:'x',items:'bad'}]}));
  assert.equal(validateBackup({...initialState,form:{...initialState.form,duration:999}}).form.duration,60);
});

test('legacy backup with slides gracefully falls back to initial sequences',()=>{
  const legacy={slides:[{title:'สไลด์เดิม'}]};
  const res=validateBackup(legacy);
  assert.equal(res.sequences.length,3);
  assert.equal(res.sources.length,0);
  assert.equal(res.drafts.length,0);
});
