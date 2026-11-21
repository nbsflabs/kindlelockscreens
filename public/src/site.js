// Small touches on every page: the email address (put together here, so bots reading the
// page source don't find it) and Christmas lights (along the top of the page) plus anything marked data-season="<id>".
import { seasonOn } from './catalog.js?v=21';

const address = ['hello', 'kindlelockscreens.com'].join('@');
const SUBJECTS = { idea: 'An idea for Kindle Lock Screens' };
for (const link of document.querySelectorAll('[data-mail]')) {
  const subject = SUBJECTS[link.dataset.mail];
  link.href = `mailto:${address}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
  if (link.dataset.mail === 'show') link.textContent = address;
}

for (const el of document.querySelectorAll('[data-season]')) el.hidden = !seasonOn(el.dataset.season);

if (seasonOn('christmas')) {
  const lights = Object.assign(document.createElement('ul'), { className: 'lights' });
  lights.setAttribute('aria-hidden', 'true');
  function hang() {
    const count = Math.max(8, Math.round(innerWidth / 44));
    lights.replaceChildren(...Array.from({ length: count }, () => document.createElement('li')));
  }
  hang();
  addEventListener('resize', hang);
  document.body.prepend(lights);
}
