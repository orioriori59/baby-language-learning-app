import type { Category, CategoryId, Choice, GameSettings, LearningFocus, Level } from './types'
import { AUDIO_SAMPLE_CLIPS } from './audioSamples'

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
    id: 'first-letters',
    title: 'אותיות ראשונות',
    description: 'מכירים את א, ב, מ ומתחילים לשמוע a ו-i.',
    order: 1,
    color: '#3466d9',
  },
  {
    id: 'first-sounds',
    title: 'צלילי א ב מ',
    description: 'מחזקים את הצלילים הראשונים ומוסיפים י, ד, ג.',
    order: 2,
    color: '#1fa2a6',
  },
  {
    id: 'more-letters',
    title: 'עוד אותיות',
    description: 'מוסיפים ח, ל, ה ומתרגלים a, i, e ו-o.',
    order: 3,
    color: '#d77936',
  },
  {
    id: 'new-sounds',
    title: 'צלילים חדשים',
    description: 'מוסיפים ו, ז, ט ומכירים גם צלילי u.',
    order: 4,
    color: '#4fbf67',
  },
  {
    id: 'full-sounds',
    title: 'כל הצלילים',
    description: 'מוסיפים כ, נ, ס, ע, פ, צ ומערבבים ניקודים.',
    order: 5,
    color: '#d64f8c',
  },
  {
    id: 'letter-review',
    title: 'חזרה על אותיות',
    description: 'משלימים את ק, ר, ש, ת וחוזרים על כל הצלילים.',
    order: 6,
    color: '#7a5be8',
  },
  {
    id: 'final-letters',
    title: 'אותיות סופיות',
    description: 'מזהים ך, ם, ן, ף, ץ בסוף מילים.',
    order: 7,
    color: '#d6a81f',
  },
  {
    id: 'first-words',
    title: 'מילים ראשונות',
    description: 'בונים מילים עם שילובי ניקוד שכבר למדנו.',
    order: 8,
    color: '#df5b61',
  },
  {
    id: 'reading-together',
    title: 'קוראים יחד',
    description: 'חוזרים על כל האותיות, הניקוד והמילים.',
    order: 9,
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

export const WORD_BANKS: Record<string, readonly WordBankEntry[]> = {
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
  return `${categoryId}-${base}`
}

function makeLetterLevel(
  letter: string,
  distractors: string[],
  categoryId: CategoryId = 'first-letters',
  suffix?: string,
  learningFocus: LearningFocus = 'letter',
): LevelDraft {
  const id = suffix ? `letter-${slugForLetter(letter)}-${suffix}` : `letter-${slugForLetter(letter)}`

  return {
    id,
    title: `האות ${letter}`,
    categoryId,
    levelKind: 'letter-match',
    learningFocus,
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
  categoryId: CategoryId = 'first-letters',
  learningFocus: LearningFocus = 'word-build',
): LevelDraft {
  const letters = [...word]
  const missing = letters[missingIndex]

  return {
    id: idForWordLevel(word, `missing-${slugForLetter(missing)}`, categoryId),
    title: `השלימו ${word}`,
    categoryId,
    levelKind: 'missing-letter',
    learningFocus,
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

function makeFullWordLevel(
  word: string,
  order?: string[],
  categoryId: CategoryId = 'first-letters',
  learningFocus: LearningFocus = 'word-build',
): LevelDraft {
  const letters = [...word]
  const choices = order ?? [...new Set(letters)].reverse()

  return {
    id: idForWordLevel(word, 'full', categoryId),
    title: `בונים ${word}`,
    categoryId,
    levelKind: 'word-build',
    learningFocus,
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

function makeSightWordLevel(
  word: string,
  distractor: string,
  categoryId: CategoryId = 'first-letters',
  learningFocus: LearningFocus = 'mixed-sound-review',
): LevelDraft {
  return {
    id: idForWordLevel(word, 'sight', categoryId),
    title: `המילה ${word}`,
    categoryId,
    levelKind: 'word-match',
    learningFocus,
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
  learningFocus: LearningFocus = 'vowel-sound',
  idSuffix?: string,
): LevelDraft {
  const syllable = makeSyllable(letter, vowel)
  const levelId = `${categoryId}-${syllable.id}${idSuffix ? `-${idSuffix}` : ''}-match`

  return {
    id: levelId,
    title: `${syllable.text}`,
    categoryId,
    levelKind: 'syllable-match',
    learningFocus,
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

function makeNikkudWordLevel(
  entry: WordBankEntry,
  categoryId: CategoryId,
  learningFocus: LearningFocus = 'word-build',
  idSuffix?: string,
): LevelDraft {
  const choices = [
    ...entry.parts
      .filter((part): part is VowelPart => Boolean(part.vowel))
      .map((part) => syllableChoice(part.letter, part.vowel)),
    ...entry.distractors.map((part) => syllableChoice(part.letter, part.vowel)),
  ]

  return {
    id: idForWordLevel(entry.word, idSuffix ? `nikkud-${idSuffix}` : 'nikkud', categoryId),
    title: `בונים ${entry.word}`,
    categoryId,
    levelKind: 'nikkud-word-build',
    learningFocus,
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

type CurriculumSection = {
  id: CategoryId
  newLetters: readonly string[]
  introducedLetters: readonly string[]
  vowels: readonly VowelId[]
  expectedLevelCount: number
}

export const CURRICULUM_SECTIONS: readonly CurriculumSection[] = [
  {
    id: 'first-letters',
    newLetters: ['א', 'ב', 'מ'],
    introducedLetters: ['א', 'ב', 'מ'],
    vowels: ['patah', 'qamats', 'hiriq'],
    expectedLevelCount: 24,
  },
  {
    id: 'first-sounds',
    newLetters: ['י', 'ד', 'ג'],
    introducedLetters: ['א', 'ב', 'מ', 'י', 'ד', 'ג'],
    vowels: ['patah', 'qamats', 'hiriq', 'tsere', 'segol'],
    expectedLevelCount: 26,
  },
  {
    id: 'more-letters',
    newLetters: ['ח', 'ל', 'ה'],
    introducedLetters: ['א', 'ב', 'מ', 'י', 'ד', 'ג', 'ח', 'ל', 'ה'],
    vowels: ['patah', 'qamats', 'hiriq', 'tsere', 'segol', 'holam'],
    expectedLevelCount: 32,
  },
  {
    id: 'new-sounds',
    newLetters: ['ו', 'ז', 'ט'],
    introducedLetters: ['א', 'ב', 'מ', 'י', 'ד', 'ג', 'ח', 'ל', 'ה', 'ו', 'ז', 'ט'],
    vowels: ['patah', 'qamats', 'hiriq', 'tsere', 'segol', 'holam', 'qubuts', 'shuruk'],
    expectedLevelCount: 32,
  },
  {
    id: 'full-sounds',
    newLetters: ['כ', 'נ', 'ס', 'ע', 'פ', 'צ'],
    introducedLetters: ['א', 'ב', 'מ', 'י', 'ד', 'ג', 'ח', 'ל', 'ה', 'ו', 'ז', 'ט', 'כ', 'נ', 'ס', 'ע', 'פ', 'צ'],
    vowels: ['patah', 'qamats', 'hiriq', 'tsere', 'segol', 'holam', 'qubuts', 'shuruk'],
    expectedLevelCount: 20,
  },
  {
    id: 'letter-review',
    newLetters: ['ק', 'ר', 'ש', 'ת'],
    introducedLetters: [
      'א',
      'ב',
      'מ',
      'י',
      'ד',
      'ג',
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
      'ת',
    ],
    vowels: ['patah', 'qamats', 'hiriq', 'tsere', 'segol', 'holam', 'qubuts', 'shuruk'],
    expectedLevelCount: 16,
  },
  {
    id: 'final-letters',
    newLetters: ['ך', 'ם', 'ן', 'ף', 'ץ'],
    introducedLetters: [
      'א',
      'ב',
      'מ',
      'י',
      'ד',
      'ג',
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
      'ת',
      'ך',
      'ם',
      'ן',
      'ף',
      'ץ',
    ],
    vowels: ['patah', 'qamats', 'hiriq', 'tsere', 'segol', 'holam', 'qubuts', 'shuruk'],
    expectedLevelCount: 25,
  },
  {
    id: 'first-words',
    newLetters: [],
    introducedLetters: LETTER_SEQUENCE,
    vowels: ['patah', 'qamats', 'hiriq', 'tsere', 'segol', 'holam', 'qubuts', 'shuruk'],
    expectedLevelCount: 30,
  },
  {
    id: 'reading-together',
    newLetters: [],
    introducedLetters: LETTER_SEQUENCE,
    vowels: ['patah', 'qamats', 'hiriq', 'tsere', 'segol', 'holam', 'qubuts', 'shuruk'],
    expectedLevelCount: 15,
  },
]

const REVIEW_VOWELS: readonly VowelId[] = ['patah', 'hiriq', 'segol', 'holam', 'shuruk']

const SPIRAL_WORDS: Record<CategoryId, readonly WordBankEntry[]> = {
  'first-letters': [
    { word: 'אִמָא', parts: [{ letter: 'א', vowel: 'hiriq' }, { letter: 'מ', vowel: 'qamats' }, { letter: 'א' }], distractors: [{ letter: 'ב', vowel: 'patah' }] },
    { word: 'בָא', parts: [{ letter: 'ב', vowel: 'qamats' }, { letter: 'א' }], distractors: [{ letter: 'מ', vowel: 'hiriq' }] },
  ],
  'first-sounds': [
    { word: 'דַג', parts: [{ letter: 'ד', vowel: 'patah' }, { letter: 'ג' }], distractors: [{ letter: 'ב', vowel: 'patah' }] },
    { word: 'יָד', parts: [{ letter: 'י', vowel: 'qamats' }, { letter: 'ד' }], distractors: [{ letter: 'מ', vowel: 'qamats' }] },
    { word: 'מִי', parts: [{ letter: 'מ', vowel: 'hiriq' }, { letter: 'י' }], distractors: [{ letter: 'ד', vowel: 'hiriq' }] },
  ],
  'more-letters': [
    { word: 'חָלָב', parts: [{ letter: 'ח', vowel: 'qamats' }, { letter: 'ל', vowel: 'qamats' }, { letter: 'ב' }], distractors: [{ letter: 'מ', vowel: 'patah' }] },
    { word: 'לֵב', parts: [{ letter: 'ל', vowel: 'tsere' }, { letter: 'ב' }], distractors: [{ letter: 'ח', vowel: 'segol' }] },
    { word: 'הִיא', parts: [{ letter: 'ה', vowel: 'hiriq' }, { letter: 'י' }, { letter: 'א' }], distractors: [{ letter: 'ל', vowel: 'hiriq' }] },
  ],
  'new-sounds': [
    { word: 'זָז', parts: [{ letter: 'ז', vowel: 'qamats' }, { letter: 'ז' }], distractors: [{ letter: 'ט', vowel: 'hiriq' }] },
    { word: 'טוּט', parts: [{ letter: 'ט', vowel: 'shuruk' }, { letter: 'ט' }], distractors: [{ letter: 'ז', vowel: 'qubuts' }] },
    { word: 'וָו', parts: [{ letter: 'ו', vowel: 'qamats' }, { letter: 'ו' }], distractors: [{ letter: 'ד', vowel: 'patah' }] },
  ],
  'full-sounds': [
    ...WORD_BANKS.hiriq.slice(0, 3),
    ...WORD_BANKS['tsere-segol'].slice(0, 3),
    ...WORD_BANKS['qubuts-shuruk'].slice(0, 2),
  ],
  'letter-review': [
    ...WORD_BANKS.holam.slice(0, 4),
    ...WORD_BANKS['qubuts-shuruk'].slice(4, 8),
  ],
  'final-letters': [],
  'first-words': [
    ...WORD_BANKS['patah-qamats'],
    ...WORD_BANKS.hiriq.slice(0, 4),
    ...WORD_BANKS['tsere-segol'].slice(0, 5),
    ...WORD_BANKS.holam.slice(0, 4),
    ...WORD_BANKS['qubuts-shuruk'].slice(0, 5),
  ],
  'reading-together': [
    ...WORD_BANKS['patah-qamats'],
    ...WORD_BANKS.hiriq.slice(0, 2),
    ...WORD_BANKS['tsere-segol'].slice(0, 3),
    ...WORD_BANKS.holam.slice(0, 2),
    ...WORD_BANKS['qubuts-shuruk'].slice(0, 3),
  ],
}

function regularDistractors(letter: string, allowedLetters: readonly string[]) {
  return allowedLetters.filter((candidate) => candidate !== letter).slice(0, 2)
}

function vowelUnits(letters: readonly string[], vowels: readonly VowelId[]) {
  return letters.flatMap((letter) => vowels.map((vowel) => ({ letter, vowel })))
}

function cyclingUnit(units: readonly VowelPart[], index: number) {
  return units[index % units.length]
}

function addSyllableLevel(
  levels: LevelDraft[],
  categoryId: CategoryId,
  unit: VowelPart,
  unitPool: readonly VowelPart[],
  learningFocus: LearningFocus,
  suffix: string,
) {
  const index = Math.max(0, unitPool.findIndex((candidate) => candidate.letter === unit.letter && candidate.vowel === unit.vowel))
  levels.push(
    makeSyllableLevel(
      unit.letter,
      unit.vowel,
      distractorsFor(unit, unitPool, index),
      categoryId,
      learningFocus,
      suffix,
    ),
  )
}

function buildSoundSection(section: CurriculumSection) {
  const levels: LevelDraft[] = []
  const allUnits = vowelUnits(section.introducedLetters, section.vowels)
  const newUnits = vowelUnits(section.newLetters.length ? section.newLetters : section.introducedLetters, section.vowels)

  section.newLetters.forEach((letter, index) => {
    levels.push(
      makeLetterLevel(
        letter,
        regularDistractors(letter, section.introducedLetters),
        section.id,
        `${section.id}-${index + 1}`,
        section.id === 'letter-review' ? 'letter-sound' : 'letter',
      ),
    )
  })

  newUnits.forEach((unit, index) => {
    if (levels.length >= section.expectedLevelCount) return
    addSyllableLevel(levels, section.id, unit, allUnits, 'vowel-sound', `ladder-${index + 1}`)
  })

  REVIEW_VOWELS.filter((vowel) => section.vowels.includes(vowel)).forEach((vowel, index) => {
    if (levels.length >= section.expectedLevelCount) return
    const reviewUnits = section.introducedLetters.map((letter) => ({ letter, vowel }))
    addSyllableLevel(levels, section.id, cyclingUnit(reviewUnits, index), reviewUnits, 'same-vowel-review', `same-${vowel}`)
  })

  SPIRAL_WORDS[section.id].forEach((entry, index) => {
    if (levels.length >= section.expectedLevelCount) return
    levels.push(makeNikkudWordLevel(entry, section.id, 'word-build', `pod-${index + 1}`))
  })

  let index = 0
  while (levels.length < section.expectedLevelCount) {
    const unit = cyclingUnit(allUnits, index)
    addSyllableLevel(levels, section.id, unit, allUnits, 'mixed-sound-review', `review-${index + 1}`)
    index += 1
  }

  return levels
}

function buildFinalLetterLevels(section: CurriculumSection) {
  const levels: LevelDraft[] = []
  const words = [
    { word: 'ים', missingIndex: 1, distractors: ['י', 'מ'] },
    { word: 'גן', missingIndex: 1, distractors: ['ג', 'נ'] },
    { word: 'אף', missingIndex: 1, distractors: ['א', 'פ'] },
    { word: 'עץ', missingIndex: 1, distractors: ['ע', 'צ'] },
    { word: 'מלך', missingIndex: 2, distractors: ['כ', 'מ'] },
    { word: 'כנף', missingIndex: 2, distractors: ['פ', 'נ'] },
    { word: 'סוף', missingIndex: 2, distractors: ['פ', 'ס'] },
    { word: 'קיץ', missingIndex: 2, distractors: ['צ', 'ק'] },
    { word: 'רך', missingIndex: 1, distractors: ['כ', 'ר'] },
  ]

  section.newLetters.forEach((letter, index) => {
    levels.push(makeLetterLevel(letter, regularDistractors(letter, section.introducedLetters), section.id, `final-${index + 1}`, 'final-letter'))
  })
  words.forEach((entry) => levels.push(makeMissingWordLevel(entry.word, entry.missingIndex, entry.distractors, section.id, 'final-letter')))
  ;[
    ['ים', ['י', 'ם']],
    ['גן', ['ג', 'ן']],
    ['עץ', ['ע', 'ץ']],
    ['מלך', ['מ', 'ל', 'ך']],
    ['כנף', ['כ', 'נ', 'ף']],
    ['סוף', ['ס', 'ו', 'ף']],
    ['קיץ', ['ק', 'י', 'ץ']],
    ['רך', ['ר', 'ך']],
    ['אף', ['א', 'ף']],
    ['ספר', ['ס', 'פ', 'ר']],
    ['חלב', ['ח', 'ל', 'ב']],
  ].forEach(([word, letters], index) => {
    if (levels.length < section.expectedLevelCount) {
      levels.push(makeFullWordLevel(word as string, letters as string[], section.id, index < 5 ? 'final-letter' : 'mixed-sound-review'))
    }
  })

  return levels
}

function buildWordSection(section: CurriculumSection) {
  const levels: LevelDraft[] = []
  const allUnits = vowelUnits(section.introducedLetters, section.vowels)
  const words = SPIRAL_WORDS[section.id]

  words.forEach((entry, index) => {
    if (levels.length >= section.expectedLevelCount) return
    levels.push(makeNikkudWordLevel(entry, section.id, section.id === 'first-words' ? 'word-build' : 'mixed-sound-review', `word-${index + 1}`))
  })

  words.forEach((entry, index) => {
    if (levels.length >= section.expectedLevelCount) return
    const word = stripNikkud(entry.word)
    const distractor = stripNikkud(words[(index + 1) % words.length].word)
    if (word !== distractor) {
      levels.push(makeSightWordLevel(word, distractor, section.id, 'mixed-sound-review'))
    }
  })

  let index = 0
  while (levels.length < section.expectedLevelCount) {
    const unit = cyclingUnit(allUnits, index * 3 + 1)
    addSyllableLevel(levels, section.id, unit, allUnits, 'mixed-sound-review', `reading-review-${index + 1}`)
    index += 1
  }

  return levels
}

function buildCurriculum() {
  return CURRICULUM_SECTIONS.flatMap((section) => {
    if (section.id === 'final-letters') return buildFinalLetterLevels(section)
    if (section.id === 'first-words' || section.id === 'reading-together') return buildWordSection(section)
    return buildSoundSection(section)
  })
}

const levelDrafts: LevelDraft[] = buildCurriculum()

export const expectedCategoryCounts: Record<CategoryId, number> = Object.fromEntries(
  CURRICULUM_SECTIONS.map((section) => [section.id, section.expectedLevelCount]),
) as Record<CategoryId, number>

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

export function hasRecordedAudio(soundId: string) {
  return Boolean(RECORDED_AUDIO_ASSETS[soundId]?.length)
}

export function getChoiceHoldSoundId(choice: Choice) {
  if (choice.kind === 'letter') {
    return `he_hold_letter_${slugForLetter(choice.text)}`
  }

  return choice.soundId
}

export const RECORDED_AUDIO_ASSETS: Record<string, string[]> = Object.fromEntries(
  AUDIO_SAMPLE_CLIPS.filter((clip) => clip.ready !== false).map((clip) => [clip.soundId, [clip.src]]),
)

function soundIdsForLevel(level: Level) {
  return [
    level.completionAudioId,
    ...level.choices.map((choice) => choice.soundId),
    ...level.choices.map((choice) => getChoiceHoldSoundId(choice)),
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
