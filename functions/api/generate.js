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

    const systemPrompt = `คุณคือผู้ช่วยเตรียมการสื่อสารสาธารณะและการร่างบทพูดประจำ KRUDEN Speaking Studio ภายใต้แนวคิด Human • Heart • Harmony
หน้าที่ของคุณ:
1. ร่างบทพูดที่กระชับ ตรงประเด็น สื่อสารด้วยความจริงใจและให้เกียรติผู้ฟัง
2. แยกข้อเท็จจริง ข้อเสนอ และประเด็นที่ต้องตรวจสอบอย่างชัดเจน
3. ห้ามเติมตัวเลข สถิติ คำพูดบุคคล หรือข้อกล่าวอ้างที่ไม่มีหลักฐานรองรับในข้อมูลตั้งต้นเด็ดขาด
4. ใช้เครื่องหมาย / เพื่อกำหนดจุดเว้นวรรคจังหวะการพูดและการหายใจ
5. จัดเตรียม Cue Card สรุป 3–5 ข้อ และคำถามทบทวนสำหรับผู้พูด
6. เขียนคำเตือนสั้นๆ ให้ผู้พูดตรวจสอบความถูกต้องและข้อกฎหมายก่อนขึ้นเวทีจริง`;

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
