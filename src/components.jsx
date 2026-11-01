import React,{useEffect,useRef,useState} from 'react';
import {Mic2,ArrowRight,Eye,Hand,Pause,MessageCircle,Check,ChevronLeft,ChevronRight,X,Play,RotateCcw,Maximize,Minimize,Volume2} from 'lucide-react';
export function SlideVisual({slide,small=false}){
  const points=slide.points||[];
  const isDense=points.length>4;
  return <div className={`slide-art ${slide.kind} ${small?'small':''} ${isDense?'dense':''}`}>
  <div className="slide-head"><span>KRUDEN / SPEAKING CLASS</span><span>{slide.time||slide.group}</span></div>
  <div className="slide-layout"><div className="slide-copy"><p className="slide-eyebrow">{slide.kind==='activity'?'LET’S PRACTICE':slide.kind==='scenario'?'WHAT WOULD YOU SAY?':slide.kind==='reflection'?'REFLECT & GROW':'HUMAN • HEART • HARMONY'}</p><h2>{slide.title}</h2><p className="slide-subtitle">{slide.subtitle}</p>
  {slide.kind==='steps'?<div className="step-points">{points.map((p,i)=><div key={i}><span>{String(i+1).padStart(2,'0')}</span><p>{p}</p>{i<points.length-1&&<ArrowRight aria-hidden="true"/>}</div>)}</div>:slide.kind==='scale'?<><div className="scale-art">{(slide.subtitle.includes('0–4')?[0,1,2,3,4]:[1,2,3,4,5]).map(n=><span key={n}>{n}</span>)}</div><ul>{points.map((p,i)=><li key={i}>{p}</li>)}</ul></>:<ul>{points.map((p,i)=><li key={i}>{p}</li>)}</ul>}
  </div><div className="stage-art" aria-hidden="true"><div className="stage-ring ring-outer"/><div className="stage-ring ring-inner"/>{slide.kind==='presence'?<div className="presence-art"><Eye/><Hand/><Check/></div>:slide.kind==='voice'?<div className="wave-art">{[25,52,76,44,100,65,36,84,55,32].map((v,i)=><i key={i} style={{height:v+'%'}}/>)}</div>:slide.kind==='break'?<Pause className="hero-mic"/>:slide.kind==='reflection'?<MessageCircle className="hero-mic"/>:<Mic2 className="hero-mic"/>}<span className="stage-caption">{slide.kind==='activity'?'YOUR TURN TO SPEAK':slide.kind==='break'?'TAKE A BREATH':'MAKE YOUR VOICE MATTER'}</span></div></div>
  <div className="slide-foot"><span>ครูเด่น มาสเตอร์ฟา</span><span>{slide.kind==='steps'?'LEARN IT. TRY IT. MAKE IT YOURS.':'เข้าใจชัด · ทำได้ง่าย · ใช้ได้จริง'}</span></div></div>}
