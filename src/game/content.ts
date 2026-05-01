import type { Category, Choice, GameSettings, Level } from './types'

export const PATAH = '\u05B7'
export const QAMATS = '\u05B8'
export const HIRIQ = '\u05B4'
export const TSERE = '\u05B5'
export const SEGOL = '\u05B6'
export const HOLAM = '\u05B9'
export const QUBUTS = '\u05BB'
export const DAGESH = '\u05BC'

export type VowelId =
  | 'patah'
  | 'qamats'
  | 'hiriq'
  | 'tsere'
  | 'segol'
  | 'holam'
  | 'qubuts'
  | 'shuruk'

type LevelDraft = Omit<Level, 'categoryTitle' | 'order'>
type CategoryId =
  | 'letters'
  | 'final-letters'
  | 'patah-qamats'
  | 'hiriq'
  | 'tsere-segol'
  | 'holam'
  | 'qubuts-shuruk'
  | 'mixed-a-i-e'
  | 'mixed-o-u'
  | 'first-reading'
type WordPart = { letter: string; vowel?: VowelId }
type VowelPart = { letter: string; vowel: VowelId }
type WordBankEntry = {
  word: string
  parts: readonly WordPart[]
  distractors: readonly VowelPart[]
}

export const DEFAULT_SETTINGS: GameSettings = {
  muted: false,
  volume: 0.72,
  reducedMotion:
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
  voiceIntensity: 'jumpy',
  successFanfare: 'sparkle',
}

export const CATEGORIES: Category[] = [
  {
    id: 'letters',
    title: 'אותיות',
    description: 'מזהים אותיות ומרכיבים מילים ראשונות בלי ניקוד.',
    order: 1,
    color: '#3466d9',
  },
  {
    id: 'final-letters',
    title: 'אותיות סופיות',
    description: 'מזהים את הצורות הסופיות בתוך מילים קצרות.',
    order: 2,
    color: '#1fa2a6',
  },
  {
    id: 'patah-qamats',
    title: 'פתח וקמץ',
    description: 'שני סימני ניקוד שונים שנשמעים כמו a.',
    order: 3,
    color: '#d77936',
  },
  {
    id: 'hiriq',
    title: 'חיריק',
    description: 'קוראים צלילי i קצרים ומילים עם חיריק.',
    order: 4,
    color: '#4fbf67',
  },
  {
    id: 'tsere-segol',
    title: 'צירה וסגול',
    description: 'מתרגלים שני סימני e במילים ובצירופים.',
    order: 5,
    color: '#d64f8c',
  },
  {
    id: 'holam',
    title: 'חולם',
    description: 'מזהים צלילי o בצירופים ובמילים.',
    order: 6,
    color: '#7a5be8',
  },
  {
    id: 'qubuts-shuruk',
    title: 'קובוץ ושורוק',
    description: 'מבחינים בין שני סימני u ומרכיבים מילים.',
    order: 7,
    color: '#d6a81f',
  },
  {
    id: 'mixed-a-i-e',
    title: 'ערבוב a i e',
    description: 'חוזרים על פתח, קמץ, חיריק, צירה וסגול.',
    order: 8,
    color: '#df5b61',
  },
  {
    id: 'mixed-o-u',
    title: 'ערבוב o u',
    description: 'חוזרים על חולם, קובוץ ושורוק.',
    order: 9,
    color: '#5c7f3d',
  },
  {
    id: 'first-reading',
    title: 'קריאה ראשונה',
    description: 'קוראים מילים קצרות מכל סימני הניקוד שנלמדו.',
    order: 10,
    color: '#8a5a44',
  },
]

const palette = [
  '#4fbf67',
  '#3466d9',
  '#d77936',
  '#d6a81f',
  '#df5b61',
  '#1fa2a6',
  '#7a5be8',
  '#d64f8c',
]

export const LETTER_SEQUENCE = [
  'א',
  'ב',
  'י',
  'ת',
  'ד',
  'ג',
  'מ',
  'ח',
  'ל',
  'ה',
  'ו',
  'ז',
  'ט',
  'כ',
  'נ',
  'ס',
  'ע',
  'פ',
  'צ',
  'ק',
  'ר',
  'ש',
  'ך',
  'ם',
  'ן',
  'ף',
  'ץ',
] as const

export const FINAL_LETTER_SEQUENCE = [
  'ך',
  'ם',
  'ן',
  'ף',
  'ץ',
  'ך',
  'ם',
  'ן',
  'ף',
  'ץ',
  'ך',
  'ם',
  'ן',
  'ף',
  'ץ',
  'ך',
  'ם',
  'ן',
] as const

export const VOWEL_UNITS: ReadonlyArray<{
  id: VowelId
  mark: string
  title: string
}> = [
  { id: 'patah', mark: PATAH, title: 'פתח' },
  { id: 'qamats', mark: QAMATS, title: 'קמץ' },
  { id: 'hiriq', mark: HIRIQ, title: 'חיריק' },
  { id: 'tsere', mark: TSERE, title: 'צירה' },
  { id: 'segol', mark: SEGOL, title: 'סגול' },
  { id: 'holam', mark: HOLAM, title: 'חולם' },
  { id: 'qubuts', mark: QUBUTS, title: 'קובוץ' },
  { id: 'shuruk', mark: `ו${DAGESH}`, title: 'שורוק' },
]

