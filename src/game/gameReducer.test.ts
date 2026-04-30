import { describe, expect, it } from 'vitest'
import {
  AUDIO_ASSETS,
  CATEGORIES,
  LEVELS,
  getNextRecommendedLevelId,
  makeSyllable,
  stripNikkud,
} from './content'
import {
  createInitialGameState,
  gameReducer,
  getNextLevelId,
  isLevelComplete,
  validateLevels,
} from './gameReducer'
import { findBestSlot } from './matching'

const EXPECTED_CATEGORY_COUNTS = {
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
} as const

function duplicateValues(values: string[]) {
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  for (const value of values) {
    if (seen.has(value)) duplicates.add(value)
    seen.add(value)
  }

  return [...duplicates].sort()
}

function uniqueValues(values: string[]) {
  return [...new Set(values)].sort()
}

function categoryCounts() {
  return LEVELS.reduce<Record<string, number>>((counts, level) => {
    counts[level.categoryId] = (counts[level.categoryId] ?? 0) + 1
    return counts
  }, {})
}

const makeAnySyllable = makeSyllable as (
  letter: string,
  vowel: string,
) => ReturnType<typeof makeSyllable>

describe('level content', () => {
  it('contains the full 220-level expansion', () => {
    expect(LEVELS).toHaveLength(220)
  })

  it('has the expected categories and level counts', () => {
    expect(CATEGORIES.map((category) => category.id)).toEqual(
      Object.keys(EXPECTED_CATEGORY_COUNTS),
    )
    expect(categoryCounts()).toEqual(EXPECTED_CATEGORY_COUNTS)
  })

  it('has valid slot and choice references', () => {
    expect(validateLevels()).toEqual([])
  })

  it('has unique level ids', () => {
    expect(duplicateValues(LEVELS.map((level) => level.id))).toEqual([])
  })

  it('has unique choice ids inside every level', () => {
    const levelsWithDuplicateChoices = LEVELS
      .map((level) => ({
        levelId: level.id,
        duplicateChoiceIds: duplicateValues(level.choices.map((choice) => choice.id)),
      }))
      .filter((result) => result.duplicateChoiceIds.length > 0)

    expect(levelsWithDuplicateChoices).toEqual([])
  })

  it('declares every sound id used by levels in the audio manifest', () => {
    const audioAssetIds = new Set(Object.keys(AUDIO_ASSETS))
    const usedAudioIds = LEVELS.flatMap((level) => [
      level.completionAudioId,
      ...level.choices.map((choice) => choice.soundId),
      ...level.target.slots.map((slot) => slot.soundId),
    ])

    expect(uniqueValues(usedAudioIds.filter((soundId) => !audioAssetIds.has(soundId)))).toEqual([])
  })

  it('creates stable nikkud text and recording ids for every vowel', () => {
    expect(makeAnySyllable('ב', 'patah')).toMatchObject({
      id: 'syllable-bet-patah',
      text: `ב\u05B7`,
      soundId: 'he_syllable_bet_patah',
    })
    expect(makeAnySyllable('ב', 'qamats')).toMatchObject({
      id: 'syllable-bet-qamats',
      text: `ב\u05B8`,
      soundId: 'he_syllable_bet_qamats',
    })
    expect(makeAnySyllable('ב', 'hiriq')).toMatchObject({
      id: 'syllable-bet-hiriq',
      text: `ב\u05B4`,
      soundId: 'he_syllable_bet_hiriq',
    })
    expect(makeAnySyllable('ב', 'tsere')).toMatchObject({
      id: 'syllable-bet-tsere',
      text: `ב\u05B5`,
      soundId: 'he_syllable_bet_tsere',
    })
    expect(makeAnySyllable('ב', 'segol')).toMatchObject({
      id: 'syllable-bet-segol',
      text: `ב\u05B6`,
      soundId: 'he_syllable_bet_segol',
    })
    expect(makeAnySyllable('ב', 'holam')).toMatchObject({
      id: 'syllable-bet-holam',
      text: `ב\u05B9`,
      soundId: 'he_syllable_bet_holam',
    })
    expect(makeAnySyllable('ב', 'qubuts')).toMatchObject({
      id: 'syllable-bet-qubuts',
      text: `ב\u05BB`,
      soundId: 'he_syllable_bet_qubuts',
    })
    expect(makeAnySyllable('ב', 'shuruk')).toMatchObject({
      id: 'syllable-bet-shuruk',
      text: `ב\u05D5\u05BC`,
      soundId: 'he_syllable_bet_shuruk',
    })
  })

  it('strips nikkud marks from generated syllables', () => {
    const markedText = [
      makeAnySyllable('ב', 'patah').text,
      makeAnySyllable('ב', 'qamats').text,
      makeAnySyllable('ב', 'hiriq').text,
      makeAnySyllable('ב', 'tsere').text,
      makeAnySyllable('ב', 'segol').text,
      makeAnySyllable('ב', 'holam').text,
      makeAnySyllable('ב', 'qubuts').text,
      makeAnySyllable('ב', 'shuruk').text,
      'חָלָב',
    ].join('')

    expect(stripNikkud(markedText)).toBe(['ב', 'ב', 'ב', 'ב', 'ב', 'ב', 'ב', 'בו', 'חלב'].join(''))
  })

  it('falls back to the next recommended level when progress points nowhere', () => {
    expect(getNextRecommendedLevelId(['missing-level-id'])).toBe(LEVELS[0].id)
    expect(getNextRecommendedLevelId([LEVELS[0].id])).toBe(LEVELS[1].id)
    expect(getNextRecommendedLevelId([...LEVELS.map((level) => level.id), 'missing-level-id'])).toBe(LEVELS[0].id)
  })
})