export function Modal({title,children,onClose}){const ref=useRef();useEffect(()=>{const d=ref.current;d.showModal();const fn=e=>{e.preventDefault();onClose();};d.addEventListener('cancel',fn);return()=>{d.removeEventListener('cancel',fn);d.close();};},[]);return <dialog ref={ref} className="modal"><div className="modal-heading"><h2>{title}</h2><button className="icon-btn" aria-label="ปิดหน้าต่าง" onClick={onClose}><X size={20}/></button></div>{children}</dialog>}
export function SlideEditor({slide,onSave,onClose}){
  const [value,setValue]=useState({...slide});
  return <Modal title="แก้ไขสไลด์" onClose={onClose}><form onSubmit={e=>{
    e.preventDefault();
    onSave({
      ...value,
      title:value.title.trim(),
      subtitle:value.subtitle.trim(),
      points:(value.points||[]).map(p=>typeof p==='string'?p.trim():'').filter(Boolean)
    });
  }} className="form-stack">
    <label>หัวข้อหลัก<input required maxLength={300} value={value.title} onChange={e=>setValue({...value,title:e.target.value})}/></label>
    <label>ข้อความรอง<input maxLength={1000} value={value.subtitle} onChange={e=>setValue({...value,subtitle:e.target.value})}/></label>
    <label>ประเด็น / หนึ่งบรรทัดต่อหนึ่งข้อ (สูงสุด 20 ข้อ)<textarea rows={5} maxLength={10000} value={(value.points||[]).join('\n')} onChange={e=>setValue({...value,points:e.target.value.split('\n').slice(0,20)})}/></label>
    <div className="form-row"><label>หมวด<input value={value.group} maxLength={100} onChange={e=>setValue({...value,group:e.target.value})}/></label><label>รูปแบบ<select value={value.kind} onChange={e=>setValue({...value,kind:e.target.value})}>{[['concept','แนวคิด'],['cover','ปก'],['activity','ฝึกปฏิบัติ'],['steps','แผนภาพขั้นตอน'],['scale','สเกลประประเมิน'],['scenario','สถานการณ์'],['reflection','สะท้อนคิด'],['voice','น้ำเสียง'],['presence','บุคลิกภาพ'],['break','พัก']].map(([v,t])=><option value={v} key={v}>{t}</option>)}</select></label></div>
    <label>เวลา / คำกำกับ<input value={value.time} maxLength={200} onChange={e=>setValue({...value,time:e.target.value})}/></label>
    <label>บันทึกวิทยากร<textarea rows={3} value={value.notes} maxLength={20000} onChange={e=>setValue({...value,notes:e.target.value})}/></label>
    <button className="btn primary" type="submit"><Check size={18}/> บันทึกสไลด์</button>
  </form></Modal>}
export function Presenter({slides,start,onClose}){
  const [index,setIndex]=useState(start);
  const [isFullscreen,setIsFullscreen]=useState(!!document.fullscreenElement);
  const root=useRef();
  const move=delta=>setIndex(i=>Math.min(slides.length-1,Math.max(0,i+delta)));
  
  useEffect(()=>{
    const onFsChange=()=>setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange',onFsChange);
    const fn=e=>{
      if(e.key==='Escape'){
        if(document.fullscreenElement){
          document.exitFullscreen().catch(()=>{});
        }else{
          onClose();
        }
      }
      if(['ArrowRight',' ','PageDown'].includes(e.key)){e.preventDefault();move(1);}
      if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();move(-1);}
    };
    window.addEventListener('keydown',fn);
    const shell=document.querySelector('.app-shell');
    if(shell)shell.inert=true;
    root.current?.focus();
    return()=>{
      document.removeEventListener('fullscreenchange',onFsChange);
      window.removeEventListener('keydown',fn);
      if(shell)shell.inert=false;
      if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
    };
  },[]);

  const toggleFullscreen=()=>{
    if(document.fullscreenElement){
      document.exitFullscreen().catch(()=>{});
    }else{
      root.current?.requestFullscreen?.().catch(()=>{});
    }
  };

  const close=()=>{
    if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
    onClose();
  };

  return <div className="presenter" role="dialog" aria-label="โหมดนำเสนอสไลด์" aria-modal="true" ref={root} tabIndex={-1}>
    <div className="presenter-bar">
      <span>{index+1} / {slides.length}</span>
      <span>← → เปลี่ยนหน้า · Esc ออก</span>
      <div>
        <button className="icon-btn" aria-label={isFullscreen?"ออกจากเต็มหน้าจอ":"เต็มหน้าจอ"} onClick={toggleFullscreen}>
          {isFullscreen?<Minimize size={20}/>:<Maximize size={20}/>}
        </button>
        <button className="icon-btn" aria-label="ออกจากการนำเสนอ" onClick={close}><X size={22}/></button>
      </div>
    </div>
    <SlideVisual slide={slides[index]}/>
    <div className="presenter-controls">
      <button className="btn" disabled={index===0} onClick={()=>move(-1)}><ChevronLeft/> ก่อนหน้า</button>
      <span>{slides[index].notes||'หนึ่งหน้า หนึ่งประเด็น แล้วชวนผู้เรียนลงมือทำ'}</span>
      <button className="btn" disabled={index===slides.length-1} onClick={()=>move(1)}>ถัดไป <ChevronRight/></button>
    </div>
  </div>;
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
