// Which designs are on show right now. Year-round designs always are; a seasonal design joins
// through its `season` in templates.js and only appears between that season's dates. Every
// design ends up with the same shape: id, label, draw(), and `fields` saying which of the two
// text fields it uses.
import { TEMPLATES } from './templates.js?v=20';

// starts/ends are MM-DD and repeat every year; a window may wrap the new year.
export const SEASONS = [
  { id: 'autumn', label: 'Autumn reading', starts: '09-01', ends: '11-30' },
  { id: 'christmas', label: 'Christmas reading', starts: '11-15', ends: '12-26' },
  { id: 'newyear', label: 'A new chapter', starts: '12-27', ends: '01-14' },
  { id: 'valentines', label: 'Book lovers', starts: '02-01', ends: '02-14' },
];

function inWindow({ starts, ends }, today) {
  return starts <= ends ? today >= starts && today <= ends : today >= starts || today <= ends;
}

function ownTemplate(template) {
  return { ...template, fields: { name: template.named, line2: template.named } };
}

export function loadCatalogue(date = new Date()) {
  const today = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const collections = SEASONS.filter((season) => inWindow(season, today));
  const active = new Set(collections.map((season) => season.id));
  return {
    templates: TEMPLATES.filter((t) => !t.season || active.has(t.season)).map(ownTemplate),
    collections: collections.map(({ id, label }) => ({ id, label })),
  };
}