describe('game reducer', () => {
  it('places a choice and completes only when required slots are filled', () => {
    const level = LEVELS.find((candidate) =>
      candidate.target.slots.some((slot) =>
        !slot.fixed && candidate.choices.some((choice) => slot.accepts.includes(choice.id)),
      ),
    )!
    const state = createInitialGameState(level.id)
    const missingSlot = level.target.slots.find((slot) => !slot.fixed)!
    const acceptedChoice = level.choices.find((choice) => missingSlot.accepts.includes(choice.id))!

    expect(isLevelComplete(state, level)).toBe(false)

    const placed = gameReducer(state, {
      type: 'PLACE_CHOICE',
      slotId: missingSlot.id,
      choice: acceptedChoice,
    })

    expect(placed.slots[missingSlot.id]).toBe(acceptedChoice.id)
    expect(placed.attempts).toBe(1)
    expect(isLevelComplete(placed, level)).toBe(true)
  })

  it('advances through the configured level order', () => {
    expect(getNextLevelId(LEVELS[0].id)).toBe(LEVELS[1].id)
    expect(getNextLevelId(LEVELS.at(-1)!.id)).toBeNull()
  })

  it('places a nikkud syllable choice into a nikkud word slot', () => {
    const level = LEVELS.find((candidate) =>
      candidate.levelKind === 'nikkud-word-build' &&
      candidate.target.slots.filter((slot) =>
        !slot.fixed &&
        slot.accepts.some((accepted) => accepted.startsWith('syllable-')) &&
        candidate.choices.some((choice) => slot.accepts.includes(choice.id)),
      ).length > 1,
    )!
    const state = createInitialGameState(level.id)
    const firstSlot = level.target.slots.find((slot) =>
      !slot.fixed && slot.accepts.some((accepted) => accepted.startsWith('syllable-')),
    )!
    const choice = level.choices.find((candidate) => firstSlot.accepts.includes(candidate.id))!

    const placed = gameReducer(state, {
      type: 'PLACE_CHOICE',
      slotId: firstSlot.id,
      choice,
    })

    expect(placed.slots[firstSlot.id]).toBe(choice.id)
    expect(isLevelComplete(placed, level)).toBe(false)
  })
})

describe('snap matching', () => {
  it('returns the nearest compatible empty slot inside the snap radius', () => {
    const level = LEVELS.find((candidate) =>
      candidate.target.slots.filter((slot) => !slot.fixed).length > 1,
    )!
    const state = createInitialGameState(level.id)
    const targetSlot = level.target.slots.filter((slot) => !slot.fixed)[1]
    const choice = level.choices.find((candidate) => targetSlot.accepts.includes(candidate.id))!
    const rects = Object.fromEntries(
      level.target.slots.map((slot, index) => [
        slot.id,
        { left: 20 + index * 90, top: 100, width: 80, height: 80 },
      ]),
    )
    const targetRect = rects[targetSlot.id]

    const slot = findBestSlot({
      choice,
      level,
      state,
      snapRadius: 80,
      x: targetRect.left + targetRect.width / 2,
      y: targetRect.top + targetRect.height / 2,
      rects,
    })

    expect(slot?.id).toBe(targetSlot.id)
  })

  it('rejects wrong letters and drops outside the radius', () => {
    const level = LEVELS.find((candidate) => {
      const firstSlot = candidate.target.slots.find((slot) => !slot.fixed)
      return Boolean(firstSlot && candidate.choices.some((choice) => !firstSlot.accepts.includes(choice.id)))
    })!
    const state = createInitialGameState(level.id)
    const firstSlot = level.target.slots.find((slot) => !slot.fixed)!
    const choice = level.choices.find((candidate) => !firstSlot.accepts.includes(candidate.id))!

    expect(
      findBestSlot({
        choice,
        level,
        state,
        snapRadius: 40,
        x: 500,
        y: 500,
        rects: {
          [firstSlot.id]: { left: 20, top: 100, width: 80, height: 80 },
        },
      }),
    ).toBeNull()
  })
})
