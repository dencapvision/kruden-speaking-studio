# KRUDEN Speaking Studio

เว็บแอป React + Vite สำหรับสไลด์การอบรม การเตรียมบท การสื่อสารสาธารณะ และการฝึกพูด

## เริ่มใช้งานบนเครื่อง / Antigravity IDE

ใช้ Node.js 22.12 ขึ้นไป หรือ Node.js 20.19 ขึ้นไปในสาย 20

```bash
npm ci
npm run dev
```

เปิด URL ที่ Vite แสดงใน Terminal

```bash
npm test
npm run build
npm run preview
```

## ความสามารถที่ทำงานแล้ว

- สไลด์ 40 หน้าที่จัดรูปแบบใหม่จากเนื้อหา Canva และเสริมคำถามสะท้อนคิดตามหลักสูตร
- ค้นหา กรอง เพิ่ม แก้ไข ลบ และเลื่อนลำดับสไลด์
- โหมดนำเสนอ ใช้ลูกศรซ้าย/ขวา เปลี่ยนหน้า และ Escape เพื่อออก
- พิมพ์สไลด์ทั้งชุด / Save as PDF ผ่านเบราว์เซอร์
- สร้างพรอมป์ต์ 5 แบบ: บทพูดพิธีกร ปราศรัยเชิงนโยบาย อภิปราย รับฟังประชาชน และตอบสื่อ
- เลือกแหล่งข้อมูลแนบพรอมป์ต์ สร้างโครงเติมข้อมูล และส่งออก TXT
- เขียนบท เก็บสำเนาในคลัง และส่งออก Markdown
- Teleprompter ปรับความเร็วและขนาดตัวอักษร จับเวลา ประเมิน 5 ด้าน และส่งออกผลฝึก
- คลังแหล่งข้อมูลที่ผู้ใช้ระบุสถานะตรวจสอบด้วยตนเอง
- สำรองและนำเข้า JSON โดยการนำเข้าจะเพิ่มรายการต่อจากของเดิม
- หน้าจอรองรับมือถือ คีย์บอร์ด และ reduced-motion

## ข้อจำกัดที่ควรทราบ

รุ่นนี้เป็นแอป frontend ที่เก็บข้อมูลด้วย localStorage ในเบราว์เซอร์ ไม่ใช่ฐานข้อมูลออนไลน์ร่วมกัน เปลี่ยนเครื่อง โดเมน หรือเบราว์เซอร์ต้องส่งออก JSON แล้วนำเข้าใหม่ การล้างข้อมูลเบราว์เซอร์ทำให้งานที่ไม่ได้สำรองสูญหายได้

การสร้างพรอมป์ต์และโครงบทใช้แม่แบบ ไม่ได้เรียกใช้โมเดล AI ไม่ต้องมี API Key และไม่ส่งเนื้อหาบทพูดไปยังผู้ให้บริการ AI โดยอัตโนมัติ คัดลอกพรอมป์ต์ไปใช้กับ AI ที่เลือก แล้วนำผลกลับมาวางในพื้นที่เขียนบทได้

แอปอ่านเนื้อหา Canva เพื่อจัดสไลด์ใหม่ ไม่คัดลอกภาพหรือซิงก์การแก้ไขกลับ Canva แหล่งต้นฉบับ: https://canva.link/dt0totlq27yf348

กำหนดการใช้เวลาล่าสุดใน Canva: Voice Lab 25 นาที พัก 15 นาที รวมกิจกรรมทั้งหมด 180 นาที ตัวเลขเก่าในต้นฉบับที่ไม่ตรงกันได้รับการจัดให้สอดคล้องกัน

ฟอนต์ Google Fonts ใช้อินเทอร์เน็ต ถ้าเชื่อมต่อไม่ได้จะใช้ฟอนต์สำรอง การประเมินเกณฑ์ 14/20 เป็นเกณฑ์ฝึก ไม่ใช่การรับรองวิชาชีพ ไม่ตรวจความถูกต้องของข้อเท็จจริงหรือกฎหมายโดยอัตโนมัติ

## Deploy Cloudflare Pages ด้วย Git

1. นำโค้ดเข้า repository ของคุณ
2. ที่ Cloudflare ไป Workers & Pages → Create application → Pages → Import a Git repository
3. เลือก repository และ branch
4. ตั้งค่า Framework preset: React (Vite), Build command: `npm run build`, Build output directory: `dist`
5. ตั้งค่า Node เป็น 22.12 ขึ้นไป หรือรุ่น 22 LTS ล่าสุดที่รองรับ
6. Deploy แล้วเปิด URL `.pages.dev` ที่ Cloudflare คืนให้
7. เพิ่มโดเมนของคุณจากเมนู Custom domains ของโปรเจกต์

