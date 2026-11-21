// Which designs are on show right now. Year-round designs always are; a seasonal design joins
// through its `season` in templates.js and only appears between that season's dates. Every
// design ends up with the same shape: id, label, draw(), and `fields` saying which of the two
// text fields it uses.
import { TEMPLATES } from './templates.js?v=21';

// starts/ends are MM-DD and repeat every year; a window may wrap the new year.
export const SEASONS = [
  { id: 'autumn', label: 'Autumn reading', starts: '09-01', ends: '11-14' },
  { id: 'christmas', label: 'Christmas reading', starts: '11-15', ends: '12-26' },
  { id: 'yearbooks', label: 'Your year in books', starts: '12-01', ends: '01-14' },
  { id: 'newyear', label: 'A new chapter', starts: '12-27', ends: '01-14' },
  { id: 'valentines', label: 'Book lovers', starts: '02-01', ends: '02-14' },
];

function inWindow({ starts, ends }, today) {
  return starts <= ends ? today >= starts && today <= ends : today >= starts || today <= ends;
}

function ownTemplate(template) {
  return { ...template, fields: template.fields ?? { name: template.named, line2: template.named } };
}

// MM-DD for today. ?date=MM-DD in the address pretends it is another day, to check a season early.
export function siteDay(date = new Date()) {
  const asked = new URLSearchParams(location.search).get('date');
  if (/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(asked ?? '')) return asked;
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function loadCatalogue(date = new Date()) {
  const today = siteDay(date);
  const collections = SEASONS.filter((season) => inWindow(season, today));
  const active = new Set(collections.map((season) => season.id));
  return {
    templates: TEMPLATES.filter((t) => !t.season || active.has(t.season)).map(ownTemplate),
    collections: collections.map(({ id, label }) => ({ id, label })),
  };
}

// Whether a season (by id) is on today, for the festive touches around the site.
export function seasonOn(id) {
  const season = SEASONS.find((s) => s.id === id);
  return Boolean(season) && inWindow(season, siteDay());
}
