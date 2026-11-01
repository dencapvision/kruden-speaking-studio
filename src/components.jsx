import React,{useEffect,useRef,useState} from 'react';
import {Pause,Check,X,Play,RotateCcw} from 'lucide-react';

export function Modal({title,children,onClose}){
  const ref=useRef();
  useEffect(()=>{
    const d=ref.current;
    if(!d)return;
    d.showModal();
    const fn=e=>{e.preventDefault();onClose();};
    d.addEventListener('cancel',fn);
    return()=>{
      d.removeEventListener('cancel',fn);
      d.close();
    };
  },[]);
  return <dialog ref={ref} className="modal">
    <div className="modal-heading">
      <h2>{title}</h2>
      <button className="icon-btn" aria-label="ปิดหน้าต่าง" onClick={onClose}><X size={20}/></button>
    </div>
    {children}
  </dialog>;
}

export function SequenceItemEditor({item,onSave,onClose}){
  const [val,setVal]=useState({
    time: item.time||'',
    duration: item.duration||5,
    segment: item.segment||'',
    speaker: item.speaker||'',
    cue: item.cue||'',
    dialogue: item.dialogue||''
  });

  return <Modal title={item.id?'แก้ไขคิวรายการ':'เพิ่มคิวรายการใหม่'} onClose={onClose}>
    <form className="form-stack" onSubmit={e=>{
      e.preventDefault();
      if(!val.segment.trim())return;
      onSave({...item,...val,segment:val.segment.trim()});
    }}>
      <div className="form-row">
        <label>
          เวลาแสดงผล (เช่น 09.00-09.15)
          <input required maxLength={100} value={val.time} onChange={e=>setVal({...val,time:e.target.value})} placeholder="09.00-09.15"/>
        </label>
        <label>
          ระยะเวลาโดยประมาณ (นาที)
          <input type="number" min={1} max={300} value={val.duration} onChange={e=>setVal({...val,duration:Math.max(1,+e.target.value||1)})}/>
        </label>
      </div>

      <label>
        ชื่อช่วงรายการ / ขั้นตอนสำคัญ (Segment)
        <input required maxLength={300} value={val.segment} onChange={e=>setVal({...val,segment:e.target.value})} placeholder="เช่น กล่าวทักทาย & ต้อนรับแขกผู้มีเกียรติ"/>
      </label>

      <label>
        ผู้พูด / บุคคลบนเวที (Speaker)
        <input maxLength={300} value={val.speaker} onChange={e=>setVal({...val,speaker:e.target.value})} placeholder="เช่น พิธีกร, ประธานในพิธี, วิทยากรทั้ง 3 ท่าน"/>
      </label>

      <label>
        คิวเวที / แสงเสียง / อุปกรณ์ (Cue & Tech Notes)
        <textarea rows={2} maxLength={1000} value={val.cue} onChange={e=>setVal({...val,cue:e.target.value})} placeholder="เช่น หรี่เพลงบรรเลง / ฉายสไลด์เปิดงาน / ไมค์ลอย 2 ตัว"/>
      </label>

      <label>
        บทพูดคีย์เวิร์ด / ข้อความสำคัญ (Key Dialogue / Cue Card)
        <textarea rows={3} maxLength={5000} value={val.dialogue} onChange={e=>setVal({...val,dialogue:e.target.value})} placeholder="เช่น 'กราบเรียนท่านประธานและแขกผู้มีเกียรติทุกท่าน ขอต้อนรับเข้าสู่...'"/>
      </label>

      <div className="toolbar" style={{marginTop:'12px'}}>
        <button className="btn" type="button" onClick={onClose}>ยกเลิก</button>
        <button className="btn primary" type="submit"><Check size={16}/> บันทึกคิวรายการ</button>
      </div>
    </form>
  </Modal>;
}

