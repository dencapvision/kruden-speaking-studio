/* Demo state is intentionally in memory; refreshing clears it. No network calls. */
(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const moodLabels = { good: 'สดใส', calm: 'สงบ', tired: 'เหนื่อย' };
  let toastTimer;
  const journals = [];
  function notify(message) {
    clearTimeout(toastTimer);
    $('#toast').textContent = message;
    $('#toast').hidden = false;
    toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3500);
  }
  function showView(view) {
    $$('[data-page]').forEach(el => { el.hidden = el.dataset.page !== view; });
    $$('[data-view]').forEach(el => {
      if (el.dataset.view === view) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
    $('#main').focus({ preventScroll: true });
  }
  function renderSwatches() {
    const css = getComputedStyle(document.documentElement);
    const roles = [['พื้นหลัง', '--bg'], ['พื้นการ์ด', '--surface'], ['ปุ่มหลัก', '--primary'], ['หมวดสีม่วง', '--lilac']];
    $('#swatches').replaceChildren(...roles.map(([label, token]) => {
      const swatch = document.createElement('div');
      swatch.className = 'swatch';
      swatch.style.backgroundColor = css.getPropertyValue(token).trim();
      const name = document.createElement('span'); name.textContent = label;
      const value = document.createElement('code'); value.textContent = css.getPropertyValue(token).trim().toUpperCase();
      swatch.append(name, value);
      return swatch;
    }));
  }
  $$('[data-theme-value]').forEach(button => button.addEventListener('click', () => {
    document.documentElement.dataset.theme = button.dataset.themeValue;
    $$('[data-theme-value]').forEach(el => el.setAttribute('aria-pressed', String(el === button)));
    $('meta[name="theme-color"]').content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    renderSwatches();
  }));
  $$('[data-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
  $$('[data-open-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.openView)));
  $$('[data-notify]').forEach(button => button.addEventListener('click', () => notify(button.dataset.notify)));
  $('#today').textContent = new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  $('#today').dateTime = new Date().toISOString();
  $('#save-mood').addEventListener('click', () => {
    const selected = $('input[name="mood"]:checked');
    if (!selected) {
      $('#mood-status').textContent = 'เลือกความรู้สึกหนึ่งข้อก่อนบันทึก';
      $('input[name="mood"]').focus();
      return;
    }
    $('#mood-value').textContent = moodLabels[selected.value];
    $('#mood-status').textContent = `บันทึกแล้ว: ${moodLabels[selected.value]} ขอบคุณที่ให้เวลากับตัวเอง`;
  });
  $$('[data-task]').forEach(input => input.addEventListener('change', () => {
    const total = $$('[data-task]').length;
    const done = $$('[data-task]:checked').length;
    $('#task-count').textContent = `${done}/${total}`;
    $('#task-percent').textContent = `${Math.round(done / total * 100)}%`;
    $('.sf-progress').value = done;
  }));
  $$('[data-journal]').forEach(button => button.addEventListener('click', () => {
    $('#journal-dialog-title').textContent = button.dataset.journal;
    $('#journal-text').value = '';
    $('#journal-dialog').showModal();
    $('#journal-text').focus();
  }));
  $('#close-dialog').addEventListener('click', () => $('#journal-dialog').close());
  $('#journal-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!$('#journal-text').value.trim()) {
      $('#journal-text').setCustomValidity('กรุณาเขียนข้อความก่อนบันทึก');
      $('#journal-text').reportValidity();
      return;
    }
    journals.push({title: $('#journal-dialog-title').textContent, text: $('#journal-text').value.trim()});
    $('#journal-count').textContent = journals.length;
    const entry = document.createElement('details'); entry.className = 'sf-card';
    const title = document.createElement('summary'); title.textContent = journals.at(-1).title;
    const text = document.createElement('p'); text.textContent = journals.at(-1).text;
    text.style.whiteSpace = 'pre-wrap'; text.style.overflowWrap = 'anywhere';
    entry.append(title, text);
    $('#journal-entries').hidden = false;
    $('#journal-entries').prepend(entry);
    $('#journal-dialog').close();
    notify('เก็บบันทึกในเดโมแล้ว');
  });
  $('#journal-text').addEventListener('input', () => $('#journal-text').setCustomValidity(''));
  renderSwatches();
})();
