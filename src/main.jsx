import {newId} from './id.js';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {
  Mic2,LayoutDashboard,Sparkles,FileText,Radio,Library,
  ArrowUpRight,ArrowRight,Plus,Search,Play,ExternalLink,
  Copy,Download,Upload,ChevronRight,ChevronLeft,Pencil,
  Trash2,Check,Menu,X,MoveUp,MoveDown,Clock,ShieldCheck,
  BookOpen,CheckCircle2,RotateCcw,Printer,Bookmark,KeyRound,
  Bot,Loader2,ListOrdered,Calendar
} from 'lucide-react';
import {initialState,initialSequences,MODES,agenda,CANVA_URL} from './data.js';
import {makePrompt,makeOutline,modeFor,safeUrl,validateBackup,cleanScriptOutput} from './engine.js';
import {
  loadStoredState,saveStoredState,triggerDownload,
  exportBackupJson,exportSequenceMarkdown,getAiSettings,saveAiSettings,
  getClassroomSession,saveClassroomSession,clearClassroomSession,
  getAdminClasses,saveAdminClasses
} from './storage.js';
import {Modal,SequenceItemEditor,Rehearsal} from './components.jsx';
import './styles.css';

const nav=[
  ['home',LayoutDashboard,'ภาพรวมสตูดิโอ','Overview'],
  ['prompts',Sparkles,'Script Lab & 5Ps','Script Lab'],
  ['sequence',ListOrdered,'ซีเคว้นพิธีกร','MC Run of Show'],
  ['script',FileText,'พื้นที่เขียนบท','Script workspace'],
  ['rehearsal',Radio,'ห้องซ้อมพูด','Practice room'],
  ['sources',Library,'แหล่งข้อมูล','Evidence library']
];

