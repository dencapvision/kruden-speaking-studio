# Soft Focus — Web App UI Kit 01

ชุดธีมที่ตีความจากภาพอ้างอิงที่ผู้ใช้ให้: พื้นพาสเทล การ์ดสีขาวมุมโค้ง ปุ่มแคปซูล ไอคอนเส้นบาง และเมนูลอยด้านล่าง ใช้หลัก **หนึ่งหน้าจอ หนึ่งเรื่องสำคัญ หนึ่งปุ่มหลัก**

ค่าสีและสัดส่วนเป็นการประมาณจากภาพ ไม่ใช่ design tokens ต้นฉบับ ภาพประกอบ SVG โค้ด และข้อความในชุดนี้สร้างขึ้นใหม่ ไม่มีการแนบภาพอ้างอิง แบรนด์ หรือฟอนต์เชิงพาณิชย์จากต้นฉบับ

## ในชุดมีอะไร

| ไฟล์ | ใช้ทำอะไร |
|---|---|
| `index.html` | เดโม responsive พร้อมหน้าองค์ประกอบและวิธีใช้ |
| `tokens.css` | สี typography spacing radius motion และสองธีม |
| `tokens.json` | ค่าดิบสำหรับนำเข้าเครื่องมือออกแบบหรือแปลงเป็น theme object |
| `components.css` | คลาส `sf-*` ใช้กับทุกเฟรมเวิร์ก |
| `react.jsx` | Button, Card, Field, SegmentedControl และ BottomNav สำหรับ React |
| `demo.css` / `demo.js` | layout และพฤติกรรมเฉพาะเดโม ไม่จำเป็นต้องนำไปใช้ในแอปจริง |

## เปิดเดโม

แนะนำให้เปิดผ่าน static server ตามคำสั่งด้านล่าง ไม่มีแพ็กเกจหรือ API Key ที่ต้องติดตั้ง รันจากโฟลเดอร์นี้:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

จากนั้นเข้า `http://127.0.0.1:8080/index.html` ในเบราว์เซอร์ของเครื่องที่รัน server

ใน repository KRUDEN ที่ใช้ Vite อยู่แล้ว ให้รัน `npm run dev` แล้วเปิด path `/ui-kit/soft-focus/index.html` บน development server ของคุณ ไม่ต้องแก้ entry ของแอปเดิม ชุดนี้ยังไม่ได้เชื่อมเข้ากับ KRUDEN หรือเผยแพร่ไป production

เดโมเปลี่ยนธีมและหน้าจอได้ เลือก/บันทึกความรู้สึก ติ๊กกิจกรรม และเขียน/อ่านบันทึกได้ ข้อมูลเก็บในหน่วยความจำของหน้านี้เท่านั้น **รีเฟรชแล้วหาย** ไม่มี backend หรือ analytics และไม่มีการส่งข้อความไปเซิร์ฟเวอร์

## ทิศทางภาพ

| บทบาท | Sunny | Lavender |
|---|---|---|
| พื้นหลัง | `#F3F0EB` | `#F0E5EF` |
| พื้นการ์ด | `#FFFFFF` | `#FFFFFF` |
| ข้อความหลัก | `#252622` | `#2C2630` |
| ข้อความรอง | `#62635D` | `#695B6A` |
| ปุ่มหลัก | `#FFD05A` | `#EAD5F1` |
| ข้อความบนปุ่ม | `#30280E` | `#382D40` |
| หมวดสีม่วง | `#E5DCF5` | `#E4DAF5` |
| หมวดสีชมพู | `#F4DFDC` | `#F6DFDF` |
| หมวดสีเขียว | `#DEEBDA` | `#D9EFDF` |
| หมวดสีฟ้า | `#DCECF2` | `#D8EEF6` |

**Sunny:** อบอุ่น เป็นกันเอง เหมาะกับบันทึก การเรียนรู้ และกิจกรรมรายวัน ให้เหลืองเป็นปุ่มหลัก/พื้นที่เช็กอิน และใช้การ์ดชมพู–ม่วงสำหรับหมวดรอง

