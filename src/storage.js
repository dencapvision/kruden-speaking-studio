import {initialState, initialSequences} from './data.js';
import {validateBackup} from './engine.js';

export const STORAGE_KEY = 'kruden-speaking-studio-v1';

export function loadStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { state: initialState, error: null, corrupted: false };
    }
    try {
      const parsed = JSON.parse(raw);
      const validated = validateBackup(parsed);
      return { state: validated, error: null, corrupted: false };
    } catch (parseOrValidationError) {
      console.warn('KRUDEN Studio: Saved state validation failed. Preserving backup.', parseOrValidationError);
      const backupKey = `${STORAGE_KEY}-corrupted-${Date.now()}`;
      try {
        localStorage.setItem(backupKey, raw);
      } catch (storageErr) {
        console.error('Failed to store emergency backup to localStorage', storageErr);
      }
      return {
        state: initialState,
        error: 'ตรวจพบข้อผิดพลาดในข้อมูลที่บันทึกไว้เดิม ระบบได้สำรองข้อมูลฉุกเฉินไว้และโหลดข้อมูลเริ่มต้นเพื่อความปลอดภัย',
        corrupted: true,
        rawBackup: raw,
        backupKey
      };
    }
  } catch (err) {
    console.error('Storage access error:', err);
    return {
      state: initialState,
      error: 'ไม่สามารถเข้าถึง localStorage ได้ ข้อมูลจะไม่ถูกบันทึกอัตโนมัติ',
      corrupted: false
    };
  }
}

export function saveStoredState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return { success: true };
  } catch (err) {
    console.error('Storage save error:', err);
    return {
      success: false,
      error: 'บันทึกในเครื่องไม่สำเร็จ (พื้นที่อาจเต็ม) กรุณาส่งออกไฟล์สำรองก่อนปิดหน้านี้'
    };
  }
}

export function triggerDownload(filename, content, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportBackupJson(data) {
  triggerDownload('kruden-studio-backup.json', JSON.stringify(data, null, 2), 'application/json');
}

export function exportSequenceMarkdown(seq) {
  const lines = [
    `# ${seq.title || 'ซีเคว้นงานพิธีกร'}`,
    `เวที: ${seq.stage || '-'} | เวลารวม: ${seq.totalTime || '-'}`,
    `${seq.description || ''}`,
    '',
    '| ลำดับ | เวลา | ช่วงรายการ | ผู้พูด | คิวเวที & แสงเสียง | บทพูดคีย์เวิร์ด (Dialogue / Cue) |',
    '|---|---|---|---|---|---|'
  ];
  (seq.items || []).forEach((item, idx) => {
    lines.push(`| ${idx + 1} | ${item.time || '-'} | ${item.segment || '-'} | ${item.speaker || '-'} | ${item.cue || '-'} | ${item.dialogue || '-'} |`);
  });
  triggerDownload(`run-of-show-${seq.stage || 'mc'}.md`, lines.join('\n'), 'text/markdown;charset=utf-8');
}

export function exportSlidesMarkdown(slides = []) {
  exportSequenceMarkdown(initialSequences[0]);
}

export const SETTINGS_KEY = 'kruden-speaking-settings-v1';

export function getAiSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { passcode: '', customApiKey: '' };
    const parsed = JSON.parse(raw);
    return {
      passcode: typeof parsed.passcode === 'string' ? parsed.passcode : '',
      customApiKey: typeof parsed.customApiKey === 'string' ? parsed.customApiKey : ''
    };
  } catch {
    return { passcode: '', customApiKey: '' };
  }
}

export function saveAiSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      passcode: settings.passcode ? settings.passcode.trim() : '',
      customApiKey: settings.customApiKey ? settings.customApiKey.trim() : ''
    }));
    return true;
  } catch {
    return false;
  }
}

export const CLASSROOM_SESSION_KEY = 'kruden-classroom-session-v1';
export const ADMIN_PASSCODES_KEY = 'kruden-admin-passcodes-v1';

export function getClassroomSession() {
  try {
    const raw = localStorage.getItem(CLASSROOM_SESSION_KEY);
    if (!raw) return { entered: false, studentName: '', passcode: '', className: '', role: 'guest' };
    const p = JSON.parse(raw);
    return {
      entered: !!p.entered,
      studentName: typeof p.studentName === 'string' ? p.studentName : '',
      passcode: typeof p.passcode === 'string' ? p.passcode : '',
      className: typeof p.className === 'string' ? p.className : '',
      role: p.role === 'admin' ? 'admin' : (p.entered ? 'student' : 'guest')
    };
  } catch {
    return { entered: false, studentName: '', passcode: '', className: '', role: 'guest' };
  }
}

export function saveClassroomSession(session) {
  try {
    localStorage.setItem(CLASSROOM_SESSION_KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

export function clearClassroomSession() {
  try {
    localStorage.removeItem(CLASSROOM_SESSION_KEY);
  } catch {}
}

export const DEFAULT_ADMIN_CLASSES = [
  {
    id: 'class-mc14',
    name: 'Public Speaking & MC Skills รุ่นที่ 14',
    code: 'KD-MC14',
    active: true,
    createdAt: '2026-11-02'
  },
  {
    id: 'class-speak2026',
    name: 'Professional Speaking Masterclass 2026',
    code: 'KD-SPEAK-2026',
    active: true,
    createdAt: '2026-11-01'
  }
];

export function getAdminClasses() {
  try {
    const raw = localStorage.getItem(ADMIN_PASSCODES_KEY);
    if (!raw) return DEFAULT_ADMIN_CLASSES;
    const p = JSON.parse(raw);
    return Array.isArray(p) && p.length ? p : DEFAULT_ADMIN_CLASSES;
  } catch {
    return DEFAULT_ADMIN_CLASSES;
  }
}

export function saveAdminClasses(classes) {
  try {
    localStorage.setItem(ADMIN_PASSCODES_KEY, JSON.stringify(classes));
    return true;
  } catch {
    return false;
  }
}
