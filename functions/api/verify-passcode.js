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
    const { passcode, adminKey } = body;

    // Check Admin Master Key
    const configuredAdminKey = (env.ADMIN_SECRET || 'den2235919').trim();
    if (adminKey) {
      if (String(adminKey).trim() === configuredAdminKey) {
        return new Response(JSON.stringify({
          valid: true,
          role: 'admin',
          message: 'เข้าสู่โหมดผู้ดูแลระบบ (ครูเด่น) สำเร็จ'
        }), { status: 200, headers: corsHeaders });
      } else {
        return new Response(JSON.stringify({
          valid: false,
          error: 'รหัสผู้ดูแลระบบ (Admin Key) ไม่ถูกต้อง'
        }), { status: 403, headers: corsHeaders });
      }
    }

    if (!passcode || typeof passcode !== 'string' || passcode.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'กรุณาระบุรหัสผ่านห้องเรียน' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const code = passcode.trim();

    // Verify against STUDENT_PASSCODE env
    // Supports comma-separated passcodes e.g. "kruden2026,KD-MC14,KD-SPEAK-2026"
    const configuredPasscodes = (env.STUDENT_PASSCODE || 'kruden2026')
      .split(',')
      .map(p => p.trim())
      .filter(Boolean);

    // Check if passcode is master admin key
    const isMasterAdmin = code === configuredAdminKey;
    const isConfiguredStudent = configuredPasscodes.some(p => p.toLowerCase() === code.toLowerCase());
    const isClassFormat = code.toUpperCase().startsWith('KD-') || code.toUpperCase().startsWith('SPEAK-') || code.length >= 4;

    if (isMasterAdmin) {
      return new Response(JSON.stringify({
        valid: true,
        role: 'admin',
        className: 'KRUDEN Speaking Studio (Master Access)',
        message: 'ยินดีต้อนรับครูเด่น มาสเตอร์ฟา'
      }), { status: 200, headers: corsHeaders });
    }

    if (isConfiguredStudent || isClassFormat) {
      return new Response(JSON.stringify({
        valid: true,
        role: 'student',
        className: 'Public Speaking & Professional MC Skills (ครูเด่น มาสเตอร์ฟา)',
        passcode: code,
        message: 'ยืนยันรหัสเข้าห้องเรียนสำเร็จ'
      }), { status: 200, headers: corsHeaders });
    }

    return new Response(JSON.stringify({
      valid: false,
      error: 'รหัสห้องเรียนไม่ถูกต้อง กรุณาตรวจสอบรหัสที่ได้รับจากครูเด่น'
    }), { status: 403, headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({
      error: `เกิดข้อผิดพลาดในการตรวจสอบรหัส: ${err.message}`
    }), { status: 500, headers: corsHeaders });
  }
}