const letterSlugs: Record<string, string> = {
  א: 'alef',
  ב: 'bet',
  ג: 'gimel',
  ד: 'dalet',
  ה: 'he',
  ו: 'vav',
  ז: 'zayin',
  ח: 'het',
  ט: 'tet',
  י: 'yod',
  כ: 'kaf',
  ך: 'final-kaf',
  ל: 'lamed',
  מ: 'mem',
  ם: 'final-mem',
  נ: 'nun',
  ן: 'final-nun',
  ס: 'samekh',
  ע: 'ayin',
  פ: 'pe',
  ף: 'final-pe',
  צ: 'tsadi',
  ץ: 'final-tsadi',
  ק: 'qof',
  ר: 'resh',
  ש: 'shin',
  ת: 'tav',
}

const wordSlugs: Record<string, string> = {
  בית: 'bayit',
  ים: 'yam',
  דג: 'dag',
  יד: 'yad',
  פה: 'peh',
  אור: 'or',
  חלב: 'halav',
  נר: 'ner',
  כוס: 'kos',
  ספר: 'sefer',
  כדור: 'kadur',
  תפוח: 'tapuah',
  ילד: 'yeled',
  ספה: 'sapa',
  טיל: 'til',
  ראש: 'rosh',
  גן: 'gan',
  אף: 'af',
  עץ: 'ets',
  מלך: 'melekh',
  כנף: 'kanaf',
  סוף: 'sof',
  קיץ: 'kayits',
  רך: 'rakh',
  שיר: 'shir',
  סיר: 'sir',
  ניר: 'nir',
  גיל: 'gil',
  פיל: 'pil',
  חץ: 'hets',
  גשם: 'geshem',
  חם: 'hom',
  דור: 'dor',
  שור: 'shor',
  סוס: 'sus',
  שוק: 'shuk',
  חוט: 'hut',
  צור: 'tsur',
  חָלָב: 'halav-qamats',
  דַג: 'dag-patah',
  גַן: 'gan-patah',
  יָד: 'yad-qamats',
}

const vowelMarks: Record<VowelId, string> = {
  patah: PATAH,
  qamats: QAMATS,
  hiriq: HIRIQ,
  tsere: TSERE,
  segol: SEGOL,
  holam: HOLAM,
  qubuts: QUBUTS,
  shuruk: `ו${DAGESH}`,
}