**Lavender:** นุ่มและเรียบ เหมาะกับแดชบอร์ดติดตามกิจกรรม/โภชนาการ เน้นการ์ดขาวและสีแยกหมวด ใช้ข้อความและไอคอนร่วมกับสีเสมอ ไม่ใช้สีแทนสถานะเพียงอย่างเดียว

## Typography และระยะ

- ฟอนต์แนะนำสำหรับไทย: **Noto Sans Thai**; ชุดนี้ใช้ fallback Leelawadee UI / Tahoma / system-ui ไม่มีคำขอฟอนต์ภายนอก หากใช้ Noto ใน production ให้ self-host พร้อมตรวจใบอนุญาตและโหลดเฉพาะน้ำหนักที่ใช้
- ข้อความหลัก 16px, รอง 14px, metadata 12px; หัวข้อหน้าจอ 24–32px, น้ำหนัก 600, line-height 1.4; body line-height 1.65
- Spacing scale: **4 / 8 / 12 / 16 / 20 / 24 / 32 / 40px**
- มุมการ์ด **28px**, input **16px**, ปุ่ม/เมนู **999px**; ภายในการ์ด **24px**
- พื้นที่แตะอย่างน้อย **44×44px**; ไอคอน **20px**, stroke **1.6px**, SVG เส้นโค้งมนชุดเดียวกัน
- ไม่มีเงาบนการ์ดนิ่ง ไม่มีพื้น gradient ไม่มี glass/blur; ใช้สีพื้นแยกชั้น
- transition **160ms** เฉพาะสี/feedback และเคารพ `prefers-reduced-motion`

## ใช้กับ HTML / Vue / เฟรมเวิร์กอื่น

```html
<html lang="th" data-theme="sunny">
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="components.css">

<section class="sf-card sf-card--lilac">
  <h2>เริ่มทีละก้าว</h2>
  <button type="button" class="sf-button">เริ่มฝึก</button>
</section>
```

เปลี่ยนธีมที่ root เท่านั้น: `document.documentElement.dataset.theme = 'lavender'` เพราะ tokens ประกาศด้วย `:root` หากต้องการหลายธีมในหน้าเดียว ให้ปรับ selector ของ tokens ให้ scope ต่อ container ก่อน

`components.css` เป็นองค์ประกอบพื้นฐาน ไม่รวม reset หรือ layout ของแอป ตั้ง `box-sizing: border-box` ให้ทุก element และกำหนด body font/background จาก tokens ในโปรเจกต์ของคุณ ตัวอย่างครบอยู่ใน `demo.css`

## ใช้กับ React + Vite

คัดลอก `tokens.css`, `components.css`, `react.jsx` ไปไว้ในโปรเจกต์ และ import สไตล์ครั้งเดียวใน app entry:

```jsx
import React, {useState} from 'react';
import './tokens.css';
import './components.css';
import {Button, Card, Field, SegmentedControl} from './react.jsx';

export function PracticeCard({onStart}) {
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState('daily');
  return <Card tone="lilac">
    <h2>พร้อมสำหรับเวทีของคุณ</h2>
    <SegmentedControl label="ช่วงเวลา" value={mode} onChange={setMode}
      options={[{value: 'daily', label: 'วันนี้'}, {value: 'weekly', label: 'สัปดาห์นี้'}]}/>
    <Field label="ชื่อบทพูด" value={title} onChange={e => setTitle(e.target.value)}/>
    <Button disabled={!title.trim()} onClick={() => onStart({title, mode})}>
      เริ่มซ้อม
    </Button>
  </Card>;
}
```

ส่ง callback `onStart` จากหน้าหลักเพื่อเชื่อมกับ action ของแอปจริงก่อนใช้งาน `react.jsx` ต้องผ่าน JSX bundler เช่น Vite ใช้ React 18+ เพราะ Field ใช้ `useId` ไม่ใช่สคริปต์เปิดตรงในเบราว์เซอร์

