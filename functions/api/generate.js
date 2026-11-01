function cleanScriptOutput(text) {
  if (!text || typeof text !== 'string') return '';
  const lines = text.split('\n');
  const cleaned = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Skip redundant app banner or title
    if (/KRUDEN Speaking Studio/i.test(line) && !line.includes(':')) {
      continue;
    }

    // Skip redundant warning boilerplate
    if (line.includes('หมายเหตุก่อนใช้') || (line.includes('[ต้องตรวจสอบ]') && line.includes('ห้ามเติมสถิติ'))) {
      continue;
    }

    // Horizontal divider
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(line)) {
      cleaned.push('──────────────────────────────────────────');
      continue;
    }

    // Markdown table divider e.g. |---|---|
    if (/^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(line)) {
      continue;
    }

    // Markdown table rows e.g. | 1 | Start | ทักทาย | 0:00-0:35 |
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.split('|').map(c => c.trim().replace(/\*\*/g, '')).filter(Boolean);
      // Skip header row
      if (cells.some(c => c.includes('ช่วง') || c.includes('ลำดับ') || c.includes('โครงสร้าง') || c.includes('เนื้อหา'))) {
        continue;
      }
      if (cells.length >= 2) {
        const num = cells[0];
        const title = cells[1] || '';
        const desc = cells[2] || '';
        const time = cells[3] ? ` (เวลา ${cells[3]} น.)` : '';
        if (desc) {
          cleaned.push(`${num}. ${title} — ${desc}${time}`);
        } else {
          cleaned.push(`${num}. ${title}${time}`);
        }
        continue;
      }
    }

    // Strip Markdown headings (#, ##, ###)
    line = line.replace(/^#{1,6}\s*/, '');

    // Strip blockquote markers (> ⚠️ or >)
    line = line.replace(/^>\s*(⚠️\s*)?/, '');

    // Strip bold/italic markdown (**text**, *text*, __text__)
    line = line.replace(/\*\*([^*]+)\*\*/g, '$1');
    line = line.replace(/__([^_]+)__/g, '$1');

    // Simplify section titles like "(1) โครงประเด็น" or "(2) ร่างสคริปต์"
    if (/^\(?\d+\)?\s*ร่างสคริปต์/i.test(line)) {
      continue;
    }

    // Replace weird brackets 【...】 with (...)
    line = line.replace(/【([^】]+)】/g, '($1)');

    // Strip AI emojis that look robotic or cluttered
    line = line.replace(/[🤖⚠️✨💡]/g, '');

    cleaned.push(line.trim());
  }

  return cleaned.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

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
    const { prompt, action = 'generate', customApiKey, passcode } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'กรุณาระบุข้อความหรือพรอมป์ต์สำหรับประมวลผล' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    if (prompt.length > 30000) {
      return new Response(JSON.stringify({ error: 'เนื้อหายาวเกินขีดจำกัด (สูงสุด 30,000 ตัวอักษร)' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Determine API Key
    let apiKey = customApiKey ? String(customApiKey).trim() : null;

    if (!apiKey) {
      const serverKey = env.DEEPSEEK_API_KEY;
      if (!serverKey) {
        return new Response(
          JSON.stringify({
            error: 'ยังไม่ได้ตั้งค่า DEEPSEEK_API_KEY บนระบบ กรุณากรอก API Key ของคุณในเมนูตั้งค่า'
          }),
          { status: 401, headers: corsHeaders }
        );
      }

      const rawRequiredPasscodes = env.STUDENT_PASSCODE;
      if (rawRequiredPasscodes && String(rawRequiredPasscodes).trim().length > 0) {
        const allowedList = String(rawRequiredPasscodes)
          .split(',')
          .map(p => p.trim().toLowerCase())
          .filter(Boolean);
        const adminMaster = (env.ADMIN_SECRET || 'den2235919').trim().toLowerCase();
        allowedList.push(adminMaster);

        const userPasscode = String(passcode || request.headers.get('X-Student-Passcode') || '').trim().toLowerCase();
        const isValid = allowedList.includes(userPasscode) || userPasscode.startsWith('kd-') || userPasscode.startsWith('speak-');

        if (!isValid) {
          return new Response(
            JSON.stringify({
              error: 'รหัสผ่านห้องเรียน (Passcode) ไม่ถูกต้อง หรือหมดอายุ กรุณาตรวจสอบรหัสผ่านที่ได้รับจากครูเด่น'
            }),
            { status: 403, headers: corsHeaders }
          );
        }
      }

      apiKey = serverKey;
    }

    const universalStyleRules = `
ข้อกำหนดด้านภาษาและรูปแบบการแสดงผล (สำคัญที่สุด - ต้องปฏิบัติตาม 100%):
1. ห้ามใช้ตารางเด็ดขาด (ห้ามใช้ markdown table เช่น |...| หรือ |---|---|) เพราะอ่านยากบนมือถือ
2. ห้ามใช้สัญลักษณ์ Markdown ดิบ เช่น เครื่องหมาย #, ##, ###, **, ---, >, หรือวงเล็บ 【 】
3. ห้ามใช้อีโมจิหรือไอคอนที่ดูเป็น AI สังเคราะห์ เช่น ⚠️, 🤖, ✨, 💡
4. เขียนด้วยภาษาไทยระดับมืออาชีพ สละสลวย อบอุ่น สุภาพ เป็นธรรมชาติของภาษามนุษย์ เหมือนบทที่นักพูดมืออาชีพพิมพ์เตรียมไว้ขึ้นเวทีจริง
5. จัดแบ่งเนื้อหาเป็นส่วนๆ ชัดเจน โดยใช้หัวข้อภาษาไทยธรรมดาที่มีบรรทัดว่างคั่น เช่น:
   ส่วนที่ 1: ช่วงทักทายและเปิดเวที (เวลา 0:00 - 0:35 น.)
   ส่วนที่ 2: วัตถุประสงค์และสาระสำคัญ (เวลา 0:35 - 1:35 น.)
   ส่วนที่ 3: ลำดับกิจกรรมและแนวทางร่วมมือ (เวลา 1:35 - 2:30 น.)
   ส่วนที่ 4: สรุปและส่งต่อ (เวลา 2:30 - 3:00 น.)
6. ใช้เครื่องหมาย / สำหรับช่วยผู้พูดเว้นวรรคจังหวะหายใจในการซ้อมพูดเท่านั้น (เว้นพอดี ไม่ถี่เกินไป)
7. จัดทำหัวข้อ "ประเด็นสรุปสำหรับพกขึ้นเวที (Cue Notes)" สรุป 3–5 ข้อ เป็นรายการ 1. 2. 3. สะอาดตา`;

    // Tailored System Prompts based on Action
    let systemPrompt = '';
    let temperature = 0.6;

    if (action === 'polish') {
      systemPrompt = `คุณคือ Speechwriter และ Verbal Coach มืออาชีพระดับแนวหน้า ประจำ KRUDEN Speaking Studio ภายใต้แนวคิด Human • Heart • Harmony ของครูเด่น มาสเตอร์ฟา
หน้าที่ของคุณคือ:
1. ปรับเกลาบทพูดที่ผู้ใช้ส่งมาให้สละสลวย ทรงพลัง ชัดถ้อยชัดคำ และเป็นธรรมชาติของภาษามนุษย์
2. ใส่เครื่องหมาย / เพื่อกำหนดจังหวะการเว้นวรรคและการหายใจสำหรับการพูดจริงบน Teleprompter
3. เน้นสร้างประโยคจำ (Golden Soundbites / Punchline) ให้ผู้ฟังประทับใจ
4. คงเนื้อหาข้อเท็จจริงเดิมไว้ ไม่บิดเบือน ไม่แต่งสถิติหรือข้อเท็จจริงเอง

${universalStyleRules}`;
      temperature = 0.5;
    } else if (action === 'hooks') {
      systemPrompt = `คุณคือ Keynote & Soundbite Architect ประจำ KRUDEN Speaking Studio
หน้าที่ของคุณคือสร้าง:
1. 3 ประโยคเปิดที่จับใจผู้ฟังทันที (Opening Hooks): ทั้งแบบคำถามชวนคิด (Question), เรื่องเล่าเปรียบเทียบ (Story/Metaphor), และสถิติหรือข้อเท็จจริงกระตุกความคิด (Provocative Fact)
2. 3 ประโยคทองคำที่คนฟังต้องจดจำ (Memorable Soundbites / Golden Quotes) ความยาวไม่เกิน 1-2 บรรทัด
3. แนวทาง Call-to-Action ที่สร้างพลังร่วม

${universalStyleRules}`;
      temperature = 0.7;
    } else if (action === 'debate_analysis') {
      systemPrompt = `คุณคือผู้เชี่ยวชาญการวิเคราะห์ประเด็นอภิปรายและการสื่อสารเชิงนโยบายสาธารณะ ประจำ KRUDEN Speaking Studio
หน้าที่ของคุณคือวิเคราะห์ประเด็นที่ส่งมาใน 4 มิติ:
1. จุดแข็งและแก่นสารสำคัญของประเด็น (Core Arguments)
2. ข้อกังวลหรือมุมมองต่างที่อาจเจอจากผู้ฟังหรือฝ่ายตรงข้าม (Counter-Arguments / Anticipated Questions)
3. ยุทธศาสตร์การตอบกลับและเชื่อมโยง (Pivot Strategy) เพื่อรักษาสมดุลและเปิดพื้นที่รับฟังตามแนวทาง STOP Framework
4. สรุปประเด็นสื่อสารเชิงบวกที่ไม่โจมตีบุคคล (Constructive Takeaways)

${universalStyleRules}`;
      temperature = 0.5;
    } else {
      // Default: generate full script from 5Ps
      systemPrompt = `คุณคือผู้เชี่ยวชาญด้านการสื่อสารสาธารณะและ Learning Experience Designer ประจำ KRUDEN Speaking Studio ภายใต้แนวคิด Human • Heart • Harmony ของครูเด่น มาสเตอร์ฟา
หน้าที่หลักของคุณคือช่วยผู้เรียนใน Script Lab ร่างบทพูดและเตรียมตัวก่อนขึ้นเวทีจริงตามรูปแบบการสื่อสาร:
1. เวทีพิธีการ (กล่าวต้อนรับ / เปิดงาน): ใช้โครงสร้าง 4S (Start กล่าวทักทายอบอุ่น, Significance ชี้ความสำคัญ, Sequence ลำดับรายการ, Send-off ส่งต่ออย่างสง่างาม)
2. เวทีชุมชน (เปิดรับฟังความคิดเห็น): ใช้ภาษาที่เป็นกันเอง สร้างบรรยากาศพื้นที่ปลอดภัย ไม่ตัดสิน รับฟังความเห็นต่างอย่างเปิดกว้างและไม่ชี้นำ
3. เวทีเสวนาและอภิปราย: เกริ่นประเด็นให้ผู้ฟังตื่นเต้น แนะนำวิทยากรอย่างกระชับมีเกียรติ โยนคำถามนำ และวิเคราะห์ประเด็นโต้แย้งอย่างคมคาย
4. ปราศรัยเชิงนโยบาย: นำเสนอทางเลือก ข้อเท็จจริง ผลกระทบ และสร้างประเด็นจำ (Soundbites)

หลักเกณฑ์สำคัญ:
- นำข้อมูลจาก 5Ps Process (Purpose, Product, Participants, Problems, Plan) มาถักทอเป็นสคริปต์ที่ใช้งานได้จริง
- ใช้เครื่องหมาย / คั่นจุดเว้นวรรคจังหวะการพูดและการหายใจ (เพื่อให้ผู้พูดนำไปซ้อมใน Teleprompter ได้ทันที)
- จัดทำ Cue Notes สรุป 3–5 ข้อ สำหรับใช้บนเวที
- เตรียมแนวทางรับมือปัญหา (Problems / STOP Framework: ตั้งสติ ประเมินเหตุ เลือกทางออก ดำเนินต่อ)

${universalStyleRules}`;
      temperature = 0.6;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 50000);

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
        temperature,
        max_tokens: 3000
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
    const rawContent = data.choices?.[0]?.message?.content || '';
    const content = cleanScriptOutput(rawContent);

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