export const WORD_BANKS: Record<CategoryId, readonly WordBankEntry[]> = {
  letters: [],
  'final-letters': [],
  'patah-qamats': [
    {
      word: 'חָלָב',
      parts: [
        { letter: 'ח', vowel: 'qamats' },
        { letter: 'ל', vowel: 'qamats' },
        { letter: 'ב' },
      ],
      distractors: [{ letter: 'מ', vowel: 'patah' }],
    },
    {
      word: 'דַג',
      parts: [
        { letter: 'ד', vowel: 'patah' },
        { letter: 'ג' },
      ],
      distractors: [{ letter: 'ב', vowel: 'patah' }],
    },
    {
      word: 'גַן',
      parts: [
        { letter: 'ג', vowel: 'patah' },
        { letter: 'ן' },
      ],
      distractors: [{ letter: 'ד', vowel: 'patah' }],
    },
    {
      word: 'יָד',
      parts: [
        { letter: 'י', vowel: 'qamats' },
        { letter: 'ד' },
      ],
      distractors: [{ letter: 'ל', vowel: 'qamats' }],
    },
  ],
  hiriq: [
    { word: 'שִיר', parts: [{ letter: 'ש', vowel: 'hiriq' }, { letter: 'י' }, { letter: 'ר' }], distractors: [{ letter: 'ס', vowel: 'hiriq' }] },
    { word: 'סִיר', parts: [{ letter: 'ס', vowel: 'hiriq' }, { letter: 'י' }, { letter: 'ר' }], distractors: [{ letter: 'ש', vowel: 'hiriq' }] },
    { word: 'נִיר', parts: [{ letter: 'נ', vowel: 'hiriq' }, { letter: 'י' }, { letter: 'ר' }], distractors: [{ letter: 'ג', vowel: 'hiriq' }] },
    { word: 'גִיל', parts: [{ letter: 'ג', vowel: 'hiriq' }, { letter: 'י' }, { letter: 'ל' }], distractors: [{ letter: 'ט', vowel: 'hiriq' }] },
    { word: 'טִיל', parts: [{ letter: 'ט', vowel: 'hiriq' }, { letter: 'י' }, { letter: 'ל' }], distractors: [{ letter: 'פ', vowel: 'hiriq' }] },
    { word: 'פִיל', parts: [{ letter: 'פ', vowel: 'hiriq' }, { letter: 'י' }, { letter: 'ל' }], distractors: [{ letter: 'ט', vowel: 'hiriq' }] },
  ],
  'tsere-segol': [
    { word: 'נֵר', parts: [{ letter: 'נ', vowel: 'tsere' }, { letter: 'ר' }], distractors: [{ letter: 'ס', vowel: 'segol' }] },
    { word: 'סֵפֶר', parts: [{ letter: 'ס', vowel: 'tsere' }, { letter: 'פ', vowel: 'segol' }, { letter: 'ר' }], distractors: [{ letter: 'י', vowel: 'segol' }] },
    { word: 'יֶלֶד', parts: [{ letter: 'י', vowel: 'segol' }, { letter: 'ל', vowel: 'segol' }, { letter: 'ד' }], distractors: [{ letter: 'נ', vowel: 'tsere' }] },
    { word: 'עֵץ', parts: [{ letter: 'ע', vowel: 'tsere' }, { letter: 'ץ' }], distractors: [{ letter: 'ח', vowel: 'segol' }] },
    { word: 'פֶה', parts: [{ letter: 'פ', vowel: 'segol' }, { letter: 'ה' }], distractors: [{ letter: 'ב', vowel: 'tsere' }] },
    { word: 'בֵית', parts: [{ letter: 'ב', vowel: 'tsere' }, { letter: 'י' }, { letter: 'ת' }], distractors: [{ letter: 'מ', vowel: 'segol' }] },
    { word: 'חֵץ', parts: [{ letter: 'ח', vowel: 'tsere' }, { letter: 'ץ' }], distractors: [{ letter: 'צ', vowel: 'segol' }] },
    { word: 'גֶשֶם', parts: [{ letter: 'ג', vowel: 'segol' }, { letter: 'ש', vowel: 'segol' }, { letter: 'ם' }], distractors: [{ letter: 'ס', vowel: 'tsere' }] },
  ],
  holam: [
    { word: 'אֹר', parts: [{ letter: 'א', vowel: 'holam' }, { letter: 'ר' }], distractors: [{ letter: 'ד', vowel: 'holam' }] },
    { word: 'דֹר', parts: [{ letter: 'ד', vowel: 'holam' }, { letter: 'ר' }], distractors: [{ letter: 'ר', vowel: 'holam' }] },
    { word: 'חֹם', parts: [{ letter: 'ח', vowel: 'holam' }, { letter: 'ם' }], distractors: [{ letter: 'כ', vowel: 'holam' }] },
    { word: 'כֹס', parts: [{ letter: 'כ', vowel: 'holam' }, { letter: 'ס' }], distractors: [{ letter: 'ק', vowel: 'holam' }] },
    { word: 'רֹאש', parts: [{ letter: 'ר', vowel: 'holam' }, { letter: 'א' }, { letter: 'ש' }], distractors: [{ letter: 'ש', vowel: 'holam' }] },
    { word: 'שֹר', parts: [{ letter: 'ש', vowel: 'holam' }, { letter: 'ר' }], distractors: [{ letter: 'ח', vowel: 'holam' }] },
  ],
  'qubuts-shuruk': [
    { word: 'סֻס', parts: [{ letter: 'ס', vowel: 'qubuts' }, { letter: 'ס' }], distractors: [{ letter: 'ש', vowel: 'shuruk' }] },
    { word: 'שֻק', parts: [{ letter: 'ש', vowel: 'qubuts' }, { letter: 'ק' }], distractors: [{ letter: 'ס', vowel: 'qubuts' }] },
    { word: 'גֻל', parts: [{ letter: 'ג', vowel: 'qubuts' }, { letter: 'ל' }], distractors: [{ letter: 'ד', vowel: 'shuruk' }] },
    { word: 'בֻל', parts: [{ letter: 'ב', vowel: 'qubuts' }, { letter: 'ל' }], distractors: [{ letter: 'ג', vowel: 'qubuts' }] },
    { word: 'שוּק', parts: [{ letter: 'ש', vowel: 'shuruk' }, { letter: 'ק' }], distractors: [{ letter: 'ס', vowel: 'qubuts' }] },
    { word: 'חוּט', parts: [{ letter: 'ח', vowel: 'shuruk' }, { letter: 'ט' }], distractors: [{ letter: 'ש', vowel: 'shuruk' }] },
    { word: 'צוּר', parts: [{ letter: 'צ', vowel: 'shuruk' }, { letter: 'ר' }], distractors: [{ letter: 'ח', vowel: 'shuruk' }] },
    { word: 'דוּד', parts: [{ letter: 'ד', vowel: 'shuruk' }, { letter: 'ד' }], distractors: [{ letter: 'ב', vowel: 'qubuts' }] },
  ],
  'mixed-a-i-e': [],
  'mixed-o-u': [],
  'first-reading': [],
}

