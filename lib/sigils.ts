export const SIGIL_SPRITE_URL = '/sprites/sigil.webp';
export const SIGIL_SPRITE_COLS = 5;
export const SIGIL_SPRITE_ROWS = 8;
export const SIGIL_CELL_ASPECT_RATIO = '273 / 256';

const SIGIL_ORDER: readonly string[] = [
  'stark',     'lannister', 'targaryen', 'baratheon', 'greyjoy',
  'tully',     'arryn',     'martell',   'tyrell',    'bolton',
  'frey',      'mormont',   'umber',     'karstark',  'reed',
  'hightower', 'velaryon',  'tarly',     'blackwood', 'bracken',
  'dayne',     'yronwood',  'royce',     'corbray',   'redwyne',
  'florent',   'rowan',     'oakheart',  'mallister', 'piper',
  'manderly',  'dustin',    'ryswell',   'hornwood',  'cerwyn',
  'swann',     'dondarrion','caron',     'estermont', 'grafton',
];

export interface SigilCell {
  col: number;
  row: number;
}

export function getSigilCell(houseSlug: string): SigilCell | null {
  const index = SIGIL_ORDER.indexOf(houseSlug);
  if (index === -1) return null;
  return {
    col: index % SIGIL_SPRITE_COLS,
    row: Math.floor(index / SIGIL_SPRITE_COLS),
  };
}

export function getSigilBackgroundPosition(cell: SigilCell): string {
  const x = (cell.col / (SIGIL_SPRITE_COLS - 1)) * 100;
  const y = (cell.row / (SIGIL_SPRITE_ROWS - 1)) * 100;
  return `${x}% ${y}%`;
}
