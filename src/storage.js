import {initialState} from './data.js';
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

export function exportSlidesMarkdown(slides) {
  const md = slides.map((s, i) => `# ${i + 1}. ${s.title}\n${s.subtitle}\n\n${(s.points || []).map(v => `- ${v}`).join('\n')}\n\nเวลา: ${s.time || '-'}\nบันทึกวิทยากร: ${s.notes || '-'}`).join('\n\n---\n\n');
  triggerDownload('kruden-slides.md', md, 'text/markdown;charset=utf-8');
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