export const REVIEW_SETS: Record<string, readonly VowelPart[]> = {
  'mixed-a-i-e': [
    { letter: 'ב', vowel: 'patah' },
    { letter: 'מ', vowel: 'qamats' },
    { letter: 'ש', vowel: 'hiriq' },
    { letter: 'נ', vowel: 'tsere' },
    { letter: 'י', vowel: 'segol' },
    { letter: 'ד', vowel: 'patah' },
    { letter: 'ג', vowel: 'qamats' },
    { letter: 'ס', vowel: 'hiriq' },
    { letter: 'ע', vowel: 'tsere' },
    { letter: 'פ', vowel: 'segol' },
    { letter: 'ח', vowel: 'patah' },
    { letter: 'ל', vowel: 'qamats' },
  ],
  'mixed-o-u': [
    { letter: 'א', vowel: 'holam' },
    { letter: 'ד', vowel: 'holam' },
    { letter: 'ס', vowel: 'qubuts' },
    { letter: 'ש', vowel: 'shuruk' },
    { letter: 'ח', vowel: 'shuruk' },
    { letter: 'ר', vowel: 'holam' },
    { letter: 'ג', vowel: 'qubuts' },
    { letter: 'צ', vowel: 'shuruk' },
    { letter: 'כ', vowel: 'holam' },
    { letter: 'ב', vowel: 'qubuts' },
  ],
}

function colorFor(text: string) {
  const seed = [...text].reduce((total, char) => total + char.charCodeAt(0), 0)
  return palette[seed % palette.length]
}

function slugForLetter(letter: string) {
  return letterSlugs[stripNikkud(letter)] ?? `letter-${letter.codePointAt(0)?.toString(16) ?? 'unknown'}`
}

function slugForWord(word: string) {
  return wordSlugs[word] ?? wordSlugs[stripNikkud(word)] ?? [...stripNikkud(word)].map(slugForLetter).join('-')
}

function categoryById(categoryId: string) {
  const category = CATEGORIES.find((candidate) => candidate.id === categoryId)
  if (!category) throw new Error(`Unknown category ${categoryId}`)
  return category
}

export function stripNikkud(text: string) {
  return text.replace(/[\u0591-\u05C7]/g, '')
}

export function makeSyllable(letter: string, vowel: VowelId) {
  const text = vowel === 'shuruk' ? `${letter}${vowelMarks.shuruk}` : `${letter}${vowelMarks[vowel]}`

  return {
    id: `syllable-${slugForLetter(letter)}-${vowel}`,
    text,
    soundId: `he_syllable_${slugForLetter(letter)}_${vowel}`,
    vowel,
  }
}

function letterChoice(letter: string): Choice {
  return {
    id: letter,
    text: letter,
    soundId: `he_letter_${slugForLetter(letter)}`,
    color: colorFor(letter),
    kind: 'letter',
  }
}

function syllableChoice(letter: string, vowel: VowelId): Choice {
  const syllable = makeSyllable(letter, vowel)
  return {
    id: syllable.id,
    text: syllable.text,
    soundId: syllable.soundId,
    color: colorFor(syllable.text),
    kind: 'syllable',
  }
}

function wordChoice(word: string): Choice {
  return {
    id: word,
    text: word,
    soundId: `he_word_${slugForWord(word)}`,
    color: colorFor(word),
    kind: 'word',
  }
}

function withCategory(draft: LevelDraft): Level {
  const category = categoryById(draft.categoryId)
  return {
    ...draft,
    categoryTitle: category.title,
    order: 0,
  }
}

function idForWordLevel(word: string, kind: string, categoryId: CategoryId) {
  const base = `${slugForWord(word)}-${kind}`
  return categoryId === 'letters' || categoryId === 'patah-qamats' ? base : `${categoryId}-${base}`
}

function makeLetterLevel(letter: string, distractors: string[], categoryId: CategoryId = 'letters', suffix?: string): LevelDraft {
  const id = suffix ? `letter-${slugForLetter(letter)}-${suffix}` : `letter-${slugForLetter(letter)}`

  return {
    id,
    title: `האות ${letter}`,
    categoryId,
    levelKind: 'letter-match',
    difficulty: 'letters',
    promptText: `גררו את ${letter} למקום שלה.`,
    target: {
      display: letter,
      slots: [
        {
          id: `slot-${id}`,
          text: letter,
          accepts: [letter],
          soundId: `he_letter_${slugForLetter(letter)}`,
        },
      ],
    },
    choices: [letter, ...distractors].map(letterChoice),
    completionAudioId: `he_letter_${slugForLetter(letter)}`,
  }
}

function makeMissingWordLevel(
  word: string,
  missingIndex: number,
  distractors: string[],
  categoryId: CategoryId = 'letters',
): LevelDraft {
  const letters = [...word]
  const missing = letters[missingIndex]

  return {
    id: idForWordLevel(word, `missing-${slugForLetter(missing)}`, categoryId),
    title: `השלימו ${word}`,
    categoryId,
    levelKind: 'missing-letter',
    difficulty: 'missing-letter',
    promptText: `איזו אות חסרה במילה ${word}?`,
    target: {
      display: word,
      slots: letters.map((letter, index) => ({
        id: `${idForWordLevel(word, 'slot', categoryId)}-${index}-${slugForLetter(letter)}`,
        text: letter,
        accepts: [letter],
        soundId: `he_letter_${slugForLetter(letter)}`,
        fixed: index !== missingIndex,
      })),
    },
    choices: [missing, ...distractors].map(letterChoice),
    completionAudioId: `he_word_${slugForWord(word)}`,
  }
}

