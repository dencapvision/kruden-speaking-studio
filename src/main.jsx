import {newId} from './id.js';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Mic2,LayoutDashboard,Presentation,Sparkles,FileText,Radio,Library,ArrowUpRight,ArrowRight,Plus,Search,SlidersHorizontal,Play,ExternalLink,Copy,Download,Upload,ChevronRight,ChevronLeft,Pencil,Trash2,Check,Menu,X,MoveUp,MoveDown,Clock,ShieldCheck,BookOpen,CheckCircle2,MoreHorizontal,RefreshCw,Printer,Bookmark,KeyRound,Bot,Loader2} from 'lucide-react';
import {initialState,MODES,GROUPS,agenda,CANVA_URL} from './data.js';
import {makePrompt,makeOutline,modeFor,safeUrl,validateBackup} from './engine.js';
import {loadStoredState,saveStoredState,triggerDownload,exportBackupJson,exportSlidesMarkdown,getAiSettings,saveAiSettings} from './storage.js';
import {SlideVisual,SlideEditor,Presenter,Modal,Rehearsal} from './components.jsx';
import './styles.css';

const nav=[['home',LayoutDashboard,'ภาพรวมสตูดิโอ','Overview'],['slides',Presentation,'สไลด์สอน','Slide studio'],['prompts',Sparkles,'สร้างพรอมป์ต์','Prompt builder'],['script',FileText,'พื้นที่เขียนบท','Script workspace'],['rehearsal',Radio,'ห้องซ้อมพูด','Practice room'],['sources',Library,'แหล่งข้อมูล','Evidence library']];
function App(){
  const [initialResult]=useState(()=>loadStoredState());
  const [data,setData]=useState(initialResult.state);
  const [corruptedWarning,setCorruptedWarning]=useState(initialResult.corrupted?initialResult.error:'');
  const [aiSettings,setAiSettings]=useState(()=>getAiSettings());
  const [settingsModal,setSettingsModal]=useState(false);
  const [aiLoading,setAiLoading]=useState(false);
  const [aiResult,setAiResult]=useState('');
  const [aiTab,setAiTab]=useState('template');
  const [page,setPage]=useState('home'),[mobile,setMobile]=useState(false),[toast,setToast]=useState(''),[storageError,setStorageError]=useState(initialResult.error&&!initialResult.corrupted?initialResult.error:''),[query,setQuery]=useState(''),[group,setGroup]=useState('ทั้งหมด'),[selected,setSelected]=useState(null),[editing,setEditing]=useState(null),[present,setPresent]=useState(null),[sourceModal,setSourceModal]=useState(false),[deleteId,setDeleteId]=useState(null),[prompt,setPrompt]=useState(''),[selectedSources,setSelectedSources]=useState([]);
  const importRef=useRef(),toastTimer=useRef();

  const notify=t=>{setToast(t);clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(''),4000);};

  useEffect(()=>{
    if(corruptedWarning)return;
    const res=saveStoredState(data);
    if(!res.success){
      setStorageError(res.error);
    }else{
      setStorageError('');
    }
  },[data,corruptedWarning]);

  const go=p=>{setPage(p);setMobile(false);setSelected(null);window.scrollTo({top:0,behavior:'instant'});};
  const active=nav.find(n=>n[0]===page),filtered=useMemo(()=>data.slides.filter(s=>(group==='ทั้งหมด'||s.group===group)&&`${s.title} ${s.subtitle} ${s.points.join(' ')}`.toLowerCase().includes(query.toLowerCase())),[data.slides,query,group]);
  const patchForm=(key,value)=>setData(d=>({...d,form:{...d.form,[key]:value}}));
  const copy=async text=>{try{await navigator.clipboard.writeText(text);notify('คัดลอกแล้ว');}catch{notify('คัดลอกไม่ได้ กรุณาเลือกข้อความแล้วคัดลอกด้วยตนเอง');}};
  const saveSlide=s=>{setData(d=>({...d,slides:d.slides.some(x=>x.id===s.id)?d.slides.map(x=>x.id===s.id?s:x):[...d.slides,s]}));setEditing(null);notify('บันทึกสไลด์ในเครื่องแล้ว');};
  const addSlide=()=>{if(data.slides.length>=500){notify('รองรับสูงสุด 500 สไลด์ต่อเครื่อง');return;}setEditing({id:newId(),title:'หัวข้อสไลด์ใหม่',subtitle:'หนึ่งหน้า หนึ่งประเด็น',points:['ประเด็นสำคัญ'],group:'เริ่มต้น',kind:'concept',time:'',notes:''});};
  const moveSlide=(id,delta)=>setData(d=>{const list=[...d.slides],i=list.findIndex(s=>s.id===id),next=i+delta;if(i<0||next<0||next>=list.length)return d;[list[i],list[next]]=[list[next],list[i]];return {...d,slides:list};});
  const exportSlides=()=>exportSlidesMarkdown(data.slides);
  const saveDraft=()=>{if(!data.script.trim()){notify('เพิ่มบทพูดก่อนบันทึก');return;}setData(d=>({...d,drafts:[{id:newId(),title:d.form.topic||'บทพูดของฉัน',text:d.script,mode:d.form.mode,date:new Date().toISOString()},...d.drafts].slice(0,200)}));notify('บันทึกเข้าคลังบทพูดแล้ว');};
  
  const generateAiScript=async()=>{
    const currentSources=data.sources.filter(s=>selectedSources.includes(s.id));
    const promptText=makePrompt(data.form,currentSources);
    setAiLoading(true);
    try{
      const res=await fetch('/api/generate',{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          ...(aiSettings.passcode?{'X-Student-Passcode':aiSettings.passcode}:{})
        },
        body:JSON.stringify({
          prompt:promptText,
          passcode:aiSettings.passcode,
          customApiKey:aiSettings.customApiKey
        })
      });
      const json=await res.json();
      if(!res.ok){
        throw Error(json.error||'ไม่สามารถเรียกใช้ AI ได้');
      }
      setAiResult(json.text);
      setAiTab('ai');
      notify('AI สร้างบทพูดให้เรียบร้อยแล้ว');
    }catch(err){
      notify('ข้อผิดพลาด AI: '+err.message);
      if(err.message.includes('รหัสผ่าน')||err.message.includes('Key')||err.message.includes('ตั้งค่า')){
        setSettingsModal(true);
      }
    }finally{
      setAiLoading(false);
    }
  };

  const importFile=async e=>{
    const file=e.target.files[0];
    e.target.value='';
    if(!file)return;
    try{
      if(file.size>5*1024*1024)throw Error('ไฟล์ต้องมีขนาดไม่เกิน 5 MB');
      let text;
      try{text=await file.text();}catch{throw Error('ไม่สามารถอ่านไฟล์ได้');}
      let parsed;
      try{parsed=JSON.parse(text);}catch{throw Error('ไฟล์ไม่ใช่รูปแบบ JSON ที่ถูกต้อง');}
      const v=validateBackup(parsed);
      if(data.slides.length+v.slides.length>500||data.sources.length+v.sources.length>200||data.drafts.length+v.drafts.length>200){
        throw Error('ข้อมูลรวมเกินขีดจำกัด: สไลด์ 500 แหล่งข้อมูลและบทพูดอย่างละ 200');
      }
      setData(d=>({...d,slides:[...d.slides,...v.slides],sources:[...d.sources,...v.sources],drafts:[...d.drafts,...v.drafts]}));
      notify(`นำเข้า ${v.slides.length} สไลด์ โดยเพิ่มต่อจากข้อมูลเดิมแล้ว`);
    }catch(err){
      notify('นำเข้าไม่สำเร็จ: '+err.message);
    }
  };

  const startPrompt=mode=>{patchForm('mode',mode);go('prompts');};
  return <><a className="skip-link" href="#main">ข้ามไปยังเนื้อหา</a><div className="app-shell"><aside className={`sidebar ${mobile?'open':''}`}><div className="brand"><span className="brand-symbol"><Mic2 size={25}/></span><div><strong>KRUDEN</strong><span>SPEAKING STUDIO</span></div><button className="icon-btn mobile-close" aria-label="ปิดเมนู" onClick={()=>setMobile(false)}><X size={20}/></button></div><div className="workspace-label">YOUR WORKSPACE</div><nav aria-label="เมนูหลัก">{nav.map(([id,Icon,title,en])=><button key={id} onClick={()=>go(id)} className={`nav-item ${page===id?'active':''}`} aria-current={page===id?'page':undefined}><Icon size={20}/><span>{title}<small>{en}</small></span>{page===id&&<i/>}</button>)}</nav><div className="sidebar-bottom"><div className="local-status"><span/>พื้นที่ทำงานส่วนตัว<small>{storageError?'ตรวจสอบการบันทึก':'บันทึกในเบราว์เซอร์เครื่องนี้'}</small></div><button className="backup-btn" onClick={()=>exportBackupJson(data)}><Download size={17}/> ส่งออกไฟล์สำรอง</button><div className="signature"><span className="avatar">KD</span><div><strong>ครูเด่น มาสเตอร์ฟา</strong><small>Human • Heart • Harmony</small></div></div></div></aside>{mobile&&<button className="mobile-scrim" aria-label="ปิดเมนู" onClick={()=>setMobile(false)}/>}
  <div className="main-shell"><header className="topbar"><div className="breadcrumb"><button className="icon-btn mobile-menu" aria-label="เปิดเมนู" onClick={()=>setMobile(true)}><Menu size={22}/></button><span>พื้นที่ทำงาน</span><ChevronRight size={14}/><strong>{active[2]}</strong></div><div className="topbar-right"><button className="btn" style={{padding:'6px 12px',fontSize:'11px'}} onClick={()=>setSettingsModal(true)} title="ตั้งค่ารหัสห้องเรียนหรือ API Key"><KeyRound size={14}/> {aiSettings.passcode||aiSettings.customApiKey?'ตั้งค่า AI (เชื่อมต่อแล้ว)':'เข้าใช้งาน AI / รหัสคลาส'}</button><span className="saved-indicator"><CheckCircle2 size={14}/> {storageError?'รอสำรองข้อมูล':'บันทึกอัตโนมัติ'}</span><a className="text-link" href={CANVA_URL} target="_blank" rel="noreferrer">ต้นฉบับ Canva <ArrowUpRight size={15}/></a></div></header>
  <main id="main" tabIndex={-1}>
    {corruptedWarning&&<div className="warning-banner" role="alert">
      <div><strong>แจ้งเตือนความปลอดภัยของข้อมูล</strong><p>{corruptedWarning}</p></div>
      <div className="warning-actions">
        {initialResult.rawBackup&&<button className="btn" onClick={()=>triggerDownload('kruden-emergency-raw.json',initialResult.rawBackup,'application/json')}><Download size={15}/> บันทึกไฟล์ดิบ</button>}
        <button className="btn primary" onClick={()=>setCorruptedWarning('')}>เข้าใจแล้ว เริ่มทำงานต่อ</button>
      </div>
    </div>}
    {storageError&&<div className="error-banner" role="alert">{storageError}</div>}
  {page==='home'&&<><div className="page-heading"><div><p className="eyebrow">YOUR VOICE, WITH PURPOSE</p><h1>พื้นที่สร้างพลังการสื่อสาร<span className="heading-dot">.</span></h1><p>จัดสไลด์ให้ชัด เตรียมบทให้พร้อม แล้วพาเสียงของคุณไปไกลกว่าเดิม</p></div><button className="btn primary" onClick={()=>go('prompts')}><Plus size={18}/> เริ่มเตรียมการพูด</button></div><section className="hero-workshop"><div className="hero-left"><div className="hero-topline"><span className="tag light">WORKSHOP COLLECTION</span><span>01 / PUBLIC SPEAKING</span></div><h2>พูดอย่างมืออาชีพ<br/><span>สื่อสารอย่างมั่นใจ</span></h2><p>บทเรียนและกิจกรรมฝึกจริง เพื่อทุกเวทีที่คุณอยากสื่อสารให้เข้าใจ</p><div className="hero-meta"><span><Presentation size={17}/>{data.slides.length} สไลด์</span><span><Clock size={17}/>3 ชั่วโมง</span><span><BookOpen size={17}/>5P Framework</span></div><div className="hero-actions"><button className="btn cream" onClick={()=>go('slides')}>เปิดชุดสไลด์สอน <ArrowRight size={18}/></button><button className="hero-present" onClick={()=>setPresent(0)}><Play size={17}/> เริ่มนำเสนอ</button></div></div><div className="hero-poster"><span className="poster-circle c1"/><span className="poster-circle c2"/><Mic2 className="poster-mic" strokeWidth={1}/><span className="poster-word">SPEAK<br/><em>with purpose.</em></span><span className="poster-note">HUMAN • HEART • HARMONY</span></div></section><section className="quick-metrics"><div><span className="metric-icon"><Presentation/></span><div><strong>{data.slides.length}</strong><span>สไลด์ที่พร้อมแก้ไข</span></div></div><div><span className="metric-icon"><Sparkles/></span><div><strong>05</strong><span>รูปแบบการสื่อสาร</span></div></div><div><span className="metric-icon"><FileText/></span><div><strong>{String(data.drafts.length).padStart(2,'0')}</strong><span>บทพูดที่บันทึกไว้</span></div></div><div><span className="metric-icon"><Library/></span><div><strong>{String(data.sources.length).padStart(2,'0')}</strong><span>แหล่งข้อมูลประกอบ</span></div></div></section><div className="section-heading"><div><p className="eyebrow">FROM IDEA TO IMPACT</p><h2>วันนี้ คุณจะสื่อสารบนเวทีไหน?</h2></div><button className="link-button" onClick={()=>go('prompts')}>ดูพรอมป์ต์ทั้งหมด <ArrowRight size={16}/></button></div><div className="mode-list">{MODES.map((m,i)=><button className="mode-entry" key={m.id} onClick={()=>startPrompt(m.id)}><span className="mode-number">0{i+1}</span><div><h3>{m.name}</h3><p>{m.desc}</p></div><ArrowUpRight size={22}/></button>)}</div><div className="home-bottom"><section className="agenda-panel"><div className="section-heading"><h2>เส้นทางเวิร์กช็อป</h2><span className="fine">09.00–12.00 น.</span></div>{agenda.map(([time,label,min])=><div className="agenda-row" key={time}><time>{time}</time><span>{label}</span><small>{min} นาที</small></div>)}</section><section className="principle-panel"><ShieldCheck size={30}/><h2>สื่อสารด้วยความเข้าใจ<br/>และความรับผิดชอบ</h2><p>แยกข้อเท็จจริงออกจากข้อเสนอ อ้างที่มาของข้อมูล และเปิดพื้นที่ให้ความเห็นต่างได้มีเสียง</p><button className="link-button" onClick={()=>go('sources')}>จัดการแหล่งข้อมูล <ArrowRight size={17}/></button><small>ชุดสไลด์จัดเรียงใหม่จาก Canva และเสริมคำถามสะท้อนคิด การแก้ไขในเว็บไม่ซิงก์กลับ Canva</small></section></div></>}
  {page==='slides'&&<><div className="page-heading"><div><p className="eyebrow">SLIDE STUDIO</p><h1>หนึ่งหน้า หนึ่งประเด็น<span className="heading-dot">.</span></h1><p>คลังสไลด์เวิร์กช็อปที่แก้ไข จัดลำดับ และนำเสนอได้</p></div><div className="toolbar"><button className="btn" onClick={exportSlides}><Download size={17}/> Markdown</button><button className="btn primary" onClick={addSlide}><Plus size={18}/> เพิ่มสไลด์</button></div></div><div className="course-strip"><div className="course-strip-icon"><Presentation/></div><div><strong>Public Speaking & Professional MC Skills</strong><span>ครูเด่น มาสเตอร์ฟา · {data.slides.length} สไลด์ · พัก 10.30–10.45 น.</span></div><button className="btn" onClick={()=>window.print()}><Printer size={17}/> พิมพ์ / PDF</button><button className="btn primary" onClick={()=>setPresent(0)}><Play size={16}/> นำเสนอ</button></div><div className="filters"><div className="search-field"><Search size={18}/><input type="search" aria-label="ค้นหาสไลด์" placeholder="ค้นหาหัวข้อหรือคำสำคัญ..." value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="filter-tabs">{[...new Set([...GROUPS,...data.slides.map(s=>s.group)])].map(g=><button aria-pressed={g===group} className={g===group?'active':''} key={g} onClick={()=>setGroup(g)}>{g}</button>)}</div></div><div className="results-heading"><span>{group==='ทั้งหมด'?'สไลด์ทั้งหมด':group} <b>{filtered.length}</b></span><span className="fine">ภาพตัวอย่างเป็นสไลด์ที่สร้างใหม่ในเว็บ</span></div>{!filtered.length?<div className="empty-state"><Search size={32}/><h2>ไม่พบสไลด์ที่ค้นหา</h2><button className="btn" onClick={()=>{setQuery('');setGroup('ทั้งหมด');}}>แสดงทั้งหมด</button></div>:<div className="slide-grid">{filtered.map(s=>{const idx=data.slides.findIndex(x=>x.id===s.id);return <article className="slide-card" key={s.id}><button className="slide-preview" aria-label={`ดูสไลด์ ${s.title}`} onClick={()=>setSelected(s)}><SlideVisual slide={s} small/><span className="preview-overlay"><Play size={22}/> ดูสไลด์</span></button><div className="slide-card-body"><div className="slide-card-title"><span>{String(idx+1).padStart(2,'0')}</span><h2>{s.title}</h2></div><div className="row-between"><span className={`kind-tag ${s.kind==='activity'?'practice':''}`}>{s.kind==='activity'?'ฝึกปฏิบัติ':s.kind==='scenario'?'สถานการณ์':s.group}</span><div className="slide-tools"><button className="icon-btn" aria-label={`แก้ไข ${s.title}`} onClick={()=>setEditing(s)}><Pencil size={16}/></button><button className="icon-btn" aria-label={`เลื่อน ${s.title} ขึ้น`} disabled={idx===0} onClick={()=>moveSlide(s.id,-1)}><MoveUp size={16}/></button><button className="icon-btn" aria-label={`เลื่อน ${s.title} ลง`} disabled={idx===data.slides.length-1} onClick={()=>moveSlide(s.id,1)}><MoveDown size={16}/></button><button className="icon-btn danger" aria-label={`ลบ ${s.title}`} disabled={data.slides.length===1} onClick={()=>setDeleteId(s.id)}><Trash2 size={16}/></button></div></div></div></article>})}</div>}</>}
  {page==='prompts'&&<><div className="page-heading"><div><p className="eyebrow">PROMPT BUILDER</p><h1>วางประเด็นให้ชัด ก่อนเริ่มพูด<span className="heading-dot">.</span></h1><p>สร้างพรอมป์ต์หรือให้ DeepSeek AI ช่วยร่างบทพูดตามแนวทาง Human • Heart • Harmony</p></div><span className="outline-badge"><ShieldCheck size={16}/> สื่อสารสาธารณะอย่างสร้างสรรค์</span></div><div className="mode-switch">{MODES.map(m=><button key={m.id} aria-pressed={data.form.mode===m.id} className={data.form.mode===m.id?'active':''} onClick={()=>{patchForm('mode',m.id);setPrompt('');setAiResult('');}}>{m.short}</button>)}</div><div className="builder-grid"><section className="panel builder-form"><div className="panel-heading"><span className="step-no">01</span><div><h2>{modeFor(data.form.mode).name}</h2><p>{modeFor(data.form.mode).desc}</p></div></div><div className="form-stack"><label>หัวข้อการสื่อสาร<input maxLength={300} value={data.form.topic} onChange={e=>patchForm('topic',e.target.value)} placeholder="เช่น แนวทางพัฒนาระบบขนส่งสาธารณะ"/></label><div className="form-row"><label>เวลาพูด (นาที)<input type="number" min={1} max={60} value={data.form.duration} onChange={e=>patchForm('duration',Math.min(60,Math.max(1,+e.target.value||1)))}/></label><label>น้ำเสียง<select value={data.form.tone} onChange={e=>patchForm('tone',e.target.value)}>{['อบอุ่น ชัดเจน ให้เกียรติผู้ฟัง','เป็นทางการ กระชับ ตรงประเด็น','อธิบายง่าย พร้อมรับฟังความเห็นต่าง'].map(t=><option key={t}>{t}</option>)}</select></label></div><label>บริบทของเวที<input maxLength={1000} value={data.form.context} onChange={e=>patchForm('context',e.target.value)}/><small>ระบุประเภทเวทีและความรู้พื้นฐาน โดยไม่ใช้ข้อมูลส่วนบุคคลเพื่อเจาะกลุ่มทางการเมือง</small></label><label>สารสำคัญที่อยากให้เข้าใจ<textarea rows={2} maxLength={3000} value={data.form.keyMessage} onChange={e=>patchForm('keyMessage',e.target.value)}/></label>{data.form.mode==='media'&&<label>คำถามจากสื่อ<textarea rows={2} value={data.form.question} maxLength={3000} onChange={e=>patchForm('question',e.target.value)}/></label>}<label>ข้อเท็จจริงและข้อมูลประกอบ<textarea rows={4} maxLength={15000} value={data.form.facts} onChange={e=>patchForm('facts',e.target.value)} placeholder="วางข้อมูลพร้อมที่มา วันที่ และข้อจำกัดของข้อมูล..."/><small>ระบบยังไม่ได้ตรวจสอบข้อเท็จจริงภายนอกให้</small></label><label>ข้อจำกัด / เรื่องที่ต้องตรวจสอบ<textarea rows={2} maxLength={3000} value={data.form.limits} onChange={e=>patchForm('limits',e.target.value)}/></label><fieldset><legend>เลือกแหล่งข้อมูลแนบพรอมป์ต์</legend>{data.sources.length?data.sources.map(s=><label className="checkbox-label" key={s.id}><input type="checkbox" checked={selectedSources.includes(s.id)} onChange={e=>setSelectedSources(e.target.checked?[...selectedSources,s.id]:selectedSources.filter(id=>id!==s.id))}/><span>{s.title}</span></label>):<p className="fine">ยังไม่มีแหล่งข้อมูล เพิ่มได้ที่เมนูแหล่งข้อมูล</p>}</fieldset>
  <button className="btn ai-btn full" disabled={aiLoading} onClick={generateAiScript}>
    {aiLoading?<Loader2 className="spin" size={18}/>:<Sparkles size={18}/>}
    {aiLoading?'กำลังประมวลผลบทพูดด้วย DeepSeek AI...':'✨ ให้ AI ช่วยร่างบทพูด (DeepSeek)'}
  </button>
  <button className="btn full" onClick={()=>{setPrompt(makePrompt(data.form,data.sources.filter(s=>selectedSources.includes(s.id))));setAiTab('template');notify('สร้างแม่แบบพรอมป์ต์จากข้อมูลของคุณแล้ว');}}>
    <Copy size={17}/> สร้างแม่แบบพรอมป์ต์สำหรับนำไปใช้เอง
  </button></div></section>
  <section className="panel prompt-result">
    <div className="panel-heading"><span className="step-no">02</span><div><h2>ผลลัพธ์บทพูดและการเตรียมตัว</h2><p>เลือกดูแม่แบบพรอมป์ต์ หรือบทพูดที่ AI ช่วยร่าง</p></div></div>
    <div className="ai-tabs">
      <button className={aiTab==='ai'?'active':''} onClick={()=>setAiTab('ai')}>บทที่ AI ร่าง {aiResult?'✨':''}</button>
      <button className={aiTab==='template'?'active':''} onClick={()=>setAiTab('template')}>แม่แบบพรอมป์ต์</button>
    </div>
    {aiTab==='ai'?(aiResult?<><div className="ai-notice"><ShieldCheck size={16}/><span><strong>เนื้อหาที่ AI ช่วยร่าง:</strong> ตรวจทานข้อมูลและตัวเลขก่อนขึ้นเวทีจริง</span></div>
    <div className="toolbar result-actions">
      <button className="btn primary" onClick={()=>{setData(d=>({...d,script:aiResult}));go('script');notify('ส่งบทพูดเข้าพื้นที่เขียนบทแล้ว');}}><Play size={16}/> ส่งไปยังพื้นที่เขียนบท</button>
      <button className="btn" onClick={()=>copy(aiResult)}><Copy size={16}/> คัดลอก</button>
      <button className="btn" onClick={()=>triggerDownload('speaking-draft-ai.md',aiResult)}><Download size={16}/> บันทึก MD</button>
    </div>
    <textarea className="prompt-output" aria-label="บทพูดที่ AI ร่าง" value={aiResult} onChange={e=>setAiResult(e.target.value)}/>
    </>:<div className="prompt-empty"><span><Bot size={36}/></span><h3>ยังไม่มีบทพูดจาก AI</h3><p>กรอกข้อมูลหัวข้อและประเด็นทางซ้ายมือ<br/>แล้วกด <strong>“✨ ให้ AI ช่วยร่างบทพูด (DeepSeek)”</strong></p><p className="fine">ระบบจะประมวลผลผ่าน Cloudflare Pages Functions อย่างปลอดภัย</p></div>):
    (prompt?<><div className="toolbar result-actions"><button className="btn primary" onClick={()=>copy(prompt)}><Copy size={16}/> คัดลอก</button><button className="btn" onClick={()=>triggerDownload('speaking-prompt.txt',prompt)}><Download size={16}/> TXT</button></div><textarea className="prompt-output" aria-label="พรอมป์ต์ที่สร้าง" value={prompt} onChange={e=>setPrompt(e.target.value)}/><p className="fine">สร้างด้วยแม่แบบในเว็บ ยังไม่ได้ส่งข้อมูลออกไป</p></>:<div className="prompt-empty"><span><Sparkles size={36}/></span><h3>ความคิดของคุณ เริ่มตรงนี้</h3><p>เติมหัวข้อ สารสำคัญ และข้อมูลอ้างอิง<br/>แล้วกดสร้างแม่แบบพรอมป์ต์</p><ol>{modeFor(data.form.mode).structure.map(v=><li key={v}>{v}</li>)}</ol></div>)}
    <div className="outline-action"><div><h3>อยากเริ่มเขียนเอง?</h3><p>ใช้โครงเติมข้อมูลตามรูปแบบที่เลือก</p></div><button className="btn" onClick={()=>{if(data.script.trim()&&!window.confirm('ใช้โครงใหม่แทนข้อความปัจจุบัน? บันทึกบทเดิมไว้ก่อนหากต้องการเก็บ'))return;setData(d=>({...d,script:makeOutline(d.form)}));go('script');}}>เปิดโครงบทพูด <ArrowRight size={16}/></button></div></section></div></>}
  {page==='script'&&<><div className="page-heading"><div><p className="eyebrow">SCRIPT WORKSPACE</p><h1>เปลี่ยนประเด็น เป็นบทพูดของคุณ<span className="heading-dot">.</span></h1><p>เขียนเอง หรือวางคำตอบจาก AI แล้วตรวจทานก่อนขึ้นเวที</p></div><div className="toolbar"><button className="btn" onClick={saveDraft}><Bookmark size={17}/> เก็บเข้าคลัง</button><button className="btn primary" onClick={()=>go('rehearsal')}><Play size={17}/> ซ้อมบทนี้</button></div></div><div className="script-grid"><section className="panel script-panel"><div className="script-toolbar"><label>ชื่อบทพูด<input aria-label="ชื่อบทพูด" maxLength={300} value={data.form.topic} onChange={e=>patchForm('topic',e.target.value)}/></label><span>{data.script.length.toLocaleString()} ตัวอักษร</span></div><textarea className="script-editor" maxLength={100000} value={data.script} onChange={e=>setData(d=>({...d,script:e.target.value}))} placeholder="เริ่มเขียนบทพูดของคุณที่นี่...\n\nใช้ / เพื่อกำหนดจุดเว้นวรรค และขึ้นบรรทัดเมื่อเปลี่ยนประเด็น" aria-label="บทพูด"/><div className="toolbar script-footer"><button className="btn" onClick={()=>copy(data.script)} disabled={!data.script}><Copy size={16}/> คัดลอก</button><button className="btn" disabled={!data.script} onClick={()=>triggerDownload('speaking-script.md',data.script)}><Download size={16}/> ส่งออกบท</button><span className="fine">ปรับแก้และบันทึกอัตโนมัติในเครื่องนี้</span></div></section><aside className="script-side"><section className="panel"><h2>ก่อนขึ้นเวที</h2><p>ตรวจด้วยตัวเองทีละข้อ</p>{['ข้อมูลและตัวเลขมีที่มา','แยกข้อเท็จจริงกับข้อเสนอ','ตอบประเด็นอย่างตรงไปตรงมา','ระบุข้อจำกัดที่ยังไม่ยืนยัน','ไม่กล่าวหาหรือโจมตีตัวบุคคล','ลองพูดและจับเวลาจริงแล้ว'].map((t,i)=><label className="check-row" key={t}><input type="checkbox" checked={!!data.checks[i]} onChange={e=>setData(d=>({...d,checks:{...d.checks,[i]:e.target.checked}}))}/><span>{t}</span></label>)}<button className="link-button" onClick={()=>go('sources')}>เปิดคลังแหล่งข้อมูล <ArrowRight size={16}/></button></section><section className="panel saved-drafts"><h2>คลังบทพูด <span className="count">{data.drafts.length}</span></h2>{data.drafts.length?data.drafts.map(d=><article key={d.id}><button onClick={()=>{if(data.script.trim()&&!window.confirm('เปิดบทที่เลือกแทนข้อความปัจจุบัน?'))return;setData(x=>({...x,script:d.text,form:{...x.form,topic:d.title,mode:d.mode}}));notify('เปิดบทที่เลือกแล้ว');}}><strong>{d.title}</strong><small>{modeFor(d.mode).short} · {d.date?new Date(d.date).toLocaleDateString('th-TH'):''}</small></button><button className="icon-btn danger" aria-label={`ลบบท ${d.title}`} onClick={()=>{if(window.confirm('ลบบทที่บันทึกนี้?'))setData(x=>({...x,drafts:x.drafts.filter(y=>y.id!==d.id)}));}}><Trash2 size={15}/></button></article>):<p className="empty-caption">ยังไม่มีบทพูดที่เก็บไว้<br/>กด “เก็บเข้าคลัง” เพื่อสร้างสำเนา</p>}</section></aside></div></>}
  {page==='rehearsal'&&<><div className="page-heading"><div><p className="eyebrow">PRACTICE ROOM</p><h1>ฝึกให้เป็นธรรมชาติ ในจังหวะของคุณ<span className="heading-dot">.</span></h1><p>เลื่อนบทอัตโนมัติ จับเวลา และสะท้อนผลจากการฝึกจริง</p></div><button className="btn" onClick={()=>go('script')}><Pencil size={17}/> แก้ไขบทพูด</button></div><Rehearsal script={data.script} notify={notify}/></>}
  {page==='sources'&&<><div className="page-heading"><div><p className="eyebrow">EVIDENCE LIBRARY</p><h1>ทุกประเด็น มีที่มาให้กลับไปดู<span className="heading-dot">.</span></h1><p>เก็บลิงก์ บันทึกข้อจำกัด และสถานะการตรวจสอบโดยคุณ</p></div><button className="btn primary" onClick={()=>{if(data.sources.length>=200){notify('รองรับแหล่งข้อมูลสูงสุด 200 รายการ');return;}setSourceModal(true);}}><Plus size={18}/> เพิ่มแหล่งข้อมูล</button></div><div className="source-note"><ShieldCheck size={23}/><p>สถานะ “ผู้ใช้ตรวจแล้ว” เป็นการระบุโดยคุณ ระบบไม่ได้ตรวจความถูกต้องของเว็บไซต์หรือข้อกล่าวอ้างโดยอัตโนมัติ</p></div><div className="source-list">{data.sources.length?data.sources.map(s=><article className="source-row" key={s.id}><span className="source-symbol"><BookOpen size={24}/></span><div className="source-info"><h2>{s.title}</h2><a href={safeUrl(s.url)||undefined} target="_blank" rel="noreferrer">{s.url}<ExternalLink size={13}/></a><p>{s.note}</p></div><div className="source-options"><label>สถานะ<select value={s.status} onChange={e=>setData(d=>({...d,sources:d.sources.map(x=>x.id===s.id?{...x,status:e.target.value}:x)}))}><option value="provided">ยังไม่ยืนยันภายนอก</option><option value="checked">ผู้ใช้ตรวจแล้ว</option></select></label><button className="icon-btn danger" aria-label={`ลบแหล่งข้อมูล ${s.title}`} onClick={()=>{if(window.confirm('ลบแหล่งข้อมูลนี้?'))setData(d=>({...d,sources:d.sources.filter(x=>x.id!==s.id)}));}}><Trash2 size={18}/></button></div></article>):<div className="empty-state"><Library size={32}/><h2>เริ่มจากแหล่งข้อมูลแรกของคุณ</h2><p>เพิ่มเอกสารหรือลิงก์ที่ใช้อ้างอิงในการพูด</p></div>}</div><section className="panel backup-panel"><div><h2>ย้ายงานไปทำต่อได้ทุกเครื่อง</h2><p>ส่งออกไฟล์ JSON เก็บสไลด์ บทพูด และแหล่งข้อมูลทั้งหมด การนำเข้าจะเพิ่มรายการต่อจากข้อมูลเดิม</p></div><div className="toolbar"><button className="btn" onClick={()=>importRef.current.click()}><Upload size={17}/> นำเข้า JSON</button><button className="btn primary" onClick={()=>exportBackupJson(data)}><Download size={17}/> ส่งออกไฟล์สำรอง</button></div></section></>}
  </main><footer className="app-footer"><span>KRUDEN SPEAKING STUDIO</span><span>ออกแบบความเข้าใจ ผ่านพลังการสื่อสาร</span></footer></div></div><input type="file" accept="application/json,.json" ref={importRef} hidden onChange={importFile}/>{toast&&<div className="toast" role="status"><CheckCircle2 size={18}/>{toast}</div>}{editing&&<SlideEditor key={editing.id} slide={editing} onSave={saveSlide} onClose={()=>setEditing(null)}/>}{selected&&<Modal title={`สไลด์ ${data.slides.findIndex(s=>s.id===selected.id)+1}`} onClose={()=>setSelected(null)}><div className="detail-slide"><SlideVisual slide={selected}/></div><p className="speaker-note">บันทึกวิทยากร: {selected.notes||'ยังไม่มีบันทึก'}</p><div className="toolbar"><button className="btn" onClick={()=>{setSelected(null);setEditing(selected);}}><Pencil size={16}/> แก้ไข</button><button className="btn primary" onClick={()=>{setPresent(data.slides.findIndex(s=>s.id===selected.id));setSelected(null);}}><Play size={16}/> นำเสนอจากหน้านี้</button></div></Modal>}{deleteId&&(()=>{const targetSlide=data.slides.find(s=>s.id===deleteId);return <Modal title="ยืนยันการลบสไลด์" onClose={()=>setDeleteId(null)}><p>คุณต้องการลบสไลด์ <strong>"{targetSlide?.title||'ไม่มีชื่อ'}"</strong> ออกจากชุดในเครื่องนี้หรือไม่?</p><p className="fine" style={{marginTop:'8px'}}>การลบจะมีผลกับเครื่องนี้ หากต้องการเก็บสำรองไว้ กรุณาส่งออกไฟล์สำรองก่อน</p><div className="toolbar" style={{marginTop:'20px'}}><button className="btn" onClick={()=>setDeleteId(null)}>ยกเลิก</button><button className="btn danger-btn" onClick={()=>{setData(d=>({...d,slides:d.slides.filter(s=>s.id!==deleteId)}));setDeleteId(null);notify('ลบสไลด์แล้ว');}}>ลบสไลด์</button></div></Modal>;})()}{sourceModal&&<SourceForm onClose={()=>setSourceModal(false)} onSave={s=>{setData(d=>({...d,sources:[...d.sources,s]}));setSourceModal(false);notify('เพิ่มแหล่งข้อมูลแล้ว');}}/>}{settingsModal&&<SettingsModal settings={aiSettings} onClose={()=>setSettingsModal(false)} onSave={s=>{saveAiSettings(s);setAiSettings(s);setSettingsModal(false);notify('บันทึกการตั้งค่า AI เรียบร้อยแล้ว');}}/>}{present!==null&&<Presenter slides={data.slides} start={present} onClose={()=>setPresent(null)}/>}<div className="print-deck">{data.slides.map(s=><section key={s.id}><SlideVisual slide={s}/></section>)}</div></>}
