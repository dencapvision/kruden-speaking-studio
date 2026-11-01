import {newId} from './id.js';
import {MODES, initialSequences} from './data.js';

export const modeFor=id=>{
  if(id==='speech')return MODES.find(m=>m.id==='formal')||MODES[0];
  if(id==='listening')return MODES.find(m=>m.id==='community')||MODES[1];
  if(id==='debate')return MODES.find(m=>m.id==='panel')||MODES[2];
  return MODES.find(m=>m.id===id)||MODES[0];
};

export function makePrompt(form,sources=[]){
  const m=modeFor(form.mode);
  const p5=[];
  if(form.purpose)p5.push(`- Purpose (วัตถุประสงค์): ${form.purpose}`);
  if(form.product)p5.push(`- Product (ผลลัพธ์ที่วัดได้): ${form.product}`);
  if(form.participants)p5.push(`- Participants (กลุ่มผู้ฟัง): ${form.participants}`);
  if(form.problems)p5.push(`- Problems (ปัญหาที่อาจเกิดขึ้นและทางรับมือ): ${form.problems}`);
  if(form.planTopics)p5.push(`- Plan Topics (ประเด็น/หัวข้อ): ${form.planTopics}`);
  if(form.planExamples)p5.push(`- Plan Examples (ตัวอย่าง/ขยายความ): ${form.planExamples}`);
  const p5Text=p5.length?`\n\nกระบวนการเตรียมตัว 5Ps Process:\n${p5.join('\n')}`:'';

  return `บทบาท: คุณคือผู้ช่วยเตรียมการสื่อสารสาธารณะและร่างบทพูดประจำ KRUDEN Speaking Studio ภายใต้แนวคิด Human • Heart • Harmony
งาน/เวที: ${m.name} (${m.sub||m.short})
หัวข้อ: ${form.topic?.trim()||'[ระบุหัวข้อ]'}
เวลา: ${form.duration} นาที
บริบท: ${form.context||'ประชาชนทั่วไป ไม่เจาะกลุ่มตามข้อมูลส่วนบุคคล'}
สารหลัก: ${form.keyMessage||'[ระบุสารหลัก]'}
น้ำเสียง: ${form.tone}
${form.question?`คำถามที่ต้องตอบ: ${form.question}\n`:''}${p5Text}

ข้อมูลที่ผู้ใช้ให้ (ยังต้องตรวจสอบก่อนเผยแพร่):
${form.facts||'[ยังไม่มีข้อมูลอ้างอิง ห้ามเติมสถิติหรือข้อเท็จจริงเอง]'}

แหล่งข้อมูลประกอบที่เลือกไว้:
${sources.length?sources.map((s,i)=>`[${i+1}] ${s.title}: ${s.url} (${s.status==='checked'?'ผู้ใช้ระบุว่าตรวจแล้ว':'ยังไม่ได้ยืนยันภายนอก'})`).join('\n'):'[ไม่มีแหล่งข้อมูล]'}

ข้อจำกัด: ${form.limits||'ห้ามยืนยันข้อมูลที่ไม่มีหลักฐาน'}

โครงสร้างที่ต้องการ:
${m.structure.map((v,i)=>`${i+1}. ${v}`).join('\n')}

มาตรฐานงาน:
- เขียนเพื่อให้ประชาชนทั่วไปเข้าใจประเด็นและทางเลือก ไม่ชี้นำ ไม่ใช้ข้อมูลอ่อนไหวเพื่อชักจูงทางการเมือง
- แยกข้อเท็จจริง ข้อเสนอ และสมมติฐาน ใส่ [ต้องตรวจสอบ] เมื่อหลักฐานไม่พอ ห้ามเติมสถิติหรือข้อเท็จจริงเอง
- ใส่เครื่องหมาย / เพื่อกำหนดจุดเว้นวรรคจังหวะการพูดและการหายใจสำหรับ Teleprompter

ผลลัพธ์: (1) โครงประเด็นพร้อมเวลารวม ${form.duration} นาที (2) ร่างสคริปต์พร้อมจุดเว้นวรรค / (3) Cue Card สรุปไม่เกิน 5 ข้อ (4) คำถามต่อยอด 3 ข้อ
หมายเหตุ: เนื้อหาที่สร้างต้องผ่านการตรวจโดยผู้ใช้ก่อนใช้งานจริง`;
}

