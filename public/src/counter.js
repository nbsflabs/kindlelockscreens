// The little counters in the footer (and on the home page): visits and lock screens made.
// Two plain numbers on the server; no cookies, nothing about the visitor is stored.
// A visit is counted once per browser tab session. The maker page fires 'lockscreen-made'.

const SEEN = 'kls-visit-counted';

function show(counts) {
  for (const el of document.querySelectorAll('[data-count]')) {
    const value = counts[el.dataset.count];
    if (!Number.isSafeInteger(value)) continue;
    const text = value.toLocaleString('en-GB');
    if (el.classList.contains('odometer')) {
      // Old-school hit counter: one box per digit, read out as a plain number.
      el.setAttribute('aria-label', text);
      el.replaceChildren(...String(value).padStart(6, '0').split('').map((digit) =>
        Object.assign(document.createElement('span'), { textContent: digit, ariaHidden: 'true' })));
    } else {
      el.textContent = text;
    }
  }
  for (const el of document.querySelectorAll('[data-count-min]')) {
    el.hidden = !(counts.made >= Number(el.dataset.countMin));
  }
  for (const el of document.querySelectorAll('.counter')) el.hidden = false;
}

async function call(path, method = 'GET') {
  try {
    const response = await fetch(path, { method });
    if (response.ok) show(await response.json());
  } catch {
    // The counters are just for fun; the site works the same without them.
  }
}

let firstVisit = false;
try {
  firstVisit = !sessionStorage.getItem(SEEN);
  sessionStorage.setItem(SEEN, '1');
} catch {
  // Private modes without storage: count nothing rather than every page.
}
call(firstVisit ? '/api/visit' : '/api/stats', firstVisit ? 'POST' : 'GET');
addEventListener('lockscreen-made', () => call('/api/made', 'POST'));