function makeFullWordLevel(word: string, order?: string[], categoryId: CategoryId = 'letters'): LevelDraft {
  const letters = [...word]
  const choices = order ?? [...new Set(letters)].reverse()

  return {
    id: idForWordLevel(word, 'full', categoryId),
    title: `בונים ${word}`,
    categoryId,
    levelKind: 'word-build',
    difficulty: 'cvc-word',
    promptText: `גררו את האותיות למילה ${word}.`,
    target: {
      display: word,
      slots: letters.map((letter, index) => ({
        id: `${idForWordLevel(word, 'slot', categoryId)}-${index}-${slugForLetter(letter)}`,
        text: letter,
        accepts: [letter],
        soundId: `he_letter_${slugForLetter(letter)}`,
      })),
    },
    choices: choices.map(letterChoice),
    completionAudioId: `he_word_${slugForWord(word)}`,
  }
}

function makeSightWordLevel(word: string, distractor: string, categoryId: CategoryId = 'letters'): LevelDraft {
  return {
    id: idForWordLevel(word, 'sight', categoryId),
    title: `המילה ${word}`,
    categoryId,
    levelKind: 'word-match',
    difficulty: 'sight-word',
    promptText: `התאימו את המילה ${word}.`,
    target: {
      display: word,
      slots: [
        {
          id: `${idForWordLevel(word, 'word', categoryId)}`,
          text: word,
          accepts: [word],
          soundId: `he_word_${slugForWord(word)}`,
        },
      ],
    },
    choices: [word, distractor].map(wordChoice),
    completionAudioId: `he_word_${slugForWord(word)}`,
  }
}

function makeSyllableLevel(
  letter: string,
  vowel: VowelId,
  distractors: readonly VowelPart[],
  categoryId: CategoryId,
): LevelDraft {
  const syllable = makeSyllable(letter, vowel)
  const levelId = categoryId === 'patah-qamats' ? `${syllable.id}-match` : `${categoryId}-${syllable.id}-match`

  return {
    id: levelId,
    title: `${syllable.text}`,
    categoryId,
    levelKind: 'syllable-match',
    difficulty: 'syllable',
    promptText: `גררו את ${syllable.text} ושמעו את הצליל.`,
    target: {
      display: syllable.text,
      slots: [
        {
          id: `slot-${levelId}`,
          text: syllable.text,
          accepts: [syllable.id],
          soundId: syllable.soundId,
        },
      ],
    },
    choices: [syllableChoice(letter, vowel), ...distractors.map((part) => syllableChoice(part.letter, part.vowel))],
    completionAudioId: syllable.soundId,
  }
}

function makeNikkudWordLevel(entry: WordBankEntry, categoryId: CategoryId): LevelDraft {
  const choices = [
    ...entry.parts
      .filter((part): part is VowelPart => Boolean(part.vowel))
      .map((part) => syllableChoice(part.letter, part.vowel)),
    ...entry.distractors.map((part) => syllableChoice(part.letter, part.vowel)),
  ]

  return {
    id: idForWordLevel(entry.word, 'nikkud', categoryId),
    title: `בונים ${entry.word}`,
    categoryId,
    levelKind: 'nikkud-word-build',
    difficulty: 'nikkud-word',
    promptText: `גררו את הצירופים המנוקדים למילה ${entry.word}.`,
    target: {
      display: entry.word,
      slots: entry.parts.map((part, index) => {
        if (!part.vowel) {
          const letterId = `${idForWordLevel(entry.word, 'slot', categoryId)}-${index}-${slugForLetter(part.letter)}`
          return {
            id: letterId,
            text: part.letter,
            accepts: [part.letter],
            soundId: `he_letter_${slugForLetter(part.letter)}`,
            fixed: true,
          }
        }

        const syllable = makeSyllable(part.letter, part.vowel)
        return {
          id: `${idForWordLevel(entry.word, 'slot', categoryId)}-${index}-${syllable.id}`,
          text: syllable.text,
          accepts: [syllable.id],
          soundId: syllable.soundId,
        }
      }),
    },
    choices,
    completionAudioId: `he_word_${slugForWord(entry.word)}`,
  }
}

function distractorsFor(unit: VowelPart, units: readonly VowelPart[], index: number): VowelPart[] {
  const targetId = makeSyllable(unit.letter, unit.vowel).id
  const candidates = [
    units[(index + 1) % units.length],
    units.find((candidate) => candidate.letter === unit.letter && candidate.vowel !== unit.vowel),
    units[(index + 2) % units.length],
    units[(index + 3) % units.length],
  ].filter((candidate): candidate is VowelPart => Boolean(candidate))
  const selected: VowelPart[] = []
  const selectedIds = new Set([targetId])

  for (const candidate of candidates) {
    const candidateId = makeSyllable(candidate.letter, candidate.vowel).id
    if (selectedIds.has(candidateId)) continue
    selectedIds.add(candidateId)
    selected.push(candidate)
    if (selected.length === 2) break
  }

  return selected
}

