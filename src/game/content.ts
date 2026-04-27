import type { Choice, GameSettings, Level } from './types'

export const DEFAULT_SETTINGS: GameSettings = {
  muted: false,
  volume: 0.72,
  reducedMotion:
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
  voiceIntensity: 'jumpy',
}

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

const phonemeText: Record<string, string[]> = {
  a: ['ah', 'aah', 'ah!'],
  b: ['buh', 'b', 'buh!'],
  c: ['kuh', 'k', 'kuh!'],
  d: ['duh', 'd', 'duh!'],
  e: ['eh', 'e', 'eh!'],
  f: ['fff', 'fuh', 'fff!'],
  g: ['guh', 'g', 'guh!'],
  h: ['huh', 'h', 'huh!'],
  i: ['ih', 'i', 'ih!'],
  j: ['juh', 'j', 'juh!'],
  k: ['kuh', 'k', 'kuh!'],
  l: ['lll', 'luh', 'lll!'],
  m: ['mmm', 'muh', 'mmm!'],
  n: ['nnn', 'nuh', 'nnn!'],
  o: ['aw', 'o', 'aw!'],
  p: ['puh', 'p', 'puh!'],
  q: ['kwuh', 'qu', 'kwuh!'],
  r: ['rrr', 'ruh', 'rrr!'],
  s: ['sss', 'suh', 'sss!'],
  t: ['tuh', 't', 'tuh!'],
  u: ['uh', 'u', 'uh!'],
  v: ['vvv', 'vuh', 'vvv!'],
  w: ['wuh', 'w', 'wuh!'],
  x: ['ks', 'x', 'ks!'],
  y: ['yuh', 'y', 'yuh!'],
  z: ['zzz', 'zuh', 'zzz!'],
}

const wordText: Record<string, string> = {
  are: 'are',
  bed: 'bed',
  big: 'big',
  cat: 'cat',
  dog: 'dog',
  fox: 'fox',
  go: 'go',
  hen: 'hen',
  jam: 'jam',
  kid: 'kid',
  leg: 'leg',
  mat: 'mat',
  one: 'one',
  pig: 'pig',
  red: 'red',
  sat: 'sat',
  see: 'see',
  sun: 'sun',
  two: 'two',
  up: 'up',
  van: 'van',
  vet: 'vet',
  web: 'web',
  yes: 'yes',
  zip: 'zip',
}

function colorFor(text: string) {
  const seed = [...text].reduce((total, char) => total + char.charCodeAt(0), 0)
  return palette[seed % palette.length]
}

function letterChoice(letter: string): Choice {
  return {
    id: letter,
    text: letter,
    soundId: `phoneme_${letter}`,
    color: colorFor(letter),
  }
}

function wordChoice(word: string): Choice {
  return {
    id: word,
    text: word,
    soundId: `word_${word}`,
    color: colorFor(word),
  }
}

function makeLetterLevel(letter: string, distractors: string[]): Level {
  return {
    id: `letter-${letter}`,
    title: `Sound ${letter}`,
    difficulty: 'letters',
    promptText: `Hold ${letter}, then match it.`,
    target: {
      display: letter,
      slots: [
        {
          id: `slot-${letter}`,
          text: letter,
          accepts: [letter],
          soundId: `phoneme_${letter}`,
        },
      ],
    },
    choices: [letter, ...distractors].map(letterChoice),
    completionAudioId: `letter_${letter}`,
  }
}

function makeMissingWordLevel(
  word: string,
  missingIndex: number,
  distractors: string[],
): Level {
  const letters = [...word]
  const missing = letters[missingIndex]

  return {
    id: `${word}-missing-${missing}`,
    title: `Make ${word}`,
    difficulty: 'missing-letter',
    promptText: `Put the missing letter in ${word}.`,
    target: {
      display: word,
      slots: letters.map((letter, index) => ({
        id: `${word}-${index}-${letter}`,
        text: letter,
        accepts: [letter],
        soundId: `phoneme_${letter}`,
        fixed: index !== missingIndex,
      })),
    },
    choices: [missing, ...distractors].map(letterChoice),
    completionAudioId: `word_${word}`,
  }
}

function makeFullWordLevel(word: string, order?: string[]): Level {
  const letters = [...word]
  const choices = order ?? [...new Set(letters)].reverse()

  return {
    id: `${word}-full`,
    title: `Build ${word}`,
    difficulty: 'cvc-word',
    promptText: `Build the whole word ${word}.`,
    target: {
      display: word,
      slots: letters.map((letter, index) => ({
        id: `${word}-${index}-${letter}`,
        text: letter,
        accepts: [letter],
        soundId: `phoneme_${letter}`,
      })),
    },
    choices: choices.map(letterChoice),
    completionAudioId: `word_${word}`,
  }
}