export function makeOutline(form){
  const m=modeFor(form.mode);
  const topic=form.topic?.trim()||'[หัวข้อ]';
  const facts=form.facts?.trim()||'[เพิ่มข้อเท็จจริงและแหล่งอ้างอิงก่อนใช้จริง]';
  let bodies;

  if(form.mode==='formal'||form.mode==='speech'){
    bodies=[
      `สวัสดีและยินดีต้อนรับทุกท่านสู่เวที “${topic}” /\nขอต้อนรับแขกผู้มีเกียรติและผู้เข้าร่วมทุกท่านด้วยความอบอุ่น`,
      `วันนี้เรามาร่วมกันเพื่อ: ${form.purpose||form.keyMessage||'[ระบุวัตถุประสงค์และความสำคัญของงาน]'} /\nข้อมูลประกอบ: ${facts}`,
      `สำหรับลำดับรายการในวันนี้ ประกอบด้วย: [ระบุขั้นตอนสำคัญและกิจกรรมไฮไลต์] /\n[เชื่อมโยงแต่ละช่วงด้วยประโยคสั้นและรักษาจังหวะ]`,
      `และในโอกาสนี้ ขอส่งต่อความพร้อมสู่ช่วงถัดไป /\n[หรือกราบเรียนเชิญประธานขึ้นกล่าวเปิดงานอย่างเป็นทางการ]`
    ];
  }else if(form.mode==='community'||form.mode==='listening'){
    bodies=[
      `สวัสดีทุกท่านครับ/ค่ะ วันนี้เรามาเปิดพื้นที่ปลอดภัยร่วมกันในประเด็น “${topic}” /\nไม่มีใครผิดหรือถูก ทุกเสียงของท่านมีความหมาย`,
      `ท่านมีประสบการณ์เกี่ยวกับเรื่องนี้อย่างไรบ้าง? /\nปัญหานี้ส่งผลต่อชีวิตหรือชุมชนของท่านอย่างไร?`,
      `จากมุมมองของท่าน ทางเลือกหรือทางออกใดที่น่าลองทำร่วมกัน? /\nและมีข้อกังวลใดที่อยากให้พวกเราช่วยกันระวัง?`,
      `ขอบคุณทุกเสียงสะท้อนที่มีคุณค่า /\nจุดร่วมที่เราเห็นตรงกันคือ... [เติมจากที่ผู้เข้าร่วมพูดจริง]\nเราจะสรุปและแจ้งความคืบหน้าให้ทราบต่อไป`
    ];
  }else if(form.mode==='panel'||form.mode==='debate'){
    bodies=[
      `ยินดีต้อนรับสู่เวทีเสวนาในหัวข้อ “${topic}” /\nประเด็นสำคัญที่เราจะร่วมค้นหาคำตอบในวันนี้คือ...`,
      `ขอแนะนำวิทยากรผู้ทรงคุณวุฒิที่จะมาร่วมแลกเปลี่ยนในวันนี้ /\n[ระบุชื่อ ตำแหน่ง และความเชี่ยวชาญของแต่ละท่าน]`,
      `ขอเริ่มต้นที่คำถามแรกสำหรับวิทยากร: [ระบุคำถามนำเปิดมุมมอง] /\n[โยนคำถามทีละประเด็นและคุมเวลา]`,
      `จากการแลกเปลี่ยน เราได้มุมมองสำคัญคือ... /\nขอขอบคุณวิทยากรทุกท่านและส่งต่อคำถามสู่ผู้ฟัง`
    ];
  }else if(form.mode==='media'){
    bodies=[
      `คำถาม: ${form.question||'[ใส่คำถามสื่อ]'}\nคำตอบตรงประเด็น: [เติมคำตอบที่ยืนยันได้เกี่ยวกับ ${topic}]`,
      facts,
      `สิ่งที่ยังไม่ทราบ: ${form.limits||'[ระบุข้อจำกัดและสิ่งที่กำลังตรวจสอบ]'}`,
      `ขั้นตอนตรวจสอบ: [ระบุผู้รับผิดชอบ]\nการอัปเดต: [ระบุเวลาหรือช่องทางที่ยืนยันแล้ว]`
    ];
  }else{
    bodies=[
      `วันนี้เราจะร่วมทำความเข้าใจเรื่อง “${topic}” /\n[ระบุปัญหาและผลกระทบที่มีข้อมูลรองรับ]`,
      facts,
      `ข้อเสนอ: ${form.keyMessage||'[เติมข้อเสนอ]'} /\n[อธิบายทางเลือก ข้อดี ผลกระทบ และข้อแลกเปลี่ยนอย่างเป็นธรรม]`,
      `ข้อจำกัด: ${form.limits||'[ระบุข้อจำกัด]'}\n[ระบุขั้นตอนดำเนินงาน ผู้รับผิดชอบ และวิธีติดตามที่ยืนยันได้]`
    ];
  }

  return `โครงสร้างสคริปต์มืออาชีพ (Professional Speech Architecture)
${m.name} · ${topic} · ${form.duration} นาที

${m.structure.map((h,i)=>`${i+1}. ${h}\n${bodies[i]||bodies[0]}`).join('\n\n')}

Cue Card
${m.structure.map(v=>`• ${v}`).join('\n')}

ก่อนใช้จริง: ตรวจแหล่งอ้างอิง ข้อจำกัด และชื่อผู้เกี่ยวข้องทั้งหมด`;
}

export function safeUrl(value){
  try{
    const u=new URL(value);
    return ['https:','http:'].includes(u.protocol)?u.href:null;
  }catch{
    return null;
  }
}