| Component | Props เฉพาะ |
|---|---|
| Button | `variant`: primary / secondary / ghost; props button ปกติ เช่น disabled, onClick, type |
| Card | `tone`: primary / lilac / rose / mint หรือไม่กำหนดเพื่อใช้สีขาว |
| Field | `label`, `hint`, `error` และ props input; error เชื่อมกับ aria-describedby |
| SegmentedControl | `label`, `options: [{value,label}]`, `value`, `onChange` |
| BottomNav | `label`, `items: [{value,label,icon}]`, `value`, `onChange` |

ใช้ controlled state กับ SegmentedControl และ BottomNav; วาง BottomNav ใน shell ของคุณและจัด position/safe area ตาม `demo.css` ตัวคอมโพเนนต์ไม่ได้มี routing ในตัว ส่วนไอคอนส่งเป็น SVG ที่ `aria-hidden="true"`

## Responsive contract

- **320–700px:** หนึ่งคอลัมน์, ขอบ 16px, เมนูล่างลอย 3–5 รายการ มีชื่อกำกับ, เว้นพื้นที่ด้านล่างอย่างน้อย 100px + safe-area
- **701–1000px:** ขอบ 24px, แผงหลัก/แผงสรุปสองคอลัมน์เมื่อเนื้อหาแต่ละด้านยังอ่านได้, เมนูอยู่ด้านบน
- **1001px+:** ขอบ 40px, max-width 1280px, คอลัมน์หลัก:สรุปประมาณ 1.5:1
- การ์ดข้อมูลสั้น 3 ใบในมือถือใช้ได้เมื่อไม่มีข้อความยาว; ถ้าค่าอาจยาวให้เปลี่ยนเป็น 2 คอลัมน์หรือรายการแนวตั้ง

## Accessibility และสถานะ

ใช้ semantic HTML, label จริง, focus-visible 3px, native radio/checkbox/dialog, aria-current สำหรับหน้าปัจจุบัน และ aria-pressed สำหรับตัวเลือกแบบปุ่ม Dialog รองรับ Escape/คืน focus ผ่าน native dialog

คู่สีข้อความหลัก/รองกับพื้นหลักและพื้นการ์ด รวมถึงข้อความบนปุ่ม ถูกออกแบบให้เกิน 4.5:1 อย่าใช้เหลืองหรือพาสเทลเป็นข้อความบนขาว พื้นที่แตะ 44px และ field font 16px เป็นฐาน ต้องตรวจอีกครั้งเมื่อแก้สี/ฟอนต์/ความหนาแน่น หรือเพิ่ม third-party widgets การตรวจด้วย Chromium ไม่ใช่การรับรอง WCAG ทั้งระบบ

เมื่อเชื่อม backend ให้มี:

- Loading: label ชัดเจน เช่น “กำลังบันทึก…” พร้อม `aria-busy` และป้องกัน submit ซ้ำ
- Empty: หนึ่งประโยคอธิบายและหนึ่ง action ให้เริ่มต้น
- Error: ข้อความใต้ field/พื้นที่ที่ล้มเหลว พร้อมวิธีแก้ ไม่ใช้สีอย่างเดียว
- Success: ข้อความใกล้ action หรือ live region ที่ไม่แย่ง focus
- ข้อมูลอ่อนไหว: ออกแบบความยินยอม สิทธิ์เข้าถึง และการเก็บข้อมูลก่อนเพิ่ม persistence

## ปรับใช้กับ KRUDEN

นำ Sunny มาใช้กับการ์ด “เริ่มซ้อมวันนี้”, Lavender กับคลังสไลด์/บทพูด ใช้การ์ดพาสเทลแยก “สไลด์ / เขียนบท / ฝึกพูด” ลดพื้นที่ต้อนรับขนาดใหญ่ และให้แต่ละหน้ามีปุ่มหลักตามงาน เช่น “สร้างพรอมป์ต์” หรือ “เริ่มซ้อม” คงโครงข้อมูลและฟังก์ชันเดิมไว้

ข้อเสนอส่วนนี้เป็นแนวทางเท่านั้น **ชุดนี้ไม่ได้เปลี่ยน UI ของ KRUDEN ที่มีอยู่**