function makeSyllableSeries(categoryId: CategoryId, units: readonly VowelPart[]) {
  return units.map((unit, index) => makeSyllableLevel(unit.letter, unit.vowel, distractorsFor(unit, units, index), categoryId))
}

const letterLevels: LevelDraft[] = [
  makeLetterLevel('א', ['ב']),
  makeLetterLevel('ב', ['מ']),
  makeLetterLevel('י', ['ו']),
  makeLetterLevel('ת', ['ד']),
  makeMissingWordLevel('בית', 1, ['א', 'מ']),
  makeFullWordLevel('בית', ['ב', 'י', 'ת']),
  makeLetterLevel('ד', ['ר']),
  makeLetterLevel('ג', ['ז']),
  makeFullWordLevel('דג', ['ד', 'ג']),
  makeLetterLevel('מ', ['נ']),
  makeFullWordLevel('ים', ['י', 'ם']),
  makeLetterLevel('ח', ['כ']),
  makeLetterLevel('ל', ['י']),
  makeFullWordLevel('חלב', ['ח', 'ל', 'ב']),
  makeSightWordLevel('בית', 'דג'),
  makeSightWordLevel('דג', 'ים'),
  makeLetterLevel('ה', ['ח']),
  makeLetterLevel('ו', ['י']),
  makeLetterLevel('ז', ['ג']),
  makeLetterLevel('ט', ['ת']),
  makeLetterLevel('כ', ['ח']),
  makeLetterLevel('נ', ['מ']),
  makeLetterLevel('ס', ['ם']),
  makeLetterLevel('ע', ['א']),
  makeLetterLevel('פ', ['ב']),
  makeLetterLevel('צ', ['ץ']),
  makeLetterLevel('ק', ['כ']),
  makeLetterLevel('ר', ['ד']),
  makeLetterLevel('ש', ['ס']),
  makeMissingWordLevel('פה', 1, ['ח', 'ת']),
  makeFullWordLevel('אור', ['א', 'ו', 'ר']),
  makeMissingWordLevel('נר', 0, ['מ', 'ג']),
  makeFullWordLevel('כוס', ['כ', 'ו', 'ס']),
  makeSightWordLevel('ים', 'בית'),
  makeFullWordLevel('ספר', ['ס', 'פ', 'ר']),
  makeSightWordLevel('חלב', 'ספר'),
]

const finalLetterLevels: LevelDraft[] = [
  makeLetterLevel('ך', ['כ'], 'final-letters', 'final-1'),
  makeLetterLevel('ם', ['מ'], 'final-letters', 'final-2'),
  makeLetterLevel('ן', ['נ'], 'final-letters', 'final-3'),
  makeLetterLevel('ף', ['פ'], 'final-letters', 'final-4'),
  makeLetterLevel('ץ', ['צ'], 'final-letters', 'final-5'),
  makeMissingWordLevel('ים', 1, ['י', 'מ'], 'final-letters'),
  makeMissingWordLevel('גן', 1, ['ג', 'נ'], 'final-letters'),
  makeMissingWordLevel('אף', 1, ['א', 'פ'], 'final-letters'),
  makeMissingWordLevel('עץ', 1, ['ע', 'צ'], 'final-letters'),
  makeMissingWordLevel('מלך', 2, ['כ', 'מ'], 'final-letters'),
  makeMissingWordLevel('כנף', 2, ['פ', 'נ'], 'final-letters'),
  makeMissingWordLevel('סוף', 2, ['פ', 'ס'], 'final-letters'),
  makeMissingWordLevel('קיץ', 2, ['צ', 'ק'], 'final-letters'),
  makeMissingWordLevel('רך', 1, ['כ', 'ר'], 'final-letters'),
  makeFullWordLevel('ים', ['י', 'ם'], 'final-letters'),
  makeFullWordLevel('גן', ['ג', 'ן'], 'final-letters'),
  makeFullWordLevel('עץ', ['ע', 'ץ'], 'final-letters'),
  makeFullWordLevel('מלך', ['מ', 'ל', 'ך'], 'final-letters'),
]

