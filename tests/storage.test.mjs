import test from 'node:test';
import assert from 'node:assert/strict';
import {STORAGE_KEY, loadStoredState, saveStoredState} from '../src/storage.js';
import {initialState} from '../src/data.js';

// Setup mock localStorage in Node.js test environment if not present
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: key => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: key => store.delete(key),
    clear: () => store.clear()
  };
}

test('loadStoredState returns initialState when storage is empty', () => {
  localStorage.clear();
  const res = loadStoredState();
  assert.equal(res.corrupted, false);
  assert.equal(res.error, null);
  assert.equal(res.state.sequences.length, 3);
});

test('saveStoredState and loadStoredState work round-trip', () => {
  localStorage.clear();
  const custom = {
    ...initialState,
    form: { ...initialState.form, topic: 'ทดสอบหัวข้อพิเศษ' }
  };
  const saveRes = saveStoredState(custom);
  assert.equal(saveRes.success, true);

  const loadRes = loadStoredState();
  assert.equal(loadRes.corrupted, false);
  assert.equal(loadRes.state.form.topic, 'ทดสอบหัวข้อพิเศษ');
});

test('loadStoredState preserves corrupted data in emergency key and flags corruption', () => {
  localStorage.clear();
  const brokenData = '{"sequences": "this is not an array"}';
  localStorage.setItem(STORAGE_KEY, brokenData);

  const res = loadStoredState();
  assert.equal(res.corrupted, true);
  assert.ok(res.error.includes('ตรวจพบข้อผิดพลาด'));
  assert.equal(res.state.sequences.length, 3);
  assert.equal(res.rawBackup, brokenData);
});