function SettingsModal({settings,onSave,onClose}){
  const [passcode,setPasscode]=useState(settings.passcode||'');
  const [customApiKey,setCustomApiKey]=useState(settings.customApiKey||'');
  return <Modal title="ตั้งค่าการเชื่อมต่อ AI & สิทธิ์ผู้เรียน" onClose={onClose}>
    <form className="form-stack" onSubmit={e=>{e.preventDefault();onSave({passcode:passcode.trim(),customApiKey:customApiKey.trim()});}}>
      <div style={{background:'#edf3e7',padding:'14px 16px',borderRadius:'8px',fontSize:'12px',lineHeight:'1.6',color:'#274d3b'}}>
        <strong>🌟 เข้าใช้งาน AI อย่างไร?</strong>
        <p style={{margin:'4px 0 0'}}>
          ผู้เรียนสามารถกรอก <strong>รหัสผ่านห้องเรียน</strong> ที่ครูเด่นมอบให้ในคลาส หรือระบุ <strong>DeepSeek API Key</strong> ส่วนตัวของคุณ (ระบบจะเก็บการตั้งค่าไว้เฉพาะในเครื่องนี้เท่านั้น ไม่มีการเปิดเผยสู่สาธารณะ)
        </p>
      </div>
      <label>
        รหัสผ่านห้องเรียน (Student Passcode)
        <input type="text" maxLength={100} value={passcode} onChange={e=>setPasscode(e.target.value)} placeholder="เช่น รหัสผ่านที่ได้รับจากครูเด่น"/>
        <small>กรอกรหัสผ่านเพื่อใช้งานโควตา DeepSeek AI ของเวิร์กช็อป</small>
      </label>
      <div style={{textAlign:'center',color:'var(--muted)',fontSize:'11px',margin:'5px 0'}}>— หรือ —</div>
      <label>
        DeepSeek API Key ส่วนตัว (BYOK - ทางเลือกเสริม)
        <input type="password" maxLength={200} value={customApiKey} onChange={e=>setCustomApiKey(e.target.value)} placeholder="sk-..."/>
        <small>สำหรับผู้เรียนที่มี API Key ของตนเองจาก deepseek.com (ระบบจะส่งตรงผ่าน Serverless ไม่เก็บบนเซิร์ฟเวอร์)</small>
      </label>
      <div className="toolbar" style={{marginTop:'12px'}}>
        <button className="btn" type="button" onClick={onClose}>ยกเลิก</button>
        <button className="btn primary" type="submit"><Check size={16}/> บันทึกการตั้งค่า</button>
      </div>
    </form>
  </Modal>;
}
function SourceForm({onSave,onClose}){const [title,setTitle]=useState(''),[url,setUrl]=useState(''),[note,setNote]=useState(''),[error,setError]=useState('');return <Modal title="เพิ่มแหล่งข้อมูล" onClose={onClose}><form className="form-stack" onSubmit={e=>{e.preventDefault();if(!safeUrl(url)){setError('ใช้ลิงก์ https:// หรือ http:// เท่านั้น');return;}onSave({id:newId(),title,url:safeUrl(url),note,status:'provided'});}}><label>ชื่อเอกสารหรือเว็บไซต์<input required maxLength={300} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>ลิงก์<input required type="url" maxLength={2000} value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://..."/></label><label>บันทึก / วันที่ / ข้อจำกัด<textarea rows={4} maxLength={20000} value={note} onChange={e=>setNote(e.target.value)}/></label>{error&&<p role="alert">{error}</p>}<button className="btn primary" type="submit">เพิ่มแหล่งข้อมูล</button></form></Modal>}
createRoot(document.getElementById('root')).render(<App/>);
