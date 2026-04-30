import type { Category, Choice, GameSettings, Level } from './types'

export const PATAH = '\u05B7'
export const QAMATS = '\u05B8'

type VowelId = 'patah' | 'qamats'

type LevelDraft = Omit<Level, 'categoryTitle' | 'order'>

export const DEFAULT_SETTINGS: GameSettings = {
  muted: false,
  volume: 0.72,
  reducedMotion:
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
  voiceIntensity: 'jumpy',
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
    id: 'patah-qamats',
    title: 'פתח וקמץ',
    description: 'שני סימני ניקוד שונים שנשמעים כמו a.',
    order: 2,
    color: '#d77936',
  },
  {
    id: 'a-words',
    title: 'מילים עם אָ / אַ',
    description: 'מרכיבים מילים קלות מצירופים מנוקדים מוכנים.',
    order: 3,
    color: '#4fbf67',
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
  חָלָב: 'halav-qamats',
  דַג: 'dag-patah',
  גַן: 'gan-patah',
  יָד: 'yad-qamats',
}

const vowelMarks: Record<VowelId, string> = {
  patah: PATAH,
  qamats: QAMATS,
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
  return {
    id: `syllable-${slugForLetter(letter)}-${vowel}`,
    text: `${letter}${vowelMarks[vowel]}`,
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

function makeLetterLevel(letter: string, distractors: string[]): LevelDraft {
  return {
    id: `letter-${slugForLetter(letter)}`,
    title: `האות ${letter}`,
    categoryId: 'letters',
    levelKind: 'letter-match',
    difficulty: 'letters',
    promptText: `גררו את ${letter} למקום שלה.`,
    target: {
      display: letter,
      slots: [
        {
          id: `slot-${slugForLetter(letter)}`,
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
): LevelDraft {
  const letters = [...word]
  const missing = letters[missingIndex]

  return {
    id: `${slugForWord(word)}-missing-${slugForLetter(missing)}`,
    title: `השלימו ${word}`,
    categoryId: 'letters',
    levelKind: 'missing-letter',
    difficulty: 'missing-letter',
    promptText: `איזו אות חסרה במילה ${word}?`,
    target: {
      display: word,
      slots: letters.map((letter, index) => ({
        id: `${slugForWord(word)}-${index}-${slugForLetter(letter)}`,
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

function makeFullWordLevel(word: string, order?: string[]): LevelDraft {
  const letters = [...word]
  const choices = order ?? [...new Set(letters)].reverse()

  return {
    id: `${slugForWord(word)}-full`,
    title: `בונים ${word}`,
    categoryId: 'letters',
    levelKind: 'word-build',
    difficulty: 'cvc-word',
    promptText: `גררו את האותיות למילה ${word}.`,
    target: {
      display: word,
      slots: letters.map((letter, index) => ({
        id: `${slugForWord(word)}-${index}-${slugForLetter(letter)}`,
        text: letter,
        accepts: [letter],
        soundId: `he_letter_${slugForLetter(letter)}`,
      })),
    },
    choices: choices.map(letterChoice),
    completionAudioId: `he_word_${slugForWord(word)}`,
  }
}

function makeSightWordLevel(word: string, distractor: string): LevelDraft {
  return {
    id: `${slugForWord(word)}-sight`,
    title: `המילה ${word}`,
    categoryId: 'letters',
    levelKind: 'word-match',
    difficulty: 'sight-word',
    promptText: `התאימו את המילה ${word}.`,
    target: {
      display: word,
      slots: [
        {
          id: `${slugForWord(word)}-word`,
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
  distractors: Array<[string, VowelId]>,
): LevelDraft {
  const syllable = makeSyllable(letter, vowel)
  return {
    id: `${syllable.id}-match`,
    title: `${syllable.text}`,
    categoryId: 'patah-qamats',
    levelKind: 'syllable-match',
    difficulty: 'syllable',
    promptText: `גררו את ${syllable.text} ושמעו את הצליל.`,
    target: {
      display: syllable.text,
      slots: [
        {
          id: `slot-${syllable.id}`,
          text: syllable.text,
          accepts: [syllable.id],
          soundId: syllable.soundId,
        },
      ],
    },
    choices: [syllableChoice(letter, vowel), ...distractors.map(([nextLetter, nextVowel]) => syllableChoice(nextLetter, nextVowel))],
    completionAudioId: syllable.soundId,
  }
}

function makeNikkudWordLevel(
  word: string,
  syllables: Array<{ letter: string; vowel?: VowelId }>,
  distractors: Array<{ letter: string; vowel: VowelId }>,
): LevelDraft {
  const choices = [
    ...syllables
      .filter((part): part is { letter: string; vowel: VowelId } => Boolean(part.vowel))
      .map((part) => syllableChoice(part.letter, part.vowel)),
    ...distractors.map((part) => syllableChoice(part.letter, part.vowel)),
  ]

  return {
    id: `${slugForWord(word)}-nikkud`,
    title: `בונים ${word}`,
    categoryId: 'a-words',
    levelKind: 'nikkud-word-build',
    difficulty: 'nikkud-word',
    promptText: `גררו את הצירופים המנוקדים למילה ${word}.`,
    target: {
      display: word,
      slots: syllables.map((part, index) => {
        if (!part.vowel) {
          const letterId = `${slugForWord(word)}-${index}-${slugForLetter(part.letter)}`
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
          id: `${slugForWord(word)}-${index}-${syllable.id}`,
          text: syllable.text,
          accepts: [syllable.id],
          soundId: syllable.soundId,
        }
      }),
    },
    choices,
    completionAudioId: `he_word_${slugForWord(word)}`,
  }
}

const levelDrafts: LevelDraft[] = [
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

  makeSyllableLevel('ב', 'patah', [['מ', 'patah'], ['ב', 'qamats']]),
  makeSyllableLevel('מ', 'patah', [['ב', 'patah'], ['מ', 'qamats']]),
  makeSyllableLevel('ח', 'qamats', [['ל', 'qamats'], ['ח', 'patah']]),
  makeSyllableLevel('ל', 'qamats', [['ח', 'qamats'], ['ל', 'patah']]),
  makeSyllableLevel('ד', 'patah', [['ג', 'patah'], ['ד', 'qamats']]),
  makeSyllableLevel('י', 'qamats', [['ד', 'patah'], ['י', 'patah']]),

  makeNikkudWordLevel('חָלָב', [
    { letter: 'ח', vowel: 'qamats' },
    { letter: 'ל', vowel: 'qamats' },
    { letter: 'ב' },
  ], [{ letter: 'מ', vowel: 'patah' }]),
  makeNikkudWordLevel('דַג', [
    { letter: 'ד', vowel: 'patah' },
    { letter: 'ג' },
  ], [{ letter: 'ב', vowel: 'patah' }]),
  makeNikkudWordLevel('גַן', [
    { letter: 'ג', vowel: 'patah' },
    { letter: 'ן' },
  ], [{ letter: 'ד', vowel: 'patah' }]),
  makeNikkudWordLevel('יָד', [
    { letter: 'י', vowel: 'qamats' },
    { letter: 'ד' },
  ], [{ letter: 'ל', vowel: 'qamats' }]),
]

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

export const AUDIO_ASSETS: Record<string, string[]> = {
  he_letter_bet: [],
  he_syllable_bet_patah: [],
  he_syllable_bet_qamats: [],
  he_word_halav: [],
}