โปรเจกต์มี `wrangler.jsonc`, `_redirects` และ `_headers` พร้อมใช้งาน ไม่มี secret ที่ต้องตั้งในรุ่นนี้

## Deploy ด้วยไฟล์ที่ build แล้ว

`dist/` ในชุดดาวน์โหลดคือ output ที่ build แล้ว สามารถอัปโหลดด้วย Cloudflare Pages Direct Upload ได้ ภายใต้โฟลเดอร์นี้ต้องพบ `index.html` และ `assets/` ที่ระดับราก ไม่อัปโหลด source ทั้งโฟลเดอร์แทน dist

หรือใช้ Wrangler ผ่านบัญชี Cloudflare ของคุณ:

```bash
npx wrangler pages deploy dist --project-name kruden-speaking-studio
```

คำสั่งนี้อาจให้สร้าง Pages project หรือเข้าสู่ระบบบัญชีที่ต้องการเผยแพร่ก่อน

## โครงสร้างโค้ด

```
src/data.js        ชุดสไลด์ กำหนดการ แม่แบบโหมด
src/engine.js      สร้างพรอมป์ต์ โครงบท และตรวจ JSON นำเข้า
src/storage.js     จัดการการอ่าน/เขียน localStorage, การสำรองฉุกเฉิน และการส่งออกข้อมูล
src/main.jsx       หน้าจอหลักและการจัดการสถานะ
src/components.jsx สไลด์ ตัวแก้ไข โหมดนำเสนอ ห้องซ้อม
src/styles.css    ธีม responsive และ print stylesheet
functions/api/     Cloudflare Pages Functions สำหรับเชื่อมต่อ DeepSeek AI ฝั่ง Serverless
tests/            ทดสอบตรรกะสำคัญและระบบ Storage
public/           SPA redirects และ HTTP security headers
.env.example      ตัวอย่างการตั้งค่าสภาพแวดล้อมสำหรับต่อยอดในอนาคต
```

## การเปิดใช้งาน DeepSeek AI บน Cloudflare Pages

1. ไปที่ [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → เลือกโปรเจกต์ `kruden-speaking-studio`
2. ไปที่เมนู **Settings** → **Environment variables**
3. เพิ่ม Environment Variable:
   - `DEEPSEEK_API_KEY`: ใส่ DeepSeek API Key ของคุณ (ประเภท Encrypted / Secret)
   - `STUDENT_PASSCODE`: (ตัวเลือก) ตั้งรหัสผ่านห้องเรียนสำหรับผู้เรียน เช่น `kruden2026`
4. เมื่อตั้งค่าแล้ว ผู้เรียนสามารถกรอกรหัสผ่านห้องเรียนเพื่อใช้งาน AI ได้ทันที หรือสามารถนำ DeepSeek API Key ส่วนตัวมากรอกเองในหน้าเว็บ (BYOK) ได้เช่นกัน

## แนวทางต่อยอด

หากต้องการ AI ในเว็บ ให้เพิ่ม Pages Functions หรือ Worker ที่ถือ API Key ฝั่งเซิร์ฟเวอร์ พร้อมยืนยันตัวตน จำกัดอัตราคำขอและขนาดเนื้อหา ไม่ใส่ secret ใน `VITE_*` เพราะจะถูกส่งไปยัง frontend

หากต้องการใช้ร่วมกันหลายคน ให้เพิ่ม authentication และฐานข้อมูล (เช่น Supabase หรือ D1) โดยบังคับสิทธิ์เจ้าของข้อมูลก่อนเก็บบทพูด แหล่งข้อมูล หรือไฟล์แนบ เริ่มจาก import/export ที่มีอยู่เพื่อย้ายข้อมูลเดิม

พรอมป์ต์สาธารณะออกแบบเพื่อให้ความรู้ อธิบายผลกระทบและทางเลือก รับฟังความคิดเห็น และตอบข้อมูลตรงประเด็น ไม่ใช้ข้อมูลส่วนบุคคลหรือข้อมูลอ่อนไหวเพื่อชักจูงทางการเมืองแบบเจาะกลุ่ม

## เอกสารทางการที่ตรวจประกอบ

- https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/
- https://developers.cloudflare.com/pages/configuration/build-configuration/
- https://v7.vite.dev/guide/

ตรวจเมื่อ 1 พฤศจิกายน 2569