function makeSightWordLevel(word: string, distractor: string): Level {
  return {
    id: `${word}-sight`,
    title: `Word ${word}`,
    difficulty: 'sight-word',
    promptText: `Match the word ${word}.`,
    target: {
      display: word,
      slots: [
        {
          id: `${word}-word`,
          text: word,
          accepts: [word],
          soundId: `word_${word}`,
        },
      ],
    },
    choices: [word, distractor].map(wordChoice),
    completionAudioId: `word_${word}`,
  }
}

export const LEVELS: Level[] = [
  makeLetterLevel('a', ['m']),
  makeLetterLevel('m', ['s']),
  makeLetterLevel('c', ['t']),
  makeLetterLevel('t', ['s']),
  makeMissingWordLevel('cat', 1, ['m', 't']),
  makeFullWordLevel('cat', ['c', 'a', 't']),
  makeFullWordLevel('mat', ['m', 'a', 't']),

  makeLetterLevel('s', ['n']),
  makeLetterLevel('u', ['a']),
  makeLetterLevel('n', ['m']),
  makeFullWordLevel('sun', ['s', 'u', 'n']),
  makeFullWordLevel('sat', ['s', 'a', 't']),

  makeLetterLevel('d', ['p']),
  makeLetterLevel('o', ['a']),
  makeLetterLevel('g', ['c']),
  makeMissingWordLevel('dog', 0, ['b', 'p']),
  makeFullWordLevel('dog', ['d', 'o', 'g']),

  makeLetterLevel('p', ['b']),
  makeLetterLevel('i', ['o']),
  makeLetterLevel('b', ['d']),
  makeFullWordLevel('pig', ['p', 'i', 'g']),
  makeFullWordLevel('big', ['b', 'i', 'g']),

  makeLetterLevel('h', ['n']),
  makeLetterLevel('e', ['i']),
  makeLetterLevel('r', ['l']),
  makeFullWordLevel('hen', ['h', 'e', 'n']),
  makeFullWordLevel('bed', ['b', 'e', 'd']),
  makeFullWordLevel('red', ['r', 'e', 'd']),

  makeLetterLevel('f', ['s']),
  makeLetterLevel('x', ['k']),
  makeFullWordLevel('fox', ['f', 'o', 'x']),

  makeLetterLevel('l', ['r']),
  makeLetterLevel('k', ['c']),
  makeFullWordLevel('kid', ['k', 'i', 'd']),
  makeFullWordLevel('leg', ['l', 'e', 'g']),

  makeLetterLevel('w', ['v']),
  makeLetterLevel('y', ['j']),
  makeFullWordLevel('web', ['w', 'e', 'b']),
  makeFullWordLevel('yes', ['y', 'e', 's']),

  makeLetterLevel('j', ['g']),
  makeLetterLevel('z', ['s']),
  makeFullWordLevel('jam', ['j', 'a', 'm']),
  makeFullWordLevel('zip', ['z', 'i', 'p']),

  makeLetterLevel('v', ['w']),
  makeLetterLevel('q', ['k']),
  makeFullWordLevel('van', ['v', 'a', 'n']),
  makeFullWordLevel('vet', ['v', 'e', 't']),

  makeSightWordLevel('one', 'two'),
  makeSightWordLevel('two', 'one'),
  makeSightWordLevel('see', 'yes'),
  makeSightWordLevel('go', 'up'),
  makeSightWordLevel('up', 'go'),
  makeSightWordLevel('are', 'see'),
]

export function levelById(id: string) {
  return LEVELS.find((level) => level.id === id)
}

export function getChoicePlacementSoundId(choice: Choice) {
  return choice.text.length === 1 ? `letter_${choice.text}` : choice.soundId
}

export const SOUND_TEXT: Record<string, string | string[]> = {
  ...Object.fromEntries(
    Object.entries(phonemeText).map(([letter, text]) => [`phoneme_${letter}`, text]),
  ),
  ...Object.fromEntries(
    Object.keys(phonemeText).map((letter) => [
      `letter_${letter}`,
      letter.toUpperCase(),
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(wordText).map(([word, text]) => [`word_${word}`, text]),
  ),
  fx_retry: ['try again', 'oops, try again', 'almost'],
}