export function validateBackup(x){
  if(!x || typeof x !== 'object') throw Error('รูปแบบไฟล์สำรองไม่ถูกต้อง');
  if(x.version !== undefined && x.version !== 1) throw Error('เวอร์ชันไฟล์สำรองไม่ถูกต้อง รองรับเฉพาะเวอร์ชัน 1');

  const str = (v, max = 20000) => typeof v === 'string' && v.length <= max;

  // Validate Sequences (MC Run of Show)
  let rawSequences;
  if (x.sequences !== undefined) {
    if (!Array.isArray(x.sequences)) {
      throw Error('ข้อมูลซีเคว้นพิธีกรต้องเป็น Array');
    }
    rawSequences = x.sequences;
  } else if (Array.isArray(x.slides)) {
    // Graceful backward compatibility if legacy backup had slides
    rawSequences = initialSequences;
  } else {
    rawSequences = initialSequences;
  }

  if (rawSequences.length < 1 || rawSequences.length > 50) {
    throw Error('ข้อมูลซีเคว้นพิธีกรไม่ถูกต้อง ต้องมีระหว่าง 1 ถึง 50 ชุด');
  }

  const sequences = rawSequences.map((seq, seqIdx) => {
    if (!seq || !str(seq.title, 300) || !Array.isArray(seq.items)) {
      throw Error(`ข้อมูลซีเคว้นงานลำดับที่ ${seqIdx + 1} ไม่ถูกต้อง`);
    }
    const items = seq.items.map((item, itemIdx) => {
      if (!item || !str(item.segment, 300)) {
        throw Error(`คิวงานลำดับที่ ${itemIdx + 1} ในชุด "${seq.title}" ไม่ถูกต้อง`);
      }
      return {
        id: item.id && str(item.id, 100) ? item.id : `item-${seqIdx}-${itemIdx}-${newId()}`,
        time: str(item.time, 100) ? item.time : '',
        duration: Math.min(600, Math.max(1, Number(item.duration) || 5)),
        segment: item.segment.trim(),
        speaker: str(item.speaker, 300) ? item.speaker.trim() : '',
        cue: str(item.cue, 1000) ? item.cue.trim() : '',
        dialogue: str(item.dialogue, 5000) ? item.dialogue.trim() : ''
      };
    });
    return {
      id: seq.id && str(seq.id, 100) ? seq.id : `seq-${seqIdx}-${newId()}`,
      title: seq.title.trim(),
      stage: str(seq.stage, 50) ? seq.stage : 'formal',
      totalTime: str(seq.totalTime, 100) ? seq.totalTime : '',
      description: str(seq.description, 1000) ? seq.description : '',
      items
    };
  });

  const rawSources = x.sources === undefined ? [] : x.sources;
  const rawDrafts = x.drafts === undefined ? [] : x.drafts;
  if(!Array.isArray(rawSources) || !Array.isArray(rawDrafts)) throw Error('รูปแบบรายการแหล่งข้อมูลหรือบทพูดไม่ถูกต้อง');
  if(rawSources.length > 200 || rawDrafts.length > 200) throw Error('ข้อมูลมากเกินขนาดที่รองรับ (สูงสุดอย่างละ 200 รายการ)');

  const sources = rawSources.map((s, i) => {
    if(!s || !str(s.title, 300) || !str(s.url, 2000) || !safeUrl(s.url) || !str(s.note || '')) {
      throw Error(`แหล่งข้อมูลลำดับที่ ${i + 1} ไม่ถูกต้อง หรือไม่ใช่ลิงก์ http/https ที่ปลอดภัย`);
    }
    return {
      id: s.id && str(s.id, 100) ? s.id : newId(),
      title: s.title.trim(),
      url: safeUrl(s.url),
      note: s.note ? s.note.trim() : '',
      status: s.status === 'checked' ? 'checked' : 'provided'
    };
  });

  const drafts = rawDrafts.map((d, i) => {
    if(!d || !str(d.title, 300) || !str(d.text, 100000)) {
      throw Error(`บทพูดลำดับที่ ${i + 1} ไม่ถูกต้อง`);
    }
    return {
      id: d.id && str(d.id, 100) ? d.id : newId(),
      title: d.title.trim(),
      text: d.text,
      mode: MODES.some(m => m.id === d.mode) ? d.mode : 'speech',
      date: str(d.date, 100) ? d.date : ''
    };
  });

  const f = x.form || {};
  const form = {};
  for(const key of ['topic','context','keyMessage','facts','limits','question','tone','purpose','product','participants','problems','planTopics','planExamples']) {
    form[key] = str(f[key]) ? f[key] : '';
  }
  const rawMode = f.mode === 'speech' ? 'formal' : (f.mode === 'listening' ? 'community' : (f.mode === 'debate' ? 'panel' : f.mode));
  form.mode = MODES.some(m => m.id === rawMode) ? rawMode : 'formal';
  form.duration = Math.min(60, Math.max(1, Number(f.duration) || 3));

  return {
    version: 1,
    sequences,
    sources,
    drafts,
    form,
    script: str(x.script, 100000) ? x.script : '',
    checks: Object.fromEntries(Array.from({length: 6}, (_, i) => [i, x.checks?.[i] === true]))
  };
}
