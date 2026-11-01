# Validation

ตรวจชุด Soft Focus ใน Chromium headless บน cloud instance นี้:

- ทั้ง 2 ธีม × 3 หน้า × ความกว้าง 320, 390, 768, 1024, 1440px: ไม่มี page horizontal overflow
- เปลี่ยนธีมและเมนูหลักบน desktop/mobile ได้
- ตรวจเลือกความรู้สึกก่อนบันทึกและอัปเดตสรุปได้
- ติ๊กกิจกรรมแล้ว count/percent/progress ตรงกัน
- เขียน/อ่าน journal และปิด dialog ด้วย Escape ได้
- ข้อความที่มี HTML แสดงเป็นข้อความ ไม่ถูก execute
- React Card, Field และ Button render ผ่าน Vite และ click callback ทำงาน; error field เชื่อม aria-invalid
- ไม่พบ JavaScript page errors ใน browser checks
- เดโมรันผ่าน Python static server ได้โดยไม่ใช้ Vite และไม่มี HTTP requests ไปบริการภายนอก
- node --check demo.js ผ่าน
- คู่สี ink/bg, ink/surface, muted/bg, muted/surface, on-primary/primary, ink/lilac, ink/rose, negative/surface ผ่าน contrast >= 4.5:1 ทั้งสองธีม

ขอบเขต: ยังไม่ได้ตรวจใน Safari/Firefox, screen reader หรือโทรศัพท์จริง การเปิด file:// ตรวจไม่ได้เพราะนโยบาย browser ของ cloud instance จึงใช้ static server เป็นเส้นทางที่ยืนยันแล้ว ไม่ใช่การรับรอง WCAG ทั้งระบบ และยังไม่มี backend/persistence หลังรีเฟรช

ไม่ได้แก้ไข source/config ของแอป KRUDEN เดิมในงานนี้ ไม่ได้ deploy หรือเผยแพร่สภาพแวดล้อม
