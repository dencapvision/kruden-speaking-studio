export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Student-Passcode'
    }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json;charset=utf-8'
  };

  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return new Response(JSON.stringify({ error: 'คำขอต้องเป็น application/json' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const body = await request.json();
    const { prompt, customApiKey, passcode } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'กรุณาระบุพรอมป์ต์สำหรับสร้างบทพูด' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    if (prompt.length > 25000) {
      return new Response(JSON.stringify({ error: 'เนื้อหาพรอมป์ต์ยาวเกินขีดจำกัด (สูงสุด 25,000 ตัวอักษร)' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Determine API Key
    let apiKey = customApiKey ? String(customApiKey).trim() : null;

    if (!apiKey) {
      // Use server-side DEEPSEEK_API_KEY if available
      const serverKey = env.DEEPSEEK_API_KEY;
      if (!serverKey) {
        return new Response(
          JSON.stringify({
            error: 'ยังไม่ได้ตั้งค่า DEEPSEEK_API_KEY บนเซิร์ฟเวอร์ Cloudflare Pages กรุณาใส่ API Key ของคุณในเมนูตั้งค่า'
          }),
          { status: 401, headers: corsHeaders }
        );
      }

      // If server requires a student passcode, verify it
      const requiredPasscode = env.STUDENT_PASSCODE;
      if (requiredPasscode && String(requiredPasscode).trim().length > 0) {
        const userPasscode = passcode || request.headers.get('X-Student-Passcode');
        if (!userPasscode || String(userPasscode).trim() !== String(requiredPasscode).trim()) {
          return new Response(
            JSON.stringify({
              error: 'รหัสผ่านห้องเรียน (Passcode) ไม่ถูกต้อง กรุณากรอกรหัสผ่านที่ได้รับจากครูเด่นในเมนูตั้งค่า'
            }),
            { status: 403, headers: corsHeaders }
          );
        }
      }

      apiKey = serverKey;
    }

    // Call DeepSeek API
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    const systemPrompt = `คุณคือผู้เชี่ยวชาญด้านการสื่อสารสาธารณะและ Learning Experience Designer ประจำ KRUDEN Speaking Studio ภายใต้แนวคิด Human • Heart • Harmony ของครูเด่น มาสเตอร์ฟา
หน้าที่หลักของคุณคือช่วยผู้เรียนใน Script Lab ร่างบทพูดและเตรียมตัวก่อนขึ้นเวทีจริงตาม 3 รูปแบบหลัก:
1. เวทีพิธีการ (กล่าวต้อนรับ / เปิดงาน): ใช้โครงสร้าง 4S (Start กล่าวทักทายอบอุ่น, Significance ชี้ความสำคัญ, Sequence ลำดับรายการ, Send-off ส่งต่ออย่างสง่างาม)
2. เวทีชุมชน (เปิดรับฟังความคิดเห็น): ใช้ภาษาที่เป็นกันเอง สร้างบรรยากาศพื้นที่ปลอดภัย ไม่ตัดสิน รับฟังความเห็นต่างอย่างเปิดกว้างและไม่ชี้นำ
3. เวทีเสวนา (แนะนำผู้พูดและดำเนินรายการ): เกริ่นประเด็นให้ผู้ฟังตื่นเต้น แนะนำวิทยากรอย่างกระชับมีเกียรติ และโยนคำถามนำเปิดมุมมอง

หลักเกณฑ์สำคัญ:
- นำข้อมูลจาก 5Ps Process (Purpose, Product, Participants, Problems, Plan) มาถักทอเป็นสคริปต์ที่ใช้งานได้จริง
- ใช้เครื่องหมาย / คั่นจุดเว้นวรรคจังหวะการพูดและการหายใจ (เพื่อให้ผู้พูดนำไปซ้อมใน Teleprompter ได้ทันที)
- แยกข้อเท็จจริง ข้อเสนอ และสิ่งที่ต้องตรวจสอบให้ชัดเจน ห้ามแต่งตัวเลข สถิติ หรือคำพูดบุคคลเองเด็ดขาด
- จัดทำ Cue Card สรุป 3–5 ข้อ สำหรับใช้บนเวที
- เตรียมแนวทางรับมือปัญหา (Problems / STOP Framework: ตั้งสติ ประเมินเหตุ เลือกทางออก ดำเนินต่อ)`;

    const deepseekResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.6,
        max_tokens: 2500
      }),
      signal: controller.signal
    }).finally(() => clearTimeout(timeout));

    if (!deepseekResponse.ok) {
      const errText = await deepseekResponse.text().catch(() => '');
      let errMsg = 'การเรียกใช้ DeepSeek API ไม่สำเร็จ';
      if (deepseekResponse.status === 401) {
        errMsg = 'DeepSeek API Key ไม่ถูกต้อง หรือหมดอายุ กรุณาตรวจสอบ Key ในระบบ';
      } else if (deepseekResponse.status === 429) {
        errMsg = 'โควตาการใช้งาน DeepSeek API เกินกำหนด หรือมีคำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่';
      } else if (deepseekResponse.status >= 500) {
        errMsg = 'ระบบเซิร์ฟเวอร์ของ DeepSeek ขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง';
      }
      return new Response(JSON.stringify({ error: errMsg, details: errText }), {
        status: deepseekResponse.status,
        headers: corsHeaders
      });
    }

    const data = await deepseekResponse.json();
    const content = data.choices?.[0]?.message?.content || '';

    return new Response(
      JSON.stringify({
        success: true,
        text: content,
        model: data.model || 'deepseek-chat',
        usage: data.usage
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    return new Response(
      JSON.stringify({
        error: isTimeout
          ? 'การเชื่อมต่อ DeepSeek ใช้เวลานานเกินกำหนด (Timeout) กรุณาลองใหม่อีกครั้ง'
          : `เกิดข้อผิดพลาดในการประมวลผล: ${err.message}`
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