export function Rehearsal({script,notify}){
  const [running,setRunning]=useState(false),[seconds,setSeconds]=useState(0),[speed,setSpeed]=useState(24),[font,setFont]=useState(30);
  const viewport=useRef();
  const [scores,setScores]=useState(['','','','','']);

  useEffect(()=>{
    if(!running)return;
    let last=performance.now();
    const id=setInterval(()=>{
      const now=performance.now();
      if(viewport.current){
        const el=viewport.current;
        if(el.scrollTop+el.clientHeight>=el.scrollHeight-2){
          setRunning(false);
        }else{
          el.scrollTop+=(now-last)/1000*speed;
        }
      }
      last=now;
    },50);
    const timer=setInterval(()=>setSeconds(s=>s+1),1000);
    return()=>{clearInterval(id);clearInterval(timer);};
  },[running,speed]);

  const resetScores=()=>setScores(['','','','','']);

  return <><div className="rehearsal-toolbar">
    <div className="timer"><span className={running?'live-dot':''}/>{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</div>
    <div className="toolbar">
      <button className="btn primary" disabled={!script.trim()} onClick={()=>setRunning(!running)}>{running?<Pause size={18}/>:<Play size={18}/>} {running?'หยุดชั่วคราว':'เริ่มซ้อม'}</button>
      <button className="icon-btn" aria-label="เริ่มเวลาใหม่" onClick={()=>{setRunning(false);setSeconds(0);if(viewport.current)viewport.current.scrollTop=0;}}><RotateCcw size={20}/></button>
    </div>
    <label>ความเร็ว <input type="range" min="0" max="80" value={speed} onChange={e=>setSpeed(+e.target.value)}/></label>
    <label>ตัวอักษร <input type="range" min="20" max="56" value={font} onChange={e=>setFont(+e.target.value)}/></label>
  </div>
  <div className="teleprompter" ref={viewport} tabIndex={0} aria-label="บทสำหรับซ้อมพูด" style={{fontSize:font}}>{script||'ยังไม่มีบทพูด\nไปที่ “พื้นที่เขียนบท” เพื่อเขียนหรือวางสคริปต์ก่อนเริ่มซ้อม'}<div className="teleprompter-end">จบการฝึก</div></div>
  <section className="panel rubric">
    <div className="row-between">
      <div><h2>สะท้อนผลหลังฝึก</h2><p>ประเมินจากสิ่งที่สังเกตได้ คะแนนยังไม่บันทึกจนกดส่งออก</p></div>
      {scores.some(v=>v!=='')&&<button className="btn" type="button" onClick={resetScores}><RotateCcw size={15}/> ล้างคะแนน</button>}
    </div>
    <div className="rubric-fields">{['บุคลิกภาพ','น้ำเสียง','โครงสร้าง','การคุมเวลา','รับมือสถานการณ์'].map((t,i)=><label key={t}>{t}<select value={scores[i]} onChange={e=>setScores(scores.map((v,j)=>j===i?e.target.value:v))}><option value="">ยังไม่ประเมิน</option>{[0,1,2,3,4].map(v=><option key={v} value={v}>{v}</option>)}</select></label>)}</div>
    <div className="row-between">
      <span>{scores.every(v=>v!=='')?`รวม ${scores.reduce((n,v)=>n+Number(v),0)}/20 คะแนน`:'ยังไม่ประเมินครบ 5 ด้าน (กรอกครบทุกด้านเพื่อรวมคะแนน)'} · เกณฑ์ฝึกเสนอ 14/20</span>
      <button className="btn" disabled={scores.some(v=>v==='')} onClick={()=>{
        const blob=new Blob([JSON.stringify({date:new Date().toISOString(),seconds,scores:Object.fromEntries(['บุคลิกภาพ','น้ำเสียง','โครงสร้าง','เวลา','สถานการณ์'].map((x,i)=>[x,+scores[i]]))},null,2)],{type:'application/json'});
        const a=document.createElement('a');
        a.href=URL.createObjectURL(blob);
        a.download='practice-result.json';
        a.click();
        setTimeout(()=>URL.revokeObjectURL(a.href),1000);
        notify('ส่งออกผลฝึกแล้ว');
      }}>ส่งออกผลฝึก</button>
    </div>
    <p className="fine">0 ยังไม่แสดง · 1 ต้องพัฒนา · 2 พอใช้ · 3 ดี · 4 ดีมาก — เป็นเกณฑ์ฝึก ไม่ใช่การรับรองวิชาชีพ</p>
  </section></>}