const patahQamatsUnits: VowelPart[] = [
  { letter: 'ב', vowel: 'patah' },
  { letter: 'מ', vowel: 'patah' },
  { letter: 'ח', vowel: 'qamats' },
  { letter: 'ל', vowel: 'qamats' },
  { letter: 'ד', vowel: 'patah' },
  { letter: 'י', vowel: 'qamats' },
  { letter: 'א', vowel: 'patah' },
  { letter: 'א', vowel: 'qamats' },
  { letter: 'ג', vowel: 'patah' },
  { letter: 'ג', vowel: 'qamats' },
  { letter: 'ה', vowel: 'patah' },
  { letter: 'ה', vowel: 'qamats' },
  { letter: 'ו', vowel: 'patah' },
  { letter: 'ז', vowel: 'qamats' },
  { letter: 'ט', vowel: 'patah' },
  { letter: 'כ', vowel: 'qamats' },
  { letter: 'נ', vowel: 'patah' },
  { letter: 'ס', vowel: 'qamats' },
  { letter: 'ע', vowel: 'patah' },
  { letter: 'פ', vowel: 'qamats' },
  { letter: 'צ', vowel: 'patah' },
  { letter: 'ק', vowel: 'qamats' },
  { letter: 'ר', vowel: 'patah' },
  { letter: 'ש', vowel: 'qamats' },
]

const hiriqUnits: VowelPart[] = [
  'ב',
  'מ',
  'ד',
  'ג',
  'ח',
  'ל',
  'י',
  'נ',
  'ס',
  'פ',
  'ש',
  'ר',
  'ט',
  'כ',
  'צ',
  'ק',
].map((letter) => ({ letter, vowel: 'hiriq' }))

const tsereSegolUnits: VowelPart[] = [
  { letter: 'ב', vowel: 'tsere' },
  { letter: 'מ', vowel: 'segol' },
  { letter: 'ד', vowel: 'tsere' },
  { letter: 'ג', vowel: 'segol' },
  { letter: 'ח', vowel: 'tsere' },
  { letter: 'ל', vowel: 'segol' },
  { letter: 'י', vowel: 'segol' },
  { letter: 'נ', vowel: 'tsere' },
  { letter: 'ס', vowel: 'tsere' },
  { letter: 'פ', vowel: 'segol' },
  { letter: 'ש', vowel: 'segol' },
  { letter: 'ר', vowel: 'tsere' },
  { letter: 'ט', vowel: 'segol' },
  { letter: 'כ', vowel: 'tsere' },
  { letter: 'צ', vowel: 'segol' },
  { letter: 'ק', vowel: 'tsere' },
  { letter: 'ע', vowel: 'tsere' },
  { letter: 'ה', vowel: 'segol' },
  { letter: 'ו', vowel: 'tsere' },
  { letter: 'ז', vowel: 'segol' },
]

const holamUnits: VowelPart[] = [
  'א',
  'ב',
  'ד',
  'ג',
  'ח',
  'ל',
  'מ',
  'נ',
  'ס',
  'פ',
  'ש',
  'ר',
  'ט',
  'כ',
  'צ',
  'ק',
].map((letter) => ({ letter, vowel: 'holam' }))

const qubutsShurukUnits: VowelPart[] = [
  { letter: 'ב', vowel: 'qubuts' },
  { letter: 'מ', vowel: 'qubuts' },
  { letter: 'ד', vowel: 'qubuts' },
  { letter: 'ג', vowel: 'qubuts' },
  { letter: 'ח', vowel: 'qubuts' },
  { letter: 'ל', vowel: 'qubuts' },
  { letter: 'ס', vowel: 'qubuts' },
  { letter: 'פ', vowel: 'qubuts' },
  { letter: 'ש', vowel: 'qubuts' },
  { letter: 'ר', vowel: 'qubuts' },
  { letter: 'ב', vowel: 'shuruk' },
  { letter: 'מ', vowel: 'shuruk' },
  { letter: 'ד', vowel: 'shuruk' },
  { letter: 'ג', vowel: 'shuruk' },
  { letter: 'ח', vowel: 'shuruk' },
  { letter: 'ש', vowel: 'shuruk' },
  { letter: 'צ', vowel: 'shuruk' },
  { letter: 'ק', vowel: 'shuruk' },
]

const mixedAieWords: WordBankEntry[] = [
  ...WORD_BANKS['patah-qamats'],
  ...WORD_BANKS.hiriq.slice(0, 4),
  ...WORD_BANKS['tsere-segol'].slice(0, 4),
]

const mixedOuWords: WordBankEntry[] = [
  ...WORD_BANKS.holam,
  ...WORD_BANKS['qubuts-shuruk'].slice(0, 4),
]

const firstReadingWords: WordBankEntry[] = [
  ...WORD_BANKS['patah-qamats'],
  ...WORD_BANKS.hiriq.slice(0, 4),
  ...WORD_BANKS['tsere-segol'].slice(0, 4),
  ...WORD_BANKS.holam.slice(0, 4),
  ...WORD_BANKS['qubuts-shuruk'].slice(0, 4),
]

WORD_BANKS['mixed-a-i-e'] = mixedAieWords
WORD_BANKS['mixed-o-u'] = mixedOuWords
WORD_BANKS['first-reading'] = firstReadingWords

