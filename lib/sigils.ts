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

export function hasSigil(houseSlug: string): boolean {
  return SIGIL_ORDER.includes(houseSlug);
}

export function getSigilSrc(houseSlug: string): string {
  return `/sprites/sigils/${houseSlug}.webp`;
}
