import {newId} from './id.js';
import {MODES} from './data.js';
export const modeFor=id=>MODES.find(m=>m.id===id)||MODES[0];
export function makePrompt(form,sources=[]){const m=modeFor(form.mode);return `บทบาท: คุณคือผู้ช่วยเตรียมการสื่อสารสาธารณะที่รับผิดชอบต่อข้อเท็จจริง\nงาน: ${m.name}\nหัวข้อ: ${form.topic.trim()||'[ระบุหัวข้อ]'}\nเวลา: ${form.duration} นาที\nบริบท: ${form.context||'ประชาชนทั่วไป ไม่เจาะกลุ่มตามข้อมูลส่วนบุคคล'}\nสารหลัก: ${form.keyMessage||'[ระบุสารหลัก]'}\nน้ำเสียง: ${form.tone}\nคำถามที่ต้องตอบ: ${form.question||'[ยังไม่ได้ระบุ]'}\n\nข้อมูลที่ผู้ใช้ให้ (ยังต้องตรวจสอบก่อนเผยแพร่):\n${form.facts||'[ยังไม่มีข้อมูลอ้างอิง ห้ามเติมสถิติหรือข้อเท็จจริงเอง]'}\n\nแหล่งข้อมูลประกอบที่เลือกไว้:\n${sources.length?sources.map((s,i)=>`[${i+1}] ${s.title}: ${s.url} (${s.status==='checked'?'ผู้ใช้ระบุว่าตรวจแล้ว':'ยังไม่ได้ยืนยันภายนอก'})`).join('\n'):'[ไม่มีแหล่งข้อมูล]'}\n\nข้อจำกัด: ${form.limits||'ห้ามยืนยันข้อมูลที่ไม่มีหลักฐาน'}\n\nโครงสร้างที่ต้องการ:\n${m.structure.map((v,i)=>`${i+1}. ${v}`).join('\n')}\n\nมาตรฐานงาน:\n- เขียนเพื่อให้ประชาชนทั่วไปเข้าใจประเด็นและทางเลือก ไม่ใช้ข้อมูลอ่อนไหวหรือข้อมูลส่วนบุคคลเพื่อชักจูงทางการเมืองแบบเจาะกลุ่ม\n- แยกข้อเท็จจริง ข้อเสนอ และสมมติฐาน ใส่ [ต้องตรวจสอบ] เมื่อหลักฐานไม่พอ ห้ามแต่งตัวเลข คำพูดบุคคลหรือแหล่งอ้างอิง\n- อธิบายประโยชน์ ข้อจำกัด ผลกระทบ งบประมาณที่ทราบ และทางเลือกอย่างเป็นธรรม ไม่สัญญาผลลัพธ์ที่ยังไม่ยืนยัน\n- ไม่กล่าวหาบุคคล ไม่สร้างข้อมูลเท็จ ไม่ชักนำความเกลียดชัง และไม่เดาความเห็นของประชาชน\n- หากเป็นเวทีรับฟัง ให้ตั้งคำถามปลายเปิดไม่ชี้นำ ขออนุญาตก่อนบันทึกข้อมูล และสรุปความเห็นต่างอย่างเท่าเทียม\n- หากตอบสื่อ ให้ตอบคำถามก่อน อธิบายสิ่งที่รู้และยังไม่รู้ ระบุว่าจะตรวจสอบอย่างไร โดยไม่หลบประเด็น\n\nผลลัพธ์: (1) โครงประเด็นพร้อมเวลารวม ${form.duration} นาที (2) ร่างสคริปต์พร้อมจุดเว้นวรรค (3) Cue Card ไม่เกิน 5 ข้อ (4) คำถามต่อยอด 3 ข้อ (5) ตารางข้อกล่าวอ้างกับแหล่งอ้างอิงและสิ่งที่ต้องตรวจสอบ\nหมายเหตุ: เนื้อหาที่สร้างต้องผ่านการตรวจโดยผู้ใช้ก่อนใช้งานจริง`;}
export function makeOutline(form){const m=modeFor(form.mode),topic=form.topic.trim()||'[หัวข้อ]',facts=form.facts.trim()||'[เพิ่มข้อเท็จจริงและแหล่งอ้างอิงก่อนใช้จริง]';let bodies;
if(form.mode==='listening')bodies=[`ท่านมีประสบการณ์เกี่ยวกับ “${topic}” อย่างไรบ้าง?`,`ปัญหานี้ส่งผลต่อชีวิตหรือการทำงานของท่านอย่างไร และมีใครได้รับผลกระทบอีก?`,`ทางเลือกใดที่ท่านคิดว่าน่าลอง เพราะอะไร และมีข้อกังวลอะไร?`,`จากที่รับฟัง มีจุดร่วมและความเห็นต่างใดบ้าง? [เติมจากสิ่งที่ผู้เข้าร่วมพูดจริง]\nเราควรติดตามเรื่องใด และแจ้งความคืบหน้าผ่านช่องทางใด?`];
else if(form.mode==='media')bodies=[`คำถาม: ${form.question||'[ใส่คำถามสื่อ]'}\nคำตอบตรงประเด็น: [เติมคำตอบที่ยืนยันได้เกี่ยวกับ ${topic}]`,facts,`สิ่งที่ยังไม่ทราบ: ${form.limits||'[ระบุข้อจำกัดและสิ่งที่กำลังตรวจสอบ]'}`,`ขั้นตอนตรวจสอบ: [ระบุผู้รับผิดชอบ]\nการอัปเดต: [ระบุเวลาหรือช่องทางที่ยืนยันแล้ว]`];
else if(form.mode==='public')bodies=[`วันนี้เราจะร่วมทำความเข้าใจเรื่อง “${topic}”\n[ระบุปัญหาและผลกระทบที่มีข้อมูลรองรับ]`,facts,`ข้อเสนอ: ${form.keyMessage||'[เติมข้อเสนอ]'}\n[อธิบายทางเลือก ข้อดี ผลกระทบ ต้นทุน และข้อแลกเปลี่ยนอย่างเป็นธรรม]`,`ข้อจำกัด: ${form.limits}\n[ระบุขั้นตอนดำเนินงาน ผู้รับผิดชอบ และวิธีติดตามที่ยืนยันได้]`];
else if(form.mode==='debate')bodies=[`ประเด็นอภิปราย: ${topic}\nข้อเสนอ: ${form.keyMessage||'[เติมข้อเสนอ]'}`,facts,`[สรุปเหตุผลของมุมมองที่ต่างอย่างเป็นธรรม]\n[ตอบด้วยหลักฐาน ไม่โจมตีตัวบุคคล]`,`[สรุปสิ่งที่มีหลักฐานสนับสนุน]\nข้อจำกัด: ${form.limits}\n[เปิดคำถามที่ยังต้องศึกษา]`];
else bodies=[`สวัสดีและยินดีต้อนรับทุกท่าน /\nวันนี้เราร่วมพูดคุยเรื่อง “${topic}”`,`สารสำคัญ: ${form.keyMessage||'[ระบุสารหลัก]'}\nข้อมูลประกอบ: ${facts}`,`[แจ้งลำดับรายการและเวลา]\n[เชื่อมโยงแต่ละช่วงด้วยประโยคสั้น]`,`ขอบคุณทุกความคิดเห็น /\n[สรุปสิ่งที่ได้รับและส่งต่อช่วงถัดไป]`];
return `ร่างโครงสำหรับเติมข้อมูล ไม่ใช่ข้อความที่ AI สร้าง\n${m.name} · ${topic} · ${form.duration} นาที\n\n${m.structure.map((h,i)=>`${i+1}. ${h}\n${bodies[i]}`).join('\n\n')}\n\nCue Card\n${m.structure.map(v=>`• ${v}`).join('\n')}\n\nก่อนใช้จริง: ตรวจแหล่งอ้างอิง ข้อจำกัด และชื่อผู้เกี่ยวข้องทั้งหมด`;}
export function safeUrl(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}}
export function validateBackup(x){
  if(!x || typeof x !== 'object') throw Error('รูปแบบไฟล์สำรองไม่ถูกต้อง');
  if(x.version !== undefined && x.version !== 1) throw Error('เวอร์ชันไฟล์สำรองไม่ถูกต้อง รองรับเฉพาะเวอร์ชัน 1');
  const rawSlides = Array.isArray(x) ? x : x.slides;
  if(!Array.isArray(rawSlides) || rawSlides.length < 1 || rawSlides.length > 500) throw Error('ข้อมูลสไลด์ไม่ถูกต้อง ต้องมีระหว่าง 1 ถึง 500 สไลด์');
  const rawSources = x.sources === undefined ? [] : x.sources;
  const rawDrafts = x.drafts === undefined ? [] : x.drafts;
  if(!Array.isArray(rawSources) || !Array.isArray(rawDrafts)) throw Error('รูปแบบรายการแหล่งข้อมูลหรือบทพูดไม่ถูกต้อง');
  if(rawSources.length > 200 || rawDrafts.length > 200) throw Error('ข้อมูลมากเกินขนาดที่รองรับ (สูงสุดอย่างละ 200 รายการ)');

  const str = (v, max = 20000) => typeof v === 'string' && v.length <= max;
  const slides = rawSlides.map((s, i) => {
    if(!s || !str(s.title, 300) || !str(s.subtitle, 1000) || !Array.isArray(s.points) || s.points.length > 20 || !s.points.every(v => str(v, 2000))) {
      throw Error(`ข้อมูลสไลด์ลำดับที่ ${i + 1} ไม่ถูกต้อง`);
    }
    return {
      id: s.id && str(s.id, 100) ? s.id : `slide-${i}-${newId()}`,
      title: s.title.trim(),
      subtitle: s.subtitle.trim(),
      points: s.points.map(p => typeof p === 'string' ? p.trim() : '').filter(Boolean),
      group: str(s.group, 100) && s.group ? s.group : 'เริ่มต้น',
      kind: ['concept','cover','timeline','steps','scale','activity','presence','mic','cue','voice','break','scenario','reflection'].includes(s.kind) ? s.kind : 'concept',
      time: str(s.time, 200) ? s.time : '',
      notes: str(s.notes) ? s.notes : ''
    };
  });

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
  for(const key of ['topic','context','keyMessage','facts','limits','question','tone']) {
    form[key] = str(f[key]) ? f[key] : '';
  }
  form.mode = MODES.some(m => m.id === f.mode) ? f.mode : 'speech';
  form.duration = Math.min(60, Math.max(1, Number(f.duration) || 3));

  return {
    version: 1,
    slides,
    sources,
    drafts,
    form,
    script: str(x.script, 100000) ? x.script : '',
    checks: Object.fromEntries(Array.from({length: 6}, (_, i) => [i, x.checks?.[i] === true]))
  };
}