function App(){
  const [initialResult]=useState(()=>loadStoredState());
  const [data,setData]=useState(initialResult.state);
  const [corruptedWarning,setCorruptedWarning]=useState(initialResult.corrupted?initialResult.error:'');
  const [aiSettings,setAiSettings]=useState(()=>getAiSettings());
  const [classroomSession,setClassroomSession]=useState(()=>getClassroomSession());
  const [classroomModal,setClassroomModal]=useState(false);
  const [adminModal,setAdminModal]=useState(false);
  const [adminClasses,setAdminClasses]=useState(()=>getAdminClasses());
  const [adminUnlocked,setAdminUnlocked]=useState(classroomSession.role==='admin');
  const [settingsModal,setSettingsModal]=useState(false);
  const [aiLoading,setAiLoading]=useState(false);
  const [aiResult,setAiResult]=useState('');
  const [aiTab,setAiTab]=useState('template');
  const [aiAction,setAiAction]=useState('');
  const [aiAssistantResult,setAiAssistantResult]=useState(null);
  
  const [page,setPage]=useState('home');
  const [mobile,setMobile]=useState(false);
  const [toast,setToast]=useState('');
  const [storageError,setStorageError]=useState(initialResult.error&&!initialResult.corrupted?initialResult.error:'');
  
  const [activeSeqStage,setActiveSeqStage]=useState('formal');
  const [editingItem,setEditingItem]=useState(null); // { item, seqId }
  const [deleteItem,setDeleteItem]=useState(null); // { seqId, itemId, segment }
  
  const [sourceModal,setSourceModal]=useState(false);
  const [prompt,setPrompt]=useState('');
  const [selectedSources,setSelectedSources]=useState([]);
  
  const importRef=useRef(),toastTimer=useRef();

  const notify=t=>{
    setToast(t);
    clearTimeout(toastTimer.current);
    toastTimer.current=setTimeout(()=>setToast(''),4000);
  };

  // One-click login via URL parameter ?code=...
  useEffect(()=>{
    try{
      const params=new URLSearchParams(window.location.search);
      const codeParam=params.get('code');
      const classParam=params.get('class');
      if(codeParam){
        const matchedClass=adminClasses.find(c=>c.code.toLowerCase()===codeParam.trim().toLowerCase());
        const newSession={
          entered:true,
          studentName:params.get('name')||classroomSession.studentName||'ผู้เรียน',
          passcode:codeParam.trim(),
          className:classParam?decodeURIComponent(classParam):(matchedClass?matchedClass.name:'Public Speaking & MC Skills'),
          role:'student'
        };
        saveClassroomSession(newSession);
        setClassroomSession(newSession);
        notify(`เข้าสู่ห้องเรียนอัตโนมัติ: ${newSession.className} (${newSession.passcode})`);
      }
    }catch{}
  },[]);

  useEffect(()=>{
    if(corruptedWarning)return;
    const res=saveStoredState(data);
    if(!res.success){
      setStorageError(res.error);
    }else{
      setStorageError('');
    }
  },[data,corruptedWarning]);

  const go=p=>{setPage(p);setMobile(false);window.scrollTo({top:0,behavior:'instant'});};
  const active=nav.find(n=>n[0]===page)||nav[0];
  const patchForm=(key,value)=>setData(d=>({...d,form:{...d.form,[key]:value}}));
  const copy=async text=>{
    try{await navigator.clipboard.writeText(text);notify('คัดลอกแล้ว');}
    catch{notify('คัดลอกไม่ได้ กรุณาเลือกข้อความแล้วคัดลอกด้วยตนเอง');}
  };

  const saveDraft=()=>{
    if(!data.script.trim()){notify('เพิ่มบทพูดก่อนบันทึก');return;}
    setData(d=>({...d,drafts:[{id:newId(),title:d.form.topic||'บทพูดของฉัน',text:d.script,mode:d.form.mode,date:new Date().toISOString()},...d.drafts].slice(0,200)}));
    notify('บันทึกเข้าคลังบทพูดแล้ว');
  };

  // Sequence handlers
  const currentSeq = useMemo(()=>{
    return data.sequences.find(s=>s.stage===activeSeqStage)||data.sequences[0]||initialSequences[0];
  },[data.sequences,activeSeqStage]);

  const totalSeqMinutes = useMemo(()=>{
    return (currentSeq.items||[]).reduce((sum,it)=>sum+(Number(it.duration)||0),0);
  },[currentSeq]);

  const totalAllItems = useMemo(()=>{
    return (data.sequences||[]).reduce((sum,s)=>sum+(s.items?.length||0),0);
  },[data.sequences]);

  const saveSequenceItem=(seqId,item)=>{
    setData(d=>({
      ...d,
      sequences: d.sequences.map(s=>{
        if(s.id!==seqId)return s;
        const exists = s.items.some(x=>x.id===item.id);
        const newItems = exists 
          ? s.items.map(x=>x.id===item.id?item:x)
          : [...s.items,{...item,id:item.id||newId()}];
        return {...s,items:newItems};
      })
    }));
    setEditingItem(null);
    notify('บันทึกคิวรายการในซีเคว้นแล้ว');
  };

  const moveSequenceItem=(seqId,itemId,delta)=>{
    setData(d=>({
      ...d,
      sequences: d.sequences.map(s=>{
        if(s.id!==seqId)return s;
        const list=[...s.items];
        const idx=list.findIndex(x=>x.id===itemId);
        const next=idx+delta;
        if(idx<0||next<0||next>=list.length)return s;
        [list[idx],list[next]]=[list[next],list[idx]];
        return {...s,items:list};
      })
    }));
  };

  const removeSequenceItem=(seqId,itemId)=>{
    setData(d=>({
      ...d,
      sequences: d.sequences.map(s=>{
        if(s.id!==seqId)return s;
        return {...s,items:s.items.filter(x=>x.id!==itemId)};
      })
    }));
    setDeleteItem(null);
    notify('ลบคิวรายการแล้ว');
  };

  const resetCurrentSequence=()=>{
    const preset = initialSequences.find(s=>s.stage===activeSeqStage);
    if(!preset)return;
    if(!window.confirm(`คืนค่าซีเคว้น "${preset.title}" เป็นแม่แบบเริ่มต้น?`))return;
    setData(d=>({
      ...d,
      sequences: d.sequences.map(s=>s.stage===activeSeqStage?JSON.parse(JSON.stringify(preset)):s)
    }));
    notify('คืนค่าซีเคว้นเวทีนี้เรียบร้อยแล้ว');
  };

  // AI Generation
  const generateAiScript=async()=>{
    const activePasscode = classroomSession.entered ? classroomSession.passcode : (aiSettings.passcode || '');
    if(!activePasscode && !aiSettings.customApiKey){
      setClassroomModal(true);
      notify('กรุณากรอกรหัสห้องเรียนที่ได้รับจากครูเด่นเพื่อเริ่มใช้งาน AI');
      return;
    }
    const currentSources=data.sources.filter(s=>selectedSources.includes(s.id));
    const promptText=makePrompt(data.form,currentSources);
    setAiLoading(true);
    try{
      const res=await fetch('/api/generate',{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          ...(activePasscode?{'X-Student-Passcode':activePasscode}:{})
        },
        body:JSON.stringify({
          prompt:promptText,
          passcode:activePasscode,
          customApiKey:aiSettings.customApiKey
        })
      });
      const json=await res.json();
      if(!res.ok){
        throw Error(json.error||'ไม่สามารถเรียกใช้ AI ได้');
      }
      setAiResult(cleanScriptOutput(json.text));
      setAiTab('ai');
      notify('AI สร้างบทพูดให้เรียบร้อยแล้ว');
    }catch(err){
      notify('ข้อผิดพลาด AI: '+err.message);
      if(err.message.includes('รหัสผ่าน')||err.message.includes('Key')||err.message.includes('ห้องเรียน')){
        setClassroomModal(true);
      }
    }finally{
      setAiLoading(false);
    }
  };

  const callAiAssistant=async(action)=>{
    if(!data.script.trim()){
      notify('กรุณากรอกหรือวางบทพูดที่ต้องการให้ AI ช่วยเกลาในพื้นที่เขียนบทก่อน');
      return;
    }
    const activePasscode = classroomSession.entered ? classroomSession.passcode : (aiSettings.passcode || '');
    if(!activePasscode && !aiSettings.customApiKey){
      setClassroomModal(true);
      notify('กรุณากรอกรหัสห้องเรียนที่ได้รับจากครูเด่นเพื่อเริ่มใช้งาน AI');
      return;
    }
    setAiLoading(true);
    setAiAction(action);
    try{
      const res=await fetch('/api/generate',{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          ...(activePasscode?{'X-Student-Passcode':activePasscode}:{})
        },
        body:JSON.stringify({
          prompt:`หัวข้อ: ${data.form.topic||'ไม่ระบุ'}\nรูปแบบเวที: ${modeFor(data.form.mode).name}\n\nเนื้อหาบทพูด:\n${data.script}`,
          action,
          passcode:activePasscode,
          customApiKey:aiSettings.customApiKey
        })
      });
      const json=await res.json();
      if(!res.ok){
        throw Error(json.error||'ไม่สามารถเรียกใช้ AI ได้');
      }
      setAiAssistantResult({text:cleanScriptOutput(json.text),action});
      notify('AI ประมวลผลและเกลาคำพูดให้เรียบร้อยแล้ว');
    }catch(err){
      notify('ข้อผิดพลาด AI: '+err.message);
      if(err.message.includes('รหัสผ่าน')||err.message.includes('Key')||err.message.includes('ห้องเรียน')){
        setClassroomModal(true);
      }
    }finally{
      setAiLoading(false);
      setAiAction('');
    }
  };

  const fillPresetScenario=()=>{
    const m=data.form.mode;
    if(m==='formal'||m==='speech'){
      setData(d=>({...d,form:{...d.form,mode:'formal',topic:'พิธีเปิดเวิร์กช็อป Public Speaking & Professional MC Skills',keyMessage:'ยินดีต้อนรับผู้เข้าร่วมทุกท่าน และร่วมสร้างพื้นที่ปลอดภัยเพื่อปลดล็อกพลังการสื่อสาร',duration:3,tone:'อบอุ่น ชัดเจน ให้เกียรติผู้ฟัง',purpose:'กล่าวต้อนรับแขกผู้มีเกียรติและเปิดเวิร์กช็อปอย่างเป็นทางการและน่าเชื่อถือ',product:'ผู้เข้าร่วมทุกคนเข้าใจเป้าหมาย 3 ชั่วโมงและพร้อมลงมือฝึกจริง',participants:'ผู้เรียน 20 ท่านจากหลากหลายสายอาชีพที่ตั้งใจพัฒนาการพูด',problems:'ผู้เรียนอาจตื่นเต้นหรือประหม่า เริ่มด้วยรอยยิ้ม สบตา และน้ำเสียงอบอุ่น',planTopics:'1. กล่าวทักทายและต้อนรับแขกผู้มีเกียรติ\n2. ความสำคัญของทักษะการพูด (5P)\n3. กำหนดการและกิจกรรมตลอด 3 ชม.',planExamples:'1. ยินดีต้อนรับสู่ KRUDEN Speaking Studio\n2. การพูดคือทักษะที่ฝึกได้ ไม่ใช่พรสวรรค์\n3. 09.00-12.00 น. ลงมือฝึกจริงทุกช่วง'}}));
      notify('โหลดตัวอย่างสถานการณ์: เวทีพิธีการ (กล่าวต้อนรับ)');
    }else if(m==='community'||m==='listening'){
      setData(d=>({...d,form:{...d.form,mode:'community',topic:'เวทีรับฟังความคิดเห็นเพื่อการพัฒนาพื้นที่ส่วนกลางในชุมชน',keyMessage:'เปิดพื้นที่รับฟังทุกเสียงอย่างเท่าเทียม เพื่อร่วมออกแบบชุมชนที่มีชีวิต',duration:5,tone:'อธิบายง่าย พร้อมรับฟังความเห็นต่าง',purpose:'รับฟังความต้องการ ปัญหา และข้อเสนอแนะในการปรับปรุงพื้นที่ส่วนกลาง',product:'ได้ข้อสรุป 3 ประเด็นสำคัญที่คนในชุมชนเห็นพ้องร่วมกัน',participants:'ชาวบ้านในพื้นที่ ผู้นำชุมชน กลุ่มเยาวชน และผู้สูงอายุ',problems:'อาจมีความเห็นต่างเรื่องการใช้ประโยชน์ ต้องเน้นรับฟัง ไม่ตัดสิน และบันทึกข้อเท็จจริง',planTopics:'1. เปิดเวทีและตั้งกติกาพื้นที่ปลอดภัย\n2. ชวนคุยประสบการณ์และปัญหาที่พบ\n3. เปิดรับข้อเสนอแนะและก้าวต่อไป',planExamples:'1. ทุกเสียงมีคุณค่า ไม่มีการตัดสินถูกผิด\n2. ปัญหาไฟส่องสว่างและความสะอาด\n3. ร่วมโหวตแนวทางทดลองทำใน 30 วัน'}}));
      notify('โหลดตัวอย่างสถานการณ์: เวทีชุมชน (เปิดรับฟัง)');
    }else if(m==='panel'||m==='debate'){
      setData(d=>({...d,form:{...d.form,mode:'panel',topic:'เวทีเสวนา & อภิปราย: อนาคตการสื่อสารในยุค AI และพลังของ Human Touch',keyMessage:'AI เป็นเครื่องมือเสริมพลัง แต่หัวใจความเข้าใจมนุษย์คือสิ่งที่แทนไม่ได้',duration:5,tone:'เป็นทางการ กระชับ ตรงประเด็น',purpose:'วิเคราะห์ประเด็นอภิปรายคมคาย แนะนำวิทยากร 3 ท่าน และโยนคำถามนำเสวนา',product:'ผู้ฟังได้ข้อสรุปแนวทางนำ AI ไปประยุกต์ใช้ พร้อมวิธีตั้งรับข้อโต้แย้ง',participants:'คนทำงานรุ่นใหม่ นักศึกษา และผู้บริหารองค์กร',problems:'เวลาตอบอาจบานปลาย หรือมีข้อโต้แย้ง ต้องตั้งสติ (STOP) คุมเวลา และดึงกลับเข้าประเด็น',planTopics:'1. เกริ่นนำความท้าทายในยุค AI\n2. แนะนำวิทยากรผู้ทรงคุณวุฒิ 3 ท่าน\n3. โยนคำถามแรกเพื่อเปิดมุมมองและตั้งรับจุดต่าง',planExamples:'1. เทคโนโลยีเปลี่ยนเร็ว แต่การฟังด้วยใจยังสำคัญ\n2. ผู้เชี่ยวชาญ AI, นักจิตวิทยา, นักสื่อสารมวลชน\n3. ทักษะใดที่ AI ยังสู้ความเข้าใจมนุษย์ไม่ได้?'}}));
      notify('โหลดตัวอย่างสถานการณ์: เวทีอภิปราย & เสวนาคมคาย');
    }else if(m==='public'){
      setData(d=>({...d,form:{...d.form,mode:'public',topic:'สุนทรพจน์: พลังการสื่อสารเพื่อการเปลี่ยนแปลงสังคมที่จับต้องได้',keyMessage:'เสียงของทุกคนมีคุณค่า เมื่อเราพูดด้วยความจริงใจและนำเสนอทางออกร่วม',duration:5,tone:'อบอุ่น ชัดเจน ให้เกียรติผู้ฟัง',purpose:'ปราศรัยสร้างแรงบันดาลใจและเชื่อมโยงผู้คนเข้าสู่เป้าหมายร่วม',product:'ผู้ฟังเกิดความหวังและพร้อมร่วมขับเคลื่อน 1 พันธกิจ',participants:'ประชาชนทั่วไป คนทำงานรุ่นใหม่ และผู้นำการเปลี่ยนแปลง',problems:'ผู้ฟังอาจรู้สึกว่าปัญหายากเกินแก้ ต้องเน้นทางออกที่ทำได้จริงและให้กำลังใจ',planTopics:'1. ประโยคเปิดกระตุกคิด (Hook)\n2. สภาพปัญหาและเรื่องเล่าสะท้อนใจ\n3. ทางออกเชิงบวกและประโยคจำ (Soundbite)',planExamples:'1. โลกไม่ได้เปลี่ยนเพราะคนพูดเก่ง แต่เปลี่ยนเพราะคนฟังเข้าใจและลงมือทำ\n2. กรณีศึกษาชุมชนที่เริ่มจากจุดเล็กๆ\n3. ก้าวแรกเริ่มที่ตัวเรา และก้าวต่อไปเริ่มที่เราจับมือกัน'}}));
      notify('โหลดตัวอย่างสถานการณ์: เวทีปราศรัย (สร้างประเด็นจำ)');
    }else{
      notify('เลือกโหมดพิธีการ ปราศรัย อภิปราย หรือชุมชน เพื่อดูตัวอย่างสถานการณ์จริง');
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
      setData(d=>({
        ...d,
        sequences: v.sequences,
        sources:[...d.sources,...v.sources],
        drafts:[...d.drafts,...v.drafts]
      }));
      notify(`นำเข้าข้อมูลซีเคว้น ${v.sequences.length} ชุด และบทพูดเรียบร้อยแล้ว`);
    }catch(err){
      notify('นำเข้าไม่สำเร็จ: '+err.message);
    }
  };

  const startPrompt=mode=>{
    patchForm('mode',mode);
    go('prompts');
  };

  return <>
    <a className="skip-link" href="#main">ข้ามไปยังเนื้อหา</a>
    <div className="app-shell">
      <aside className={`sidebar ${mobile?'open':''}`}>
        <div className="brand">
          <span className="brand-symbol"><Mic2 size={25}/></span>
          <div>
            <strong>KRUDEN</strong>
            <span>SPEAKING STUDIO</span>
          </div>
          <button className="icon-btn mobile-close" aria-label="ปิดเมนู" onClick={()=>setMobile(false)}>
            <X size={20}/>
          </button>
        </div>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav aria-label="เมนูหลัก">
          {nav.map(([id,Icon,title,en])=>(
            <button
              key={id}
              onClick={()=>go(id)}
              className={`nav-item ${page===id?'active':''}`}
              aria-current={page===id?'page':undefined}
            >
              <Icon size={20}/>
              <span>{title}<small>{en}</small></span>
              {page===id&&<i/>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-status">
            <span/>พื้นที่ทำงานส่วนตัว
            <small>{storageError?'ตรวจสอบการบันทึก':'บันทึกในเบราว์เซอร์เครื่องนี้'}</small>
          </div>
          <button className="backup-btn" onClick={()=>exportBackupJson(data)}>
            <Download size={17}/> ส่งออกไฟล์สำรอง
          </button>
          <div className="signature">
            <span className="avatar">
              <img src="/favicon-64x64.png" alt="ครูเด่น มาสเตอร์ฟา" />
            </span>
            <div>
              <strong>ครูเด่น มาสเตอร์ฟา</strong>
              <small>Human • Heart • Harmony</small>
            </div>
          </div>
        </div>
      </aside>

      {mobile&&<button className="mobile-scrim" aria-label="ปิดเมนู" onClick={()=>setMobile(false)}/>}

      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-btn mobile-menu" aria-label="เปิดเมนู" onClick={()=>setMobile(true)}>
              <Menu size={22}/>
            </button>
            <div className="mobile-app-brand">
              <Mic2 size={18} className="brand-dot"/>
              <strong>KRUDEN</strong>
              <span>STUDIO</span>
            </div>
            <div className="breadcrumb desktop-only">
              <span>พื้นที่ทำงาน</span>
              <ChevronRight size={14}/>
              <strong>{active[2]}</strong>
            </div>
          </div>

          <div className="topbar-right">
            {classroomSession.entered ? (
              <div
                className="classroom-badge"
                title="คลิกเพื่อดูรายละเอียดห้องเรียนหรือออกจากระบบ"
                onClick={()=>setClassroomModal(true)}
                style={{cursor:'pointer'}}
              >
                <span className="classroom-dot"/>
                <span className="badge-name-text">
                  <strong>{classroomSession.studentName || 'ผู้เรียน'}</strong>
                  <span className="badge-code-sub desktop-only">({classroomSession.passcode})</span>
                </span>
              </div>
            ) : (
              <button
                className="btn primary compact-btn"
                onClick={()=>setClassroomModal(true)}
                title="กรอกรหัสเข้าห้องเรียนที่ได้รับจากครูเด่น"
              >
                <KeyRound size={14}/> <span className="desktop-only">รหัสเข้าห้องเรียน</span>
              </button>
            )}

            <button
              className="btn admin-header-btn"
              onClick={()=>setAdminModal(true)}
              title="แผงควบคุมครูเด่น (Admin ออกรหัสห้องเรียน)"
            >
              <ShieldCheck size={16}/> <span className="desktop-only">ครูเด่น (Admin)</span>
            </button>

            <span className="saved-indicator desktop-only">
              <CheckCircle2 size={14}/> {storageError?'รอสำรองข้อมูล':'บันทึกอัตโนมัติ'}
            </span>
            <a className="text-link desktop-only" href={CANVA_URL} target="_blank" rel="noreferrer">
              หลักการสื่อสาร Canva <ArrowUpRight size={15}/>
            </a>
          </div>
        </header>

        <main id="main" tabIndex={-1}>
          {corruptedWarning&&<div className="warning-banner" role="alert">
            <div><strong>แจ้งเตือนความปลอดภัยของข้อมูล</strong><p>{corruptedWarning}</p></div>
            <div className="warning-actions">
              {initialResult.rawBackup&&<button className="btn" onClick={()=>triggerDownload('kruden-emergency-raw.json',initialResult.rawBackup,'application/json')}><Download size={15}/> บันทึกไฟล์ดิบ</button>}
              <button className="btn primary" onClick={()=>setCorruptedWarning('')}>เข้าใจแล้ว เริ่มทำงานต่อ</button>
            </div>
          </div>}

          {storageError&&<div className="error-banner" role="alert">{storageError}</div>}

          {/* PAGE: HOME (Modern Mobile-App Aesthetic) */}
          {page==='home'&&<div className="home-mobile-container">
            {/* 1. Mobile Greeting & Date Header */}
            <div className="app-greeting-header">
              <div className="app-greeting-left">
                <div className="app-date-pill">
                  <Calendar size={13}/>
                  <span>{new Date().toLocaleDateString('th-TH',{weekday:'short',day:'numeric',month:'short'})}</span>
                  <span className="dot-sep">•</span>
                  <span className="human-tag">Human • Heart • Harmony</span>
                </div>
                <h1 className="app-greeting-title">
                  สวัสดีครับ, {classroomSession.studentName || 'เพื่อนนักพูด'} <span>✨</span>
                </h1>
                <p className="app-greeting-sub">
                  วันนี้เตรียมบทพูดหรือคุมคิวพิธีกรบนเวทีไหนดีครับ?
                </p>
              </div>

              <div className="app-greeting-right">
                {classroomSession.entered ? (
                  <button
                    type="button"
                    className="app-profile-pill active"
                    onClick={()=>setClassroomModal(true)}
                    title="ข้อมูลห้องเรียนของคุณ (คลิกเพื่อดูหรือออกจากห้อง)"
                  >
                    <span className="classroom-dot"/>
                    <span className="pill-name">{classroomSession.studentName || 'ผู้เรียน'}</span>
                    <span className="pill-code">{classroomSession.passcode}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="app-profile-pill login"
                    onClick={()=>setClassroomModal(true)}
                    title="กรอกรหัสเข้าห้องเรียน"
                  >
                    <KeyRound size={14}/>
                    <span>เข้าห้องเรียน</span>
                  </button>
                )}
              </div>
            </div>

            {/* 2. Primary Hero Focus Card (Mombo Style - One Primary Action) */}
            <section className="app-hero-card">
              <div className="app-hero-content">
                <div className="app-hero-tag">
                  <Sparkles size={13}/>
                  <span>KRUDEN AI SPEECH ASSISTANT</span>
                </div>
                <h2>ร่างบทพูดให้จับใจ<br/><span>ดำเนินรายการอย่างลื่นไหล</span></h2>
                <p>
                  ตอบ 5 คำถามสำคัญ (5Ps Process) ให้ Kruden AI ช่วยแปลงเป็นโครงสร้างบทพูดจริง พร้อมเกลาจังหวะหายใจ (/) และสร้างประเด็นจำ
                </p>
                <div className="app-hero-actions">
                  <button className="btn ai-btn app-pill-btn" onClick={()=>go('prompts')}>
                    <Sparkles size={16}/> ให้ Kruden AI ช่วยร่างบทพูด
                  </button>
                  <button className="btn app-pill-btn-outline" onClick={()=>go('sequence')}>
                    <ListOrdered size={16}/> จัดซีเคว้นคิวพิธีกร
                  </button>
                </div>
              </div>
              <div className="app-hero-visual">
                <span className="hero-shape-circle s1"/>
                <span className="hero-shape-circle s2"/>
                <Mic2 className="hero-visual-mic" strokeWidth={1.2}/>
                <div className="hero-quote-box">
                  <strong>SPEAK</strong>
                  <small>with clarity & purpose</small>
                </div>
              </div>
            </section>

            {/* 3. Four Modern Metric Stat Chips (Image 1 Style - Colorful Circular Badges) */}
            <section className="app-metrics-grid">
              <div className="metric-chip yellow" onClick={()=>go('prompts')} role="button" tabIndex={0}>
                <div className="metric-chip-icon"><Sparkles size={18}/></div>
                <div className="metric-chip-info">
                  <span className="metric-chip-num">03</span>
                  <span className="metric-chip-label">เวทีจริง 5Ps</span>
                </div>
                <ArrowRight size={14} className="metric-chip-arrow"/>
              </div>

              <div className="metric-chip blue" onClick={()=>go('sequence')} role="button" tabIndex={0}>
                <div className="metric-chip-icon"><ListOrdered size={18}/></div>
                <div className="metric-chip-info">
                  <span className="metric-chip-num">{String(totalAllItems).padStart(2,'0')}</span>
                  <span className="metric-chip-label">คิวใบลำดับงาน</span>
                </div>
                <ArrowRight size={14} className="metric-chip-arrow"/>
              </div>

              <div className="metric-chip green" onClick={()=>go('script')} role="button" tabIndex={0}>
                <div className="metric-chip-icon"><FileText size={18}/></div>
                <div className="metric-chip-info">
                  <span className="metric-chip-num">{String(data.drafts.length).padStart(2,'0')}</span>
                  <span className="metric-chip-label">บทที่บันทึกไว้</span>
                </div>
                <ArrowRight size={14} className="metric-chip-arrow"/>
              </div>

              <div className="metric-chip coral" onClick={()=>go('rehearsal')} role="button" tabIndex={0}>
                <div className="metric-chip-icon"><Radio size={18}/></div>
                <div className="metric-chip-info">
                  <span className="metric-chip-num">LIVE</span>
                  <span className="metric-chip-label">ห้องซ้อมพูด</span>
                </div>
                <ArrowRight size={14} className="metric-chip-arrow"/>
              </div>
            </section>

            {/* 4. Three Real Stages Selection (Card Segmented Style) */}
            <div className="section-heading modern-section-head">
              <div>
                <p className="eyebrow">3 REAL STAGES · FRAMEWORKS</p>
                <h2>เลือกเวทีที่คุณจะขึ้นพูดหรือดำเนินรายการ</h2>
              </div>
              <button className="link-button" onClick={()=>go('prompts')}>
                ดู Script Lab ทั้งหมด <ArrowRight size={15}/>
              </button>
            </div>

            <div className="app-stage-cards">
              {MODES.map((m,idx)=>(
                <div className="app-stage-card" key={m.id}>
                  <div className="stage-card-top">
                    <span className="stage-index-badge">0{idx+1}</span>
                    <span className="stage-time-tag">
                      <Clock size={12}/> {m.duration} นาที
                    </span>
                  </div>
                  <h3>{m.name}</h3>
                  <p>{m.desc}</p>
                  
                  <div className="stage-structure-tags">
                    {m.structure.slice(0,3).map((st,i)=>(
                      <span key={i} className="stage-mini-tag">{st}</span>
                    ))}
                  </div>

                  <div className="stage-card-actions">
                    <button className="btn primary stage-action-btn" onClick={()=>startPrompt(m.id)}>
                      <Sparkles size={14}/> ร่างบท 5Ps
                    </button>
                    <button className="btn stage-action-btn" onClick={()=>{setActiveSeqStage(m.id);go('sequence');}}>
                      <ListOrdered size={14}/> ดูใบคิว
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 5. Quick Tools & Agenda (2-Column Mobile Dashboard) */}
            <div className="app-home-grid">
              <section className="app-card-panel">
                <div className="card-panel-head">
                  <div className="panel-title-with-icon">
                    <div className="panel-icon-circle green"><Clock size={16}/></div>
                    <div>
                      <h3>กำหนดการเวิร์กช็อป 180 นาที</h3>
                      <p>หลักสูตร Public Speaking & MC Skills โดยครูเด่น</p>
                    </div>
                  </div>
                  <span className="fine-badge">3 ชม.</span>
                </div>
                <div className="agenda-mini-list">
                  {agenda.map(([time,label,min])=>(
                    <div className="agenda-mini-row" key={time}>
                      <span className="agenda-time-pill">{time}</span>
                      <span className="agenda-label-text">{label}</span>
                      <span className="agenda-duration-tag">{min} นาที</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="app-card-panel principle-warm-card">
                <div className="card-panel-head">
                  <div className="panel-title-with-icon">
                    <div className="panel-icon-circle yellow"><ShieldCheck size={16}/></div>
                    <div>
                      <h3>ปรัชญาการสื่อสาร</h3>
                      <p>Human • Heart • Harmony</p>
                    </div>
                  </div>
                </div>
                <div className="principle-body">
                  <blockquote>
                    "การพูดที่ทรงพลังไม่ได้เริ่มจากคำที่ไพเราะ แต่เริ่มจากความจริงใจ การรับฟัง และการสร้างพื้นที่ปลอดภัยให้ผู้ฟังทุกคน"
                  </blockquote>
                  <p className="principle-author">— ครูเด่น มาสเตอร์ฟา</p>
                </div>
                <div className="principle-tools-row">
                  <button className="btn" onClick={()=>go('rehearsal')}>
                    <Radio size={14}/> ห้องซ้อม Teleprompter
                  </button>
                  <button className="btn" onClick={()=>go('sources')}>
                    <Library size={14}/> แหล่งข้อมูลประกอบ
                  </button>
                </div>
              </section>
            </div>
          </div>}

          {/* PAGE: PROMPTS (Script Lab & 5Ps) */}
          {page==='prompts'&&<>
            <div className="page-heading">
              <div>
                <p className="eyebrow">SCRIPT LAB · 5Ps PROCESS</p>
                <h1>Script Lab: วางประเด็นให้ชัด ก่อนเริ่มพูด<span className="heading-dot">.</span></h1>
                <p>เตรียมบทพูดและวิเคราะห์ 5 กระบวนการ (5Ps Process) สำหรับ 3 เวทีจริง พร้อม Kruden AI</p>
              </div>
              <div className="toolbar">
                <button className="btn" onClick={fillPresetScenario} title="โหลดสถานการณ์ตัวอย่างจริงของเวทีนี้">
                  <Sparkles size={16}/> โหลดตัวอย่างสถานการณ์จริง
                </button>
                <button className="btn" onClick={()=>{setActiveSeqStage(data.form.mode);go('sequence');}} title="ดูซีเคว้นลำดับงานของเวทีนี้">
                  <ListOrdered size={16}/> ดูซีเคว้นเวทีนี้
                </button>
                <span className="outline-badge"><ShieldCheck size={16}/> Human • Heart • Harmony</span>
              </div>
            </div>

            <div className="mode-switch">
              {MODES.map(m=>(
                <button
                  key={m.id}
                  aria-pressed={data.form.mode===m.id}
                  className={`mode-switch-card ${data.form.mode===m.id?'active':''}`}
                  onClick={()=>{patchForm('mode',m.id);setPrompt('');setAiResult('');}}
                >
                  <strong>{m.short}</strong>
                  <small>{m.sub}</small>
                </button>
              ))}
            </div>

            <div className="builder-grid">
              <section className="panel builder-form">
                <div className="panel-heading">
                  <span className="step-no">01</span>
                  <div>
                    <h2>{modeFor(data.form.mode).name}</h2>
                    <p>{modeFor(data.form.mode).desc}</p>
                  </div>
                </div>

                <div className="form-stack">
                  <label>
                    หัวข้อการสื่อสาร
                    <input maxLength={300} value={data.form.topic} onChange={e=>patchForm('topic',e.target.value)} placeholder="เช่น พิธีเปิดเวิร์กช็อป Public Speaking"/>
                  </label>

                  <div className="form-row">
                    <label>
                      เวลาพูด (นาที)
                      <input type="number" min={1} max={60} value={data.form.duration} onChange={e=>patchForm('duration',Math.min(60,Math.max(1,+e.target.value||1)))}/>
                    </label>
                    <label>
                      น้ำเสียง
                      <select value={data.form.tone} onChange={e=>patchForm('tone',e.target.value)}>
                        {['อบอุ่น ชัดเจน ให้เกียรติผู้ฟัง','เป็นทางการ กระชับ ตรงประเด็น','อธิบายง่าย พร้อมรับฟังความเห็นต่าง'].map(t=><option key={t}>{t}</option>)}
                      </select>
                    </label>
                  </div>

                  {/* 5Ps Process Canvas */}
                  <div className="canvas-5p">
                    <div className="canvas-5p-head">
                      <strong>5 กระบวนการ <span>เตรียมการก่อนการนำเสนอ : 5Ps Process</span></strong>
                      <button type="button" className="btn" style={{padding:'4px 10px',fontSize:'11px'}} onClick={fillPresetScenario}>
                        <Sparkles size={14}/> เติมตัวอย่างเวทีนี้
                      </button>
                    </div>
                    <div className="canvas-grid">
                      <div className="canvas-box">
                        <div className="canvas-box-title">วัตถุประสงค์ Purpose<span>ทำไมเราจึงนำเสนอครั้งนี้?</span></div>
                        <textarea rows={3} value={data.form.purpose||''} onChange={e=>patchForm('purpose',e.target.value)} placeholder="ทำไมเราจึงนำเสนอครั้งนี้..."/>
                        <span className="canvas-box-num">1</span>
                      </div>
                      <div className="canvas-box">
                        <div className="canvas-box-title">ผลจากการนำเสนอ Product<span>ผลของการนำเสนอที่วัดผลได้และมีคุณค่า</span></div>
                        <textarea rows={3} value={data.form.product||''} onChange={e=>patchForm('product',e.target.value)} placeholder="ผลที่วัดผลได้และมีคุณค่า..."/>
                        <span className="canvas-box-num">2</span>
                      </div>
                      <div className="canvas-box">
                        <div className="canvas-box-title">ผู้ฟัง Participants<span>คือใคร ต้องพัฒนาในเรื่องไหนและสนใจอะไร?</span></div>
                        <textarea rows={3} value={data.form.participants||''} onChange={e=>patchForm('participants',e.target.value)} placeholder="ผู้ฟังคือใคร สนใจอะไร..."/>
                        <span className="canvas-box-num">3</span>
                      </div>
                      <div className="canvas-box">
                        <div className="canvas-box-title">ปัญหาที่อาจเกิดขึ้น Problems<span>ระหว่างการนำเสนอ ตัดไฟแต่ต้นลม</span></div>
                        <textarea rows={3} value={data.form.problems||''} onChange={e=>patchForm('problems',e.target.value)} placeholder="ปัญหาหรือความประหม่าที่อาจเกิด..."/>
                        <span className="canvas-box-num">4</span>
                      </div>
                      <div className="canvas-box plan-box">
                        <div className="canvas-box-title">แผน Plan<span>ประเด็นและตัวอย่างเบื้องต้นในการนำเสนอ</span></div>
                        <div className="plan-cols">
                          <div className="plan-col">
                            <h4>ประเด็น <span>(หัวข้อ)</span></h4>
                            <textarea rows={6} value={data.form.planTopics||''} onChange={e=>patchForm('planTopics',e.target.value)} placeholder="1. หัวข้อที่ 1&#10;2. หัวข้อที่ 2&#10;3. หัวข้อที่ 3"/>
                          </div>
                          <div className="plan-col">
                            <h4>ตัวอย่าง <span>(ขยายความ)</span></h4>
                            <textarea rows={6} value={data.form.planExamples||''} onChange={e=>patchForm('planExamples',e.target.value)} placeholder="1. ตัวอย่างขยายความ&#10;2. สถิติหรือเรื่องเล่า&#10;3. ข้อคิดเชื่อมโยง"/>
                          </div>
                        </div>
                        <span className="canvas-box-num">5</span>
                      </div>
                    </div>
                  </div>

                  <label>
                    สารสำคัญที่อยากให้เข้าใจ (Key Message)
                    <textarea rows={2} maxLength={3000} value={data.form.keyMessage} onChange={e=>patchForm('keyMessage',e.target.value)} placeholder="ใจความสำคัญ 1 ประโยคที่ผู้ฟังต้องจำได้..."/>
                  </label>

                  {data.form.mode==='media'&&<label>
                    คำถามจากสื่อ
                    <textarea rows={2} value={data.form.question} maxLength={3000} onChange={e=>patchForm('question',e.target.value)}/>
                  </label>}

                  <label>
                    ข้อเท็จจริงและข้อมูลประกอบ
                    <textarea rows={3} maxLength={15000} value={data.form.facts} onChange={e=>patchForm('facts',e.target.value)} placeholder="วางข้อมูลพร้อมที่มา วันที่ และข้อจำกัดของข้อมูล..."/>
                    <small>ระบบยังไม่ได้ตรวจสอบข้อเท็จจริงภายนอกให้</small>
                  </label>

                  <label>
                    ข้อจำกัด / เรื่องที่ต้องตรวจสอบ
                    <textarea rows={2} maxLength={3000} value={data.form.limits} onChange={e=>patchForm('limits',e.target.value)}/>
                  </label>

                  <fieldset>
                    <legend>เลือกแหล่งข้อมูลแนบพรอมป์ต์</legend>
                    {data.sources.length?data.sources.map(s=>(
                      <label className="checkbox-label" key={s.id}>
                        <input type="checkbox" checked={selectedSources.includes(s.id)} onChange={e=>setSelectedSources(e.target.checked?[...selectedSources,s.id]:selectedSources.filter(id=>id!==s.id))}/>
                        <span>{s.title}</span>
                      </label>
                    )):<p className="fine">ยังไม่มีแหล่งข้อมูล เพิ่มได้ที่เมนูแหล่งข้อมูล</p>}
                  </fieldset>

                  <button className="btn ai-btn full" disabled={aiLoading} onClick={generateAiScript}>
                    {aiLoading?<Loader2 className="spin" size={18}/>:<Sparkles size={18}/>}
                    {aiLoading?'กำลังประมวลผลบทพูดด้วย Kruden AI...':'✨ ให้ Kruden AI ช่วยร่างบทพูด'}
                  </button>

                  <button className="btn full" onClick={()=>{setPrompt(makePrompt(data.form,data.sources.filter(s=>selectedSources.includes(s.id))));setAiTab('template');notify('สร้างแม่แบบพรอมป์ต์ 5Ps จากข้อมูลของคุณแล้ว');}}>
                    <Copy size={17}/> สร้างแม่แบบพรอมป์ต์ 5Ps สำหรับนำไปใช้เอง
                  </button>
                </div>
              </section>

              <section className="panel prompt-result">
                <div className="panel-heading">
                  <span className="step-no">02</span>
                  <div>
                    <h2>ผลลัพธ์บทพูดและการเตรียมตัว</h2>
                    <p>เลือกดูแม่แบบพรอมป์ต์ หรือบทพูดที่ AI ช่วยร่าง</p>
                  </div>
                </div>

                <div className="ai-tabs">
                  <button className={aiTab==='ai'?'active':''} onClick={()=>setAiTab('ai')}>บทที่ AI ร่าง {aiResult?'✨':''}</button>
                  <button className={aiTab==='template'?'active':''} onClick={()=>setAiTab('template')}>แม่แบบพรอมป์ต์</button>
                </div>

                {aiTab==='ai'?(aiResult?<>
                  <div className="ai-notice">
                    <ShieldCheck size={16}/>
                    <span><strong>เนื้อหาที่ AI ช่วยร่าง:</strong> ตรวจทานข้อมูลและตัวเลขก่อนขึ้นเวทีจริง</span>
                  </div>
                  <div className="toolbar result-actions">
                    <button className="btn primary" onClick={()=>{setData(d=>({...d,script:aiResult}));go('script');notify('ส่งบทพูดเข้าพื้นที่เขียนบทแล้ว');}}>
                      <Play size={16}/> ส่งไปยังพื้นที่เขียนบท
                    </button>
                    <button className="btn" onClick={()=>copy(aiResult)}><Copy size={16}/> คัดลอก</button>
                    <button className="btn" onClick={()=>triggerDownload('speaking-draft-ai.md',aiResult)}><Download size={16}/> บันทึก MD</button>
                  </div>
                  <textarea className="prompt-output" aria-label="บทพูดที่ AI ร่าง" value={aiResult} onChange={e=>setAiResult(e.target.value)}/>
                </>:<div className="prompt-empty">
                  <span><Bot size={36}/></span>
                  <h3>ยังไม่มีบทพูดจาก AI</h3>
                  <p>กรอกข้อมูลหัวข้อและวิเคราะห์ 5Ps ทางซ้ายมือ<br/>แล้วกด <strong>“✨ ให้ Kruden AI ช่วยร่างบทพูด”</strong></p>
                  <p className="fine">ระบบจะประมวลผลผ่าน Cloudflare Pages Functions อย่างปลอดภัย</p>
                </div>):(prompt?<>
                  <div className="toolbar result-actions">
                    <button className="btn primary" onClick={()=>copy(prompt)}><Copy size={16}/> คัดลอก</button>
                    <button className="btn" onClick={()=>triggerDownload('speaking-prompt.txt',prompt)}><Download size={16}/> TXT</button>
                  </div>
                  <textarea className="prompt-output" aria-label="พรอมป์ต์ที่สร้าง" value={prompt} onChange={e=>setPrompt(e.target.value)}/>
                  <p className="fine">สร้างด้วยแม่แบบในเว็บ ยังไม่ได้ส่งข้อมูลออกไป</p>
                </>:<div className="prompt-empty">
                  <span><Sparkles size={36}/></span>
                  <h3>ความคิดของคุณ เริ่มตรงนี้</h3>
                  <p>เติมหัวข้อ สารสำคัญ และข้อมูลอ้างอิง<br/>แล้วกดสร้างแม่แบบพรอมป์ต์</p>
                  <ol>{modeFor(data.form.mode).structure.map(v=><li key={v}>{v}</li>)}</ol>
                </div>)}

                <div className="outline-action">
                  <div>
                    <h3>อยากเริ่มเขียนเอง?</h3>
                    <p>ใช้โครงเติมข้อมูลตามรูปแบบที่เลือก</p>
                  </div>
                  <button className="btn" onClick={()=>{
                    if(data.script.trim()&&!window.confirm('ใช้โครงใหม่แทนข้อความปัจจุบัน? บันทึกบทเดิมไว้ก่อนหากต้องการเก็บ'))return;
                    setData(d=>({...d,script:makeOutline(d.form)}));
                    go('script');
                  }}>
                    เปิดโครงบทพูด <ArrowRight size={16}/>
                  </button>
                </div>
              </section>
            </div>
          </>}

          {/* PAGE: SEQUENCE (MC Run of Show & Cue Sheet) */}
          {page==='sequence'&&<>
            <div className="page-heading">
              <div>
                <p className="eyebrow">MC RUN OF SHOW & CUE SHEET</p>
                <h1>ซีเคว้นพิธีกร และกำหนดการเวที<span className="heading-dot">.</span></h1>
                <p>จัดลำดับเวลา ผู้พูด คิวเวที/แสงเสียง คำกล่าวคีย์เวิร์ด และพิมพ์ใบคิวพกขึ้นเวทีได้ทันที</p>
              </div>
              <div className="toolbar">
                <button className="btn primary" onClick={()=>setEditingItem({item:{time:'',duration:5,segment:'',speaker:'',cue:'',dialogue:''},seqId:currentSeq.id})}>
                  <Plus size={17}/> เพิ่มช่วงรายการ
                </button>
                <button className="btn" onClick={()=>window.print()}>
                  <Printer size={17}/> พิมพ์ใบคิว / PDF
                </button>
                <button className="btn" onClick={()=>exportSequenceMarkdown(currentSeq)}>
                  <Download size={17}/> ส่งออก MD
                </button>
                <button className="btn" onClick={resetCurrentSequence} title="คืนค่าเป็นเทมเพลตเริ่มต้นของเวทีนี้">
                  <RotateCcw size={16}/> รีเซ็ต
                </button>
              </div>
            </div>

            {/* Stage Selector */}
            <div className="mode-switch">
              {[
                ['formal','พิธีการ','กล่าวต้อนรับ / 4S'],
                ['community','ชุมชน','เปิดรับฟัง / Safe Space'],
                ['panel','เสวนา','แนะนำผู้พูด / Moderator']
              ].map(([stg,title,sub])=>(
                <button
                  key={stg}
                  aria-pressed={activeSeqStage===stg}
                  className={`mode-switch-card ${activeSeqStage===stg?'active':''}`}
                  onClick={()=>setActiveSeqStage(stg)}
                >
                  <strong>{title}</strong>
                  <small>{sub}</small>
                </button>
              ))}
            </div>

            {/* Sequence Overview Card */}
            <section className="seq-card">
              <div className="seq-card-info">
                <h2>{currentSeq.title}</h2>
                <p>{currentSeq.description}</p>
                <div className="seq-meta">
                  <span className="seq-pill"><Clock size={14}/> รวมเวลารายการ: {totalSeqMinutes} นาที</span>
                  <span className="seq-pill"><ListOrdered size={14}/> {currentSeq.items?.length||0} คิวบนเวที</span>
                  <button className="link-button" onClick={()=>{patchForm('mode',activeSeqStage);go('prompts');}}>
                    <Sparkles size={14}/> ไปร่างบทพูดเวทีนี้ <ArrowRight size={14}/>
                  </button>
                </div>
              </div>
            </section>

            {/* Desktop Sequence Table (Visible on Tablets & Desktops) */}
            <div className="seq-table-wrapper desktop-only">
              <table className="seq-table" aria-label="ตารางลำดับคิวงานพิธีกร">
                <thead>
                  <tr>
                    <th style={{width:'50px'}}>#</th>
                    <th style={{width:'130px'}}>เวลา</th>
                    <th style={{width:'220px'}}>ช่วงรายการ (Segment)</th>
                    <th style={{width:'180px'}}>ผู้พูด (Speaker)</th>
                    <th>คิวเวที / แสงเสียง (Cue & Tech)</th>
                    <th>บทพูดคีย์เวิร์ด (Key Dialogue / Cue Card)</th>
                    <th style={{width:'100px',textAlign:'right'}}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {(currentSeq.items||[]).map((item,idx)=>(
                    <tr key={item.id}>
                      <td style={{color:'var(--muted)',fontWeight:600}}>{String(idx+1).padStart(2,'0')}</td>
                      <td>
                        <span className="seq-time-pill">{item.time||'-'}</span>
                        <span className="seq-duration">{item.duration||0} นาที</span>
                      </td>
                      <td>
                        <strong style={{color:'#183e35',fontSize:'13px'}}>{item.segment}</strong>
                      </td>
                      <td>
                        <span className="seq-speaker">{item.speaker||'-'}</span>
                      </td>
                      <td>
                        {item.cue?<div className="seq-cue">{item.cue}</div>:<span style={{color:'var(--muted)'}}>-</span>}
                      </td>
                      <td>
                        {item.dialogue?<div className="seq-dialogue">{item.dialogue}</div>:<span style={{color:'var(--muted)'}}>-</span>}
                      </td>
                      <td style={{textAlign:'right'}}>
                        <div className="seq-actions" style={{justifyContent:'flex-end'}}>
                          <button className="icon-btn" aria-label={`แก้ไข ${item.segment}`} onClick={()=>setEditingItem({item,seqId:currentSeq.id})}>
                            <Pencil size={15}/>
                          </button>
                          <button className="icon-btn" aria-label="เลื่อนขึ้น" disabled={idx===0} onClick={()=>moveSequenceItem(currentSeq.id,item.id,-1)}>
                            <MoveUp size={15}/>
                          </button>
                          <button className="icon-btn" aria-label="เลื่อนลง" disabled={idx===currentSeq.items.length-1} onClick={()=>moveSequenceItem(currentSeq.id,item.id,1)}>
                            <MoveDown size={15}/>
                          </button>
                          <button className="icon-btn danger" aria-label={`ลบ ${item.segment}`} onClick={()=>setDeleteItem({seqId:currentSeq.id,itemId:item.id,segment:item.segment})}>
                            <Trash2 size={15}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!currentSeq.items||currentSeq.items.length===0)&&(
                    <tr>
                      <td colSpan={7} style={{textAlign:'center',padding:'40px',color:'var(--muted)'}}>
                        ยังไม่มีคิวรายการในชุดนี้ กดปุ่ม “+ เพิ่มช่วงรายการ” เพื่อสร้างคิวแรก
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Sequence Cards (Dedicated View for Mobile Phones) */}
            <div className="seq-mobile-card-list mobile-only">
              {(currentSeq.items||[]).map((item,idx)=>(
                <div className="seq-m-item-card" key={item.id}>
                  <div className="seq-m-head">
                    <span className="seq-m-index">#{String(idx+1).padStart(2,'0')}</span>
                    <span className="seq-time-pill">{item.time||'-'} ({item.duration||0} นาที)</span>
                    <span className="seq-m-speaker-tag">{item.speaker||'พิธีกร'}</span>
                  </div>

                  <h3 className="seq-m-title">{item.segment}</h3>

                  {item.cue&&(
                    <div className="seq-m-cue-box">
                      <small>คิว / เทคนิคเวที:</small>
                      <p>{item.cue}</p>
                    </div>
                  )}

                  {item.dialogue&&(
                    <div className="seq-m-dialogue-box">
                      <small>บทพูดสำคัญ:</small>
                      <p>{item.dialogue}</p>
                    </div>
                  )}

                  <div className="seq-m-actions-bar">
                    <div className="toolbar">
                      <button className="btn seq-m-btn" onClick={()=>setEditingItem({item,seqId:currentSeq.id})}>
                        <Pencil size={13}/> แก้ไข
                      </button>
                      <button className="btn seq-m-btn danger" onClick={()=>setDeleteItem({seqId:currentSeq.id,itemId:item.id,segment:item.segment})}>
                        <Trash2 size={13}/> ลบ
                      </button>
                    </div>
                    <div className="toolbar">
                      <button className="icon-btn seq-m-shift-btn" disabled={idx===0} onClick={()=>moveSequenceItem(currentSeq.id,item.id,-1)} title="เลื่อนขึ้น">
                        <MoveUp size={15}/>
                      </button>
                      <button className="icon-btn seq-m-shift-btn" disabled={idx===currentSeq.items.length-1} onClick={()=>moveSequenceItem(currentSeq.id,item.id,1)} title="เลื่อนลง">
                        <MoveDown size={15}/>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {(!currentSeq.items||currentSeq.items.length===0)&&(
                <div className="empty-state" style={{padding:'30px 15px'}}>
                  <p>ยังไม่มีคิวรายการ กดปุ่ม “+ เพิ่มช่วงรายการ” ด้านบนเพื่อสร้างคิวแรก</p>
                </div>
              )}
            </div>

            {/* Print Sheet Layout (visible only when printing) */}
            <div className="print-cue-sheet">
              <div className="print-header">
                <div>
                  <h1>{currentSeq.title}</h1>
                  <span>KRUDEN SPEAKING STUDIO · Human • Heart • Harmony</span>
                </div>
                <div>
                  <strong>เวลารวม: {totalSeqMinutes} นาที</strong> ({currentSeq.items?.length||0} คิว)
                </div>
              </div>
              <table className="print-cue-table">
                <thead>
                  <tr>
                    <th style={{width:'35px'}}>#</th>
                    <th style={{width:'85px'}}>เวลา</th>
                    <th style={{width:'160px'}}>ช่วงรายการ</th>
                    <th style={{width:'130px'}}>ผู้พูด</th>
                    <th style={{width:'200px'}}>คิวเวที / แสงเสียง</th>
                    <th>บทพูดคีย์เวิร์ด (Cue Card)</th>
                  </tr>
                </thead>
                <tbody>
                  {(currentSeq.items||[]).map((item,idx)=>(
                    <tr key={item.id}>
                      <td style={{textAlign:'center'}}>{idx+1}</td>
                      <td><strong>{item.time||'-'}</strong><br/><small>({item.duration||0} นาที)</small></td>
                      <td><strong>{item.segment}</strong></td>
                      <td>{item.speaker||'-'}</td>
                      <td>{item.cue||'-'}</td>
                      <td style={{whiteSpace:'pre-wrap'}}>{item.dialogue||'-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>}

          {/* PAGE: SCRIPT WORKSPACE */}
          {page==='script'&&<>
            <div className="page-heading">
              <div>
                <p className="eyebrow">SCRIPT WORKSPACE</p>
                <h1>เปลี่ยนประเด็น เป็นบทพูดของคุณ<span className="heading-dot">.</span></h1>
                <p>เขียนเอง หรือวางคำตอบจาก AI แล้วตรวจทานก่อนขึ้นเวที</p>
              </div>
              <div className="toolbar">
                <button className="btn" onClick={saveDraft}><Bookmark size={17}/> เก็บเข้าคลัง</button>
                <button className="btn primary" onClick={()=>go('rehearsal')}><Play size={17}/> ซ้อมบทนี้</button>
              </div>
            </div>

            <div className="script-grid">
              <section className="panel script-panel">
                <div className="script-toolbar">
                  <label>
                    ชื่อบทพูด
                    <input aria-label="ชื่อบทพูด" maxLength={300} value={data.form.topic} onChange={e=>patchForm('topic',e.target.value)}/>
                  </label>
                  <span>{data.script.length.toLocaleString()} ตัวอักษร</span>
                </div>

                {/* DeepSeek AI Speech Polish & Analysis Bar */}
                <div className="ai-polish-bar">
                  <div className="ai-polish-title">
                    <Sparkles size={16}/>
                    <strong>Kruden AI เกลาบทพูด & วิเคราะห์ประเด็น:</strong>
                  </div>
                  <div className="toolbar">
                    <button
                      className="btn ai-btn"
                      disabled={aiLoading||!data.script.trim()}
                      onClick={()=>callAiAssistant('polish')}
                      title="เกลาภาษาให้คมคาย สละสลวย น่าสนใจ พร้อมใส่วรรคตอน /"
                    >
                      {aiLoading && aiAction==='polish' ? <Loader2 className="spin" size={15}/> : <Sparkles size={15}/>}
                      เกลาคำพูดให้น่าสนใจ (Polish)
                    </button>
                    <button
                      className="btn"
                      disabled={aiLoading||!data.script.trim()}
                      onClick={()=>callAiAssistant('hooks')}
                      title="สร้าง 3 ประโยคเปิดกระตุกคิด (Hooks) และ 3 ประโยคจำ (Golden Soundbites)"
                    >
                      {aiLoading && aiAction==='hooks' ? <Loader2 className="spin" size={15}/> : <Bookmark size={15}/>}
                      ประเด็นจำ & คำคม (Soundbites)
                    </button>
                    <button
                      className="btn"
                      disabled={aiLoading||!data.script.trim()}
                      onClick={()=>callAiAssistant('debate_analysis')}
                      title="วิเคราะห์ประเด็นอภิปราย จุดแข็ง ข้อโต้แย้งที่อาจเจอ และวิธีตอบกลับ (Pivot)"
                    >
                      {aiLoading && aiAction==='debate_analysis' ? <Loader2 className="spin" size={15}/> : <ShieldCheck size={15}/>}
                      วิเคราะห์อภิปราย (Debate Analysis)
                    </button>
                  </div>
                </div>

                {/* AI Assistant Output Card */}
                {aiAssistantResult&&(
                  <div className="ai-polish-result">
                    <div className="ai-polish-result-head">
                      <h3>
                        <Sparkles size={16}/>
                        {aiAssistantResult.action==='polish'?'ผลลัพธ์การเกลาบทพูดด้วย Kruden AI':
                         aiAssistantResult.action==='hooks'?'ประโยคเปิด (Hooks) และ ประโยคจำ (Soundbites)':
                         'การวิเคราะห์ประเด็นอภิปราย & แนวทางตอบกลับ'}
                      </h3>
                      <div className="toolbar">
                        <button className="btn primary" onClick={()=>{
                          setData(d=>({...d,script:aiAssistantResult.text}));
                          setAiAssistantResult(null);
                          notify('แทนที่บทพูดด้วยข้อความที่เกลาแล้ว');
                        }}>
                          <Check size={14}/> แทนที่ในบทพูด
                        </button>
                        <button className="btn" onClick={()=>{
                          setData(d=>({...d,script:d.script + '\n\n---\n\n' + aiAssistantResult.text}));
                          setAiAssistantResult(null);
                          notify('แทรกต่อท้ายบทพูดเรียบร้อย');
                        }}>
                          <Plus size={14}/> แทรกต่อท้าย
                        </button>
                        <button className="btn" onClick={()=>copy(aiAssistantResult.text)}>
                          <Copy size={14}/> คัดลอก
                        </button>
                        <button className="icon-btn" aria-label="ปิดกล่องแนะนำ" onClick={()=>setAiAssistantResult(null)}>
                          <X size={16}/>
                        </button>
                      </div>
                    </div>
                    <div className="ai-polish-text">{aiAssistantResult.text}</div>
                  </div>
                )}

                <textarea
                  className="script-editor"
                  maxLength={100000}
                  value={data.script}
                  onChange={e=>setData(d=>({...d,script:e.target.value}))}
                  placeholder="เริ่มเขียนบทพูดของคุณที่นี่...&#10;&#10;ใช้ / เพื่อกำหนดจุดเว้นวรรค และขึ้นบรรทัดเมื่อเปลี่ยนประเด็น"
                  aria-label="บทพูด"
                />
                <div className="toolbar script-footer">
                  <button className="btn" onClick={()=>copy(data.script)} disabled={!data.script}><Copy size={16}/> คัดลอก</button>
                  <button className="btn" disabled={!data.script} onClick={()=>triggerDownload('speaking-script.md',data.script)}><Download size={16}/> ส่งออกบท</button>
                  <span className="fine">ปรับแก้และบันทึกอัตโนมัติในเครื่องนี้</span>
                </div>
              </section>

              <aside className="script-side">
                <section className="panel">
                  <h2>ก่อนขึ้นเวที</h2>
                  <p>ตรวจด้วยตัวเองทีละข้อ</p>
                  {['ข้อมูลและตัวเลขมีที่มา','แยกข้อเท็จจริงกับข้อเสนอ','ตอบประเด็นอย่างตรงไปตรงมา','ระบุข้อจำกัดที่ยังไม่ยืนยัน','ไม่กล่าวหาหรือโจมตีตัวบุคคล','ลองพูดและจับเวลาจริงแล้ว'].map((t,i)=>(
                    <label className="check-row" key={t}>
                      <input type="checkbox" checked={!!data.checks[i]} onChange={e=>setData(d=>({...d,checks:{...d.checks,[i]:e.target.checked}}))}/>
                      <span>{t}</span>
                    </label>
                  ))}
                  <button className="link-button" onClick={()=>go('sources')}>เปิดคลังแหล่งข้อมูล <ArrowRight size={16}/></button>
                </section>

                <section className="panel saved-drafts">
                  <h2>คลังบทพูด <span className="count">{data.drafts.length}</span></h2>
                  {data.drafts.length?data.drafts.map(d=>(
                    <article key={d.id}>
                      <button onClick={()=>{
                        if(data.script.trim()&&!window.confirm('เปิดบทที่เลือกแทนข้อความปัจจุบัน?'))return;
                        setData(x=>({...x,script:d.text,form:{...x.form,topic:d.title,mode:d.mode}}));
                        notify('เปิดบทที่เลือกแล้ว');
                      }}>
                        <strong>{d.title}</strong>
                        <small>{modeFor(d.mode).short} · {d.date?new Date(d.date).toLocaleDateString('th-TH'):''}</small>
                      </button>
                      <button className="icon-btn danger" aria-label={`ลบบท ${d.title}`} onClick={()=>{
                        if(window.confirm('ลบบทที่บันทึกนี้?'))setData(x=>({...x,drafts:x.drafts.filter(y=>y.id!==d.id)}));
                      }}>
                        <Trash2 size={15}/>
                      </button>
                    </article>
                  )):<p className="empty-caption">ยังไม่มีบทพูดที่เก็บไว้<br/>กด “เก็บเข้าคลัง” เพื่อสร้างสำเนา</p>}
                </section>
              </aside>
            </div>
          </>}

          {/* PAGE: REHEARSAL */}
          {page==='rehearsal'&&<>
            <div className="page-heading">
              <div>
                <p className="eyebrow">PRACTICE ROOM</p>
                <h1>ฝึกให้เป็นธรรมชาติ ในจังหวะของคุณ<span className="heading-dot">.</span></h1>
                <p>เลื่อนบทอัตโนมัติ จับเวลา และสะท้อนผลจากการฝึกจริง</p>
              </div>
              <button className="btn" onClick={()=>go('script')}><Pencil size={17}/> แก้ไขบทพูด</button>
            </div>
            <Rehearsal script={data.script} notify={notify}/>
          </>}

          {/* PAGE: EVIDENCE LIBRARY */}
          {page==='sources'&&<>
            <div className="page-heading">
              <div>
                <p className="eyebrow">EVIDENCE LIBRARY</p>
                <h1>ทุกประเด็น มีที่มาให้กลับไปดู<span className="heading-dot">.</span></h1>
                <p>เก็บลิงก์ บันทึกข้อจำกัด และสถานะการตรวจสอบโดยคุณ</p>
              </div>
              <button className="btn primary" onClick={()=>{
                if(data.sources.length>=200){notify('รองรับแหล่งข้อมูลสูงสุด 200 รายการ');return;}
                setSourceModal(true);
              }}>
                <Plus size={18}/> เพิ่มแหล่งข้อมูล
              </button>
            </div>

            <div className="source-note">
              <ShieldCheck size={23}/>
              <p>สถานะ “ผู้ใช้ตรวจแล้ว” เป็นการระบุโดยคุณ ระบบไม่ได้ตรวจความถูกต้องของเว็บไซต์หรือข้อกล่าวอ้างโดยอัตโนมัติ</p>
            </div>

            <div className="source-list">
              {data.sources.length?data.sources.map(s=>(
                <article className="source-row" key={s.id}>
                  <span className="source-symbol"><BookOpen size={24}/></span>
                  <div className="source-info">
                    <h2>{s.title}</h2>
                    <a href={safeUrl(s.url)||undefined} target="_blank" rel="noreferrer">
                      {s.url}<ExternalLink size={13}/>
                    </a>
                    <p>{s.note}</p>
                  </div>
                  <div className="source-options">
                    <label>
                      สถานะ
                      <select value={s.status} onChange={e=>setData(d=>({...d,sources:d.sources.map(x=>x.id===s.id?{...x,status:e.target.value}:x)}))}>
                        <option value="provided">ยังไม่ยืนยันภายนอก</option>
                        <option value="checked">ผู้ใช้ตรวจแล้ว</option>
                      </select>
                    </label>
                    <button className="icon-btn danger" aria-label={`ลบแหล่งข้อมูล ${s.title}`} onClick={()=>{
                      if(window.confirm('ลบแหล่งข้อมูลนี้?'))setData(d=>({...d,sources:d.sources.filter(x=>x.id!==s.id)}));
                    }}>
                      <Trash2 size={18}/>
                    </button>
                  </div>
                </article>
              )):<div className="empty-state">
                <Library size={32}/>
                <h2>เริ่มจากแหล่งข้อมูลแรกของคุณ</h2>
                <p>เพิ่มเอกสารหรือลิงก์ที่ใช้อ้างอิงในการพูด</p>
              </div>}
            </div>

            <section className="panel backup-panel">
              <div>
                <h2>ย้ายงานไปทำต่อได้ทุกเครื่อง</h2>
                <p>ส่งออกไฟล์ JSON เก็บบทพูด ซีเคว้นพิธีกร และแหล่งข้อมูลทั้งหมด การนำเข้าจะเพิ่มรายการต่อจากข้อมูลเดิม</p>
              </div>
              <div className="toolbar">
                <button className="btn" onClick={()=>importRef.current.click()}><Upload size={17}/> นำเข้า JSON</button>
                <button className="btn primary" onClick={()=>exportBackupJson(data)}><Download size={17}/> ส่งออกไฟล์สำรอง</button>
              </div>
            </section>
          </>}
        </main>

        <footer className="app-footer">
          <span>KRUDEN SPEAKING STUDIO</span>
          <span>ออกแบบความเข้าใจ ผ่านพลังการสื่อสาร</span>
        </footer>
      </div>
    </div>

    <input type="file" accept="application/json,.json" ref={importRef} hidden onChange={importFile}/>
    
    {toast&&<div className="toast" role="status"><CheckCircle2 size={18}/>{toast}</div>}

    {/* Modals */}
    {editingItem&&<SequenceItemEditor
      item={editingItem.item}
      onSave={saved=>saveSequenceItem(editingItem.seqId,saved)}
      onClose={()=>setEditingItem(null)}
    />}

    {deleteItem&&<Modal title="ยืนยันการลบคิวรายการ" onClose={()=>setDeleteItem(null)}>
      <p>คุณต้องการลบคิวรายการ <strong>"{deleteItem.segment}"</strong> ออกจากซีเคว้นนี้หรือไม่?</p>
      <div className="toolbar" style={{marginTop:'20px'}}>
        <button className="btn" onClick={()=>setDeleteItem(null)}>ยกเลิก</button>
        <button className="btn danger-btn" onClick={()=>removeSequenceItem(deleteItem.seqId,deleteItem.itemId)}>
          ลบคิวรายการ
        </button>
      </div>
    </Modal>}

    {sourceModal&&<SourceForm
      onClose={()=>setSourceModal(false)}
      onSave={s=>{
        setData(d=>({...d,sources:[...d.sources,s]}));
        setSourceModal(false);
        notify('เพิ่มแหล่งข้อมูลแล้ว');
      }}
    />}

    {classroomModal&&<ClassroomGateModal
      session={classroomSession}
      onEnter={s=>{
        saveClassroomSession(s);
        setClassroomSession(s);
        notify(`ยินดีต้อนรับคุณ ${s.studentName} เข้าสู่ห้องเรียน`);
      }}
      onExit={()=>{
        clearClassroomSession();
        setClassroomSession({entered:false,studentName:'',passcode:'',className:'',role:'guest'});
        notify('ออกจากห้องเรียนเรียบร้อยแล้ว');
      }}
      onClose={()=>setClassroomModal(false)}
      onOpenAdmin={()=>setAdminModal(true)}
    />}

    {adminModal&&<AdminConsoleModal
      classes={adminClasses}
      onSaveClasses={updated=>{
        saveAdminClasses(updated);
        setAdminClasses(updated);
      }}
      onClose={()=>setAdminModal(false)}
      onNotify={notify}
    />}

    {settingsModal&&<SettingsModal
      settings={aiSettings}
      onClose={()=>setSettingsModal(false)}
      onSave={s=>{
        saveAiSettings(s);
        setAiSettings(s);
        setSettingsModal(false);
        notify('บันทึกการตั้งค่า AI เรียบร้อยแล้ว');
      }}
    />}
    {/* Floating Mobile Bottom Navigation Bar (Modern App Dock) */}
    <nav className="mobile-app-bottom-bar" aria-label="แถบนำทางด่วน">
      <button
        type="button"
        className={`bottom-bar-item ${page==='home'?'active':''}`}
        onClick={()=>go('home')}
      >
        <div className="bottom-icon-wrap"><LayoutDashboard size={20}/></div>
        <span>หน้าแรก</span>
      </button>

      <button
        type="button"
        className={`bottom-bar-item ${page==='prompts'?'active':''}`}
        onClick={()=>go('prompts')}
      >
        <div className="bottom-icon-wrap"><Sparkles size={20}/></div>
        <span>Script Lab</span>
      </button>

      <button
        type="button"
        className={`bottom-bar-item ${page==='sequence'?'active':''}`}
        onClick={()=>go('sequence')}
      >
        <div className="bottom-icon-wrap"><ListOrdered size={20}/></div>
        <span>ซีเคว้น</span>
      </button>

      <button
        type="button"
        className={`bottom-bar-item ${page==='script'?'active':''}`}
        onClick={()=>go('script')}
      >
        <div className="bottom-icon-wrap"><FileText size={20}/></div>
        <span>เขียนบท</span>
      </button>

      <button
        type="button"
        className={`bottom-bar-item ${page==='rehearsal'?'active':''}`}
        onClick={()=>go('rehearsal')}
      >
        <div className="bottom-icon-wrap"><Radio size={20}/></div>
        <span>ซ้อมพูด</span>
      </button>
    </nav>
  </>;
}

function ClassroomGateModal({session,onEnter,onExit,onClose,onOpenAdmin}){
  const [passcode,setPasscode]=useState(session.passcode||'');
  const [studentName,setStudentName]=useState(session.studentName||'');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');

  const handleSubmit=async(e)=>{
    e.preventDefault();
    const code=passcode.trim();
    if(!code){
      setError('กรุณาระบุรหัสผ่านห้องเรียน');
      return;
    }
    setLoading(true);
    setError('');
    try{
      const res=await fetch('/api/verify-passcode',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({passcode:code})
      });
      const json=await res.json();
      if(!res.ok||!json.valid){
        throw Error(json.error||'รหัสผ่านห้องเรียนไม่ถูกต้อง');
      }
      onEnter({
        entered:true,
        studentName:studentName.trim()||'ผู้เรียน',
        passcode:code,
        className:json.className||'Public Speaking & MC Skills',
        role:json.role||'student'
      });
      onClose();
    }catch(err){
      setError(err.message);
    }finally{
      setLoading(false);
    }
  };

  return <Modal title="เข้าสู่ห้องเรียน KRUDEN Speaking Studio" onClose={onClose}>
    <form className="form-stack" onSubmit={handleSubmit}>
      <div style={{background:'#edf4ea',border:'1px solid #cce2c7',padding:'16px',borderRadius:'10px',fontSize:'12px',lineHeight:'1.6',color:'#1e4732'}}>
        <strong style={{fontSize:'13px'}}>🎤 พื้นที่ฝึกปฏิบัติการพูดและพิธีกร</strong>
        <p style={{margin:'6px 0 0'}}>
          กรุณากรอก <strong>รหัสผ่านห้องเรียน (Passcode)</strong> ที่ครูเด่นมอบให้ในคลาส เพื่อปลดล็อกการใช้งาน Script Lab, ซีเคว้นพิธีกร และระบบ DeepSeek AI
        </p>
      </div>

      {session.entered&&(
        <div style={{background:'#eef2fb',border:'1px solid #c7d7f7',padding:'12px 14px',borderRadius:'8px',fontSize:'12px',display:'flex',alignItems:'center',justifyContent:'space-between',color:'#20407a'}}>
          <div>
            <strong>เข้าห้องเรียนแล้ว: {session.studentName}</strong>
            <small style={{display:'block',color:'#506a9c'}}>รหัสห้องเรียน: {session.passcode}</small>
          </div>
          <button type="button" className="btn" style={{padding:'4px 10px',fontSize:'11px'}} onClick={onExit}>
            ออกจากห้องเรียน
          </button>
        </div>
      )}

      <label>
        รหัสผ่านห้องเรียน (Classroom Passcode)
        <input
          required
          type="text"
          maxLength={100}
          value={passcode}
          onChange={e=>setPasscode(e.target.value)}
          placeholder="เช่น KD-MC14 หรือรหัสที่ได้รับจากครูเด่น"
          style={{fontSize:'14px',letterSpacing:'1px',fontWeight:'bold'}}
        />
        <small>รหัสห้องเรียนออกโดยครูเด่น มาสเตอร์ฟา สำหรับแต่ละรุ่นการอบรม</small>
      </label>

      <label>
        ชื่อของคุณ / ชื่อเล่น (สำหรับแสดงในเอกสารสคริปต์)
        <input
          type="text"
          maxLength={100}
          value={studentName}
          onChange={e=>setStudentName(e.target.value)}
          placeholder="เช่น น้องเด่น, คุณนัท"
        />
      </label>

      {error&&<div style={{background:'#fbeeed',border:'1px solid #e8b8b3',color:'#842a22',padding:'10px 14px',borderRadius:'6px',fontSize:'12px'}}>
        {error}
      </div>}

      <div className="toolbar" style={{marginTop:'12px',justifyContent:'space-between'}}>
        <button type="button" className="btn" style={{fontSize:'11px'}} onClick={()=>{onClose();onOpenAdmin();}}>
          <ShieldCheck size={14}/> เข้าสู่ระบบ Admin (ครูเด่น)
        </button>
        <div className="toolbar">
          <button type="button" className="btn" onClick={onClose}>ปิด</button>
          <button type="submit" className="btn primary" disabled={loading}>
            {loading?<Loader2 className="spin" size={16}/>:<Check size={16}/>}
            {loading?'กำลังตรวจสอบ...':'เข้าสู่ห้องเรียน'}
          </button>
        </div>
      </div>
    </form>
  </Modal>;
}

function AdminConsoleModal({classes,onSaveClasses,onClose,onNotify}){
  const [unlocked,setUnlocked]=useState(false);
  const [adminKey,setAdminKey]=useState('');
  const [authError,setAuthError]=useState('');
  const [verifying,setVerifying]=useState(false);

  // New class form
  const [newClassName,setNewClassName]=useState('');
  const [newClassCode,setNewClassCode]=useState('');

  const handleUnlock=async(e)=>{
    e.preventDefault();
    setVerifying(true);
    setAuthError('');
    try{
      const res=await fetch('/api/verify-passcode',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({adminKey:adminKey.trim()})
      });
      const json=await res.json();
      if(!res.ok||!json.valid){
        throw Error(json.error||'รหัสผู้ดูแลระบบไม่ถูกต้อง');
      }
      setUnlocked(true);
      onNotify('เข้าสู่แผงควบคุมครูเด่น (Admin) สำเร็จ');
    }catch(err){
      setAuthError(err.message);
    }finally{
      setVerifying(false);
    }
  };

  const generateRandomCode=()=>{
    const rand=Math.random().toString(36).substring(2,6).toUpperCase();
    setNewClassCode(`KD-MC${new Date().getMonth()+1}-${rand}`);
  };

  const handleAddClass=(e)=>{
    e.preventDefault();
    if(!newClassName.trim()||!newClassCode.trim())return;
    const item={
      id:`class-${newId()}`,
      name:newClassName.trim(),
      code:newClassCode.trim().toUpperCase(),
      active:true,
      createdAt:new Date().toISOString().split('T')[0]
    };
    const updated=[item,...classes];
    onSaveClasses(updated);
    setNewClassName('');
    setNewClassCode('');
    onNotify(`ออกรหัสห้องเรียน "${item.code}" เรียบร้อยแล้ว`);
  };

  const toggleClass=(id)=>{
    const updated=classes.map(c=>c.id===id?{...c,active:!c.active}:c);
    onSaveClasses(updated);
  };

  const deleteClass=(id)=>{
    if(!window.confirm('ลบรหัสห้องเรียนนี้?'))return;
    const updated=classes.filter(c=>c.id!==id);
    onSaveClasses(updated);
    onNotify('ลบรหัสห้องเรียนแล้ว');
  };

  const copyShareLink=(cls)=>{
    const url=`${window.location.origin}/?code=${cls.code}&class=${encodeURIComponent(cls.name)}`;
    const text=`🎤 KRUDEN Speaking Studio · ผู้ช่วยอัจฉริยะร่างบทพูด & จัดคิวพิธีกร\nคลาส: ${cls.name}\nเครื่องมือ AI ช่วยร่างบทพูดตามโครงสร้าง 5Ps วางซีเคว้นงานพิธีกร และซ้อมพูดจับเวลาบนเวทีจริง สื่อสารมั่นใจและทรงพลัง\nคลิกเข้าใช้งานได้ทันที: ${url}\n(รหัสเข้าห้อง: ${cls.code})`;
    navigator.clipboard.writeText(text).then(()=>{
      onNotify(`คัดลอกข้อความเชิญเข้าคลาส "${cls.name}" เรียบร้อยแล้ว นำไปวางใน LINE ได้เลย`);
    });
  };

  if(!unlocked){
    return <Modal title="🛡️ แผงควบคุมครูเด่น (Admin Authentication)" onClose={onClose}>
      <form className="form-stack" onSubmit={handleUnlock}>
        <div style={{background:'#edf4ea',border:'1px solid #cbe1c7',padding:'16px',borderRadius:'10px',fontSize:'12px',color:'#1f4732'}}>
          <strong>ระบบจัดการรหัสผ่านห้องเรียนสำหรับผู้สอน</strong>
          <p style={{margin:'4px 0 0'}}>
            ส่วนนี้สำหรับครูเด่น มาสเตอร์ฟา ในการออกรหัสผ่านห้องเรียนและสร้างลิงก์เชิญส่งให้ผู้เรียน
          </p>
        </div>
        <label>
          รหัสผ่านผู้ดูแลระบบ (Admin Master Key)
          <input
            required
            type="password"
            maxLength={100}
            value={adminKey}
            onChange={e=>setAdminKey(e.target.value)}
            placeholder="กรอกรหัส Admin ของครูเด่น"
          />
          <small>ความปลอดภัย: เข้าถึงได้เฉพาะผู้ดูแลระบบหลัก (ครูเด่น) เท่านั้น</small>
        </label>
        {authError&&<div style={{background:'#fbeeed',border:'1px solid #e8b8b3',color:'#842a22',padding:'10px 14px',borderRadius:'6px',fontSize:'12px'}}>
          {authError}
        </div>}
        <div className="toolbar" style={{marginTop:'12px',justifyContent:'flex-end'}}>
          <button type="button" className="btn" onClick={onClose}>ยกเลิก</button>
          <button type="submit" className="btn primary" disabled={verifying}>
            {verifying?<Loader2 className="spin" size={16}/>:<ShieldCheck size={16}/>}
            เข้าสู่แผงควบคุม
          </button>
        </div>
      </form>
    </Modal>;
  }

  return <Modal title="🛡️ จัดการรหัสห้องเรียน (ครูเด่น Admin Console)" onClose={onClose}>
    <div className="form-stack">
      {/* Create New Passcode */}
      <div style={{background:'#fcfdfa',border:'1px solid #dbe5d8',borderRadius:'10px',padding:'18px'}}>
        <strong style={{fontSize:'13px',color:'#183f34'}}>✨ ออกรหัสผ่านห้องเรียนใหม่</strong>
        <form onSubmit={handleAddClass} style={{display:'flex',flexDirection:'column',gap:'12px',marginTop:'12px'}}>
          <div className="form-row">
            <label>
              ชื่อรุ่น / ห้องเรียน
              <input
                required
                maxLength={200}
                value={newClassName}
                onChange={e=>setNewClassName(e.target.value)}
                placeholder="เช่น Workshop Public Speaking รุ่นที่ 15"
              />
            </label>
            <label>
              รหัสผ่านห้องเรียน
              <div style={{display:'flex',gap:'6px'}}>
                <input
                  required
                  maxLength={50}
                  value={newClassCode}
                  onChange={e=>setNewClassCode(e.target.value)}
                  placeholder="เช่น KD-MC15"
                  style={{fontWeight:'bold'}}
                />
                <button type="button" className="btn" onClick={generateRandomCode} title="สุ่มรหัสผ่านอัตโนมัติ">
                  สุ่ม
                </button>
              </div>
            </label>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end'}}>
            <button type="submit" className="btn primary">
              <Plus size={16}/> ออกรหัสห้องเรียนนี้
            </button>
          </div>
        </form>
      </div>

      {/* Issued Passcodes List */}
      <div>
        <strong style={{fontSize:'13px',color:'#183f34'}}>📋 คลังรหัสห้องเรียนที่ออกแล้ว ({classes.length})</strong>
        <table className="admin-table">
          <thead>
            <tr>
              <th>รหัสผ่าน</th>
              <th>ชื่อรุ่น / ห้องเรียน</th>
              <th>วันที่ออก</th>
              <th>สถานะ</th>
              <th style={{textAlign:'right'}}>ลิงก์เชิญ & จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {classes.map(c=>(
              <tr key={c.id}>
                <td>
                  <span className="code-pill">{c.code}</span>
                </td>
                <td>
                  <strong>{c.name}</strong>
                </td>
                <td style={{color:'var(--muted)'}}>{c.createdAt||'-'}</td>
                <td>
                  <span style={{
                    display:'inline-block',
                    padding:'2px 8px',
                    borderRadius:'10px',
                    fontSize:'10px',
                    background:c.active?'#edf5ea':'#f5eceb',
                    color:c.active?'#245e3d':'#943a32',
                    fontWeight:600
                  }}>
                    {c.active?'เปิดใช้งาน':'ปิดชั่วคราว'}
                  </span>
                </td>
                <td style={{textAlign:'right'}}>
                  <div className="toolbar" style={{justifyContent:'flex-end'}}>
                    <button
                      type="button"
                      className="btn primary"
                      style={{padding:'4px 10px',fontSize:'11px'}}
                      onClick={()=>copyShareLink(c)}
                      title="คัดลอกข้อความเชิญพร้อมลิงก์นำไปส่งใน LINE"
                    >
                      <Copy size={13}/> คัดลอกลิงก์ส่งนักเรียน
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={()=>toggleClass(c.id)}
                      title={c.active?'คลิกเพื่อปิดการใช้งานชั่วคราว':'คลิกเพื่อเปิดใช้งาน'}
                    >
                      <RotateCcw size={15}/>
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={()=>deleteClass(c.id)}
                      title="ลบรหัสห้องเรียนนี้"
                    >
                      <Trash2 size={15}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="toolbar" style={{justifyContent:'flex-end',marginTop:'14px'}}>
        <button type="button" className="btn" onClick={onClose}>ปิดหน้าต่าง</button>
      </div>
    </div>
  </Modal>;
}

function SettingsModal({settings,onSave,onClose}){
  const [passcode,setPasscode]=useState(settings.passcode||'');
  const [customApiKey,setCustomApiKey]=useState(settings.customApiKey||'');
  return <Modal title="ตั้งค่าการเชื่อมต่อ AI & สิทธิ์ผู้เรียน" onClose={onClose}>
    <form className="form-stack" onSubmit={e=>{
      e.preventDefault();
      onSave({passcode:passcode.trim(),customApiKey:customApiKey.trim()});
    }}>
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

function SourceForm({onSave,onClose}){
  const [title,setTitle]=useState('');
  const [url,setUrl]=useState('');
  const [note,setNote]=useState('');
  const [error,setError]=useState('');
  return <Modal title="เพิ่มแหล่งข้อมูล" onClose={onClose}>
    <form className="form-stack" onSubmit={e=>{
      e.preventDefault();
      if(!safeUrl(url)){setError('ใช้ลิงก์ https:// หรือ http:// เท่านั้น');return;}
      onSave({id:newId(),title,url:safeUrl(url),note,status:'provided'});
    }}>
      <label>ชื่อเอกสารหรือเว็บไซต์<input required maxLength={300} value={title} onChange={e=>setTitle(e.target.value)}/></label>
      <label>ลิงก์<input required type="url" maxLength={2000} value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://..."/></label>
      <label>บันทึก / วันที่ / ข้อจำกัด<textarea rows={4} maxLength={20000} value={note} onChange={e=>setNote(e.target.value)}/></label>
      {error&&<p role="alert" style={{color:'#a64638',fontSize:'12px'}}>{error}</p>}
      <button className="btn primary" type="submit">เพิ่มแหล่งข้อมูล</button>
    </form>
  </Modal>;
}

createRoot(document.getElementById('root')).render(<App/>);