const levelDrafts: LevelDraft[] = [
  ...letterLevels,
  ...finalLetterLevels,
  ...makeSyllableSeries('patah-qamats', patahQamatsUnits.slice(0, 20)),
  ...WORD_BANKS['patah-qamats'].map((entry) => makeNikkudWordLevel(entry, 'patah-qamats')),
  ...makeSyllableSeries('hiriq', hiriqUnits),
  ...WORD_BANKS.hiriq.map((entry) => makeNikkudWordLevel(entry, 'hiriq')),
  ...makeSyllableSeries('tsere-segol', tsereSegolUnits),
  ...WORD_BANKS['tsere-segol'].map((entry) => makeNikkudWordLevel(entry, 'tsere-segol')),
  ...makeSyllableSeries('holam', holamUnits),
  ...WORD_BANKS.holam.map((entry) => makeNikkudWordLevel(entry, 'holam')),
  ...makeSyllableSeries('qubuts-shuruk', qubutsShurukUnits),
  ...WORD_BANKS['qubuts-shuruk'].map((entry) => makeNikkudWordLevel(entry, 'qubuts-shuruk')),
  ...makeSyllableSeries('mixed-a-i-e', REVIEW_SETS['mixed-a-i-e'].slice(0, 10)),
  ...mixedAieWords.slice(0, 10).map((entry) => makeNikkudWordLevel(entry, 'mixed-a-i-e')),
  ...makeSyllableSeries('mixed-o-u', REVIEW_SETS['mixed-o-u'].slice(0, 7)),
  ...mixedOuWords.slice(0, 7).map((entry) => makeNikkudWordLevel(entry, 'mixed-o-u')),
  ...firstReadingWords.slice(0, 10).map((entry) => makeNikkudWordLevel(entry, 'first-reading')),
]

const expectedCategoryCounts: Record<CategoryId, number> = {
  letters: 36,
  'final-letters': 18,
  'patah-qamats': 24,
  hiriq: 22,
  'tsere-segol': 28,
  holam: 22,
  'qubuts-shuruk': 26,
  'mixed-a-i-e': 20,
  'mixed-o-u': 14,
  'first-reading': 10,
}

function assertCurriculumShape(drafts: readonly LevelDraft[]) {
  const ids = new Set<string>()
  for (const draft of drafts) {
    if (ids.has(draft.id)) throw new Error(`Duplicate level id ${draft.id}`)
    ids.add(draft.id)
  }

  for (const [categoryId, expected] of Object.entries(expectedCategoryCounts)) {
    const actual = drafts.filter((draft) => draft.categoryId === categoryId).length
    if (actual !== expected) throw new Error(`${categoryId} has ${actual} levels; expected ${expected}`)
  }

  const expectedTotal = Object.values(expectedCategoryCounts).reduce((total, count) => total + count, 0)
  if (drafts.length !== expectedTotal) {
    throw new Error(`Curriculum has ${drafts.length} levels; expected ${expectedTotal}`)
  }
}

assertCurriculumShape(levelDrafts)

export const LEVELS: Level[] = levelDrafts.map((draft, index) => ({
  ...withCategory(draft),
  order: index + 1,
}))

export function levelById(id: string) {
  return LEVELS.find((level) => level.id === id)
}

export function categoryLevels(categoryId: string) {
  return LEVELS.filter((level) => level.categoryId === categoryId)
}

export function getCategoryById(categoryId: string) {
  return CATEGORIES.find((category) => category.id === categoryId)
}

export function getNextLevelId(levelId: string): string | null {
  const index = LEVELS.findIndex((level) => level.id === levelId)
  return LEVELS[index + 1]?.id ?? null
}

export function getNextRecommendedLevelId(completedLevelIds: string[]) {
  const completed = new Set(completedLevelIds)
  return LEVELS.find((level) => !completed.has(level.id))?.id ?? LEVELS[0].id
}

export function isLastLevelInCategory(levelId: string) {
  const level = levelById(levelId)
  if (!level) return false
  const levels = categoryLevels(level.categoryId)
  return levels.at(-1)?.id === level.id
}

export function getNextCategoryTitle(levelId: string) {
  const level = levelById(levelId)
  if (!level) return null
  const category = getCategoryById(level.categoryId)
  const nextCategory = CATEGORIES.find((candidate) => candidate.order === (category?.order ?? 0) + 1)
  return nextCategory?.title ?? null
}

export function getChoicePlacementSoundId(choice: Choice) {
  return choice.soundId
}

export const RECORDED_AUDIO_ASSETS: Record<string, string[]> = {}

function soundIdsForLevel(level: Level) {
  return [
    level.completionAudioId,
    ...level.choices.map((choice) => choice.soundId),
    ...level.target.slots.map((slot) => slot.soundId),
  ]
}

function generateAudioAssets(levels: readonly Level[]) {
  const entries = new Map<string, string[]>(Object.entries(RECORDED_AUDIO_ASSETS))

  for (const level of levels) {
    for (const soundId of soundIdsForLevel(level)) {
      if (!entries.has(soundId)) entries.set(soundId, [])
    }
  }

  return Object.fromEntries([...entries.entries()].sort(([left], [right]) => left.localeCompare(right)))
}

export const AUDIO_ASSETS: Record<string, string[]> = generateAudioAssets(LEVELS)
