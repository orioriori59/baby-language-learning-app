import { describe, expect, it } from 'vitest'
import {
  AUDIO_ASSETS,
  CATEGORIES,
  LEVELS,
  PATAH,
  QAMATS,
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

describe('level content', () => {
  it('has valid slot and choice references', () => {
    expect(validateLevels()).toEqual([])
  })

  it('starts with Hebrew letters and includes nikkud progression', () => {
    expect(LEVELS[0].difficulty).toBe('letters')
    expect(LEVELS[0].target.display).toBe('א')
    expect(LEVELS.some((level) => level.difficulty === 'cvc-word')).toBe(true)
    expect(LEVELS.some((level) => level.difficulty === 'syllable')).toBe(true)
    expect(LEVELS.some((level) => level.difficulty === 'nikkud-word')).toBe(true)
    expect(LEVELS.some((level) => level.title.includes('בית'))).toBe(true)
    expect(CATEGORIES.map((category) => category.id)).toEqual([
      'letters',
      'patah-qamats',
      'a-words',
    ])
  })

  it('creates stable nikkud text and recording ids', () => {
    expect(PATAH).toBe('\u05B7')
    expect(QAMATS).toBe('\u05B8')
    expect(makeSyllable('ב', 'patah')).toMatchObject({
      id: 'syllable-bet-patah',
      text: 'בַ',
      soundId: 'he_syllable_bet_patah',
    })
    expect(makeSyllable('ב', 'qamats')).toMatchObject({
      id: 'syllable-bet-qamats',
      text: 'בָ',
      soundId: 'he_syllable_bet_qamats',
    })
    expect(stripNikkud('חָלָב')).toBe('חלב')
  })

  it('keeps recording manifest explicit and silent until files are added', () => {
    expect(AUDIO_ASSETS.he_letter_bet).toEqual([])
    expect(AUDIO_ASSETS.he_syllable_bet_patah).toEqual([])
    expect(AUDIO_ASSETS.he_syllable_bet_qamats).toEqual([])
    expect(AUDIO_ASSETS.he_word_halav).toEqual([])
  })

  it('falls back to the next recommended level when progress points nowhere', () => {
    expect(getNextRecommendedLevelId(['missing-level-id'])).toBe(LEVELS[0].id)
    expect(getNextRecommendedLevelId([LEVELS[0].id])).toBe(LEVELS[1].id)
  })
})

describe('game reducer', () => {
  it('places a choice and completes only when required slots are filled', () => {
    const level = LEVELS.find((candidate) => candidate.id === 'bayit-missing-yod')!
    const state = createInitialGameState(level.id)
    const missingSlot = level.target.slots.find((slot) => !slot.fixed)!

    expect(isLevelComplete(state, level)).toBe(false)

    const placed = gameReducer(state, {
      type: 'PLACE_CHOICE',
      slotId: missingSlot.id,
      choice: level.choices[0],
    })

    expect(placed.slots[missingSlot.id]).toBe('י')
    expect(placed.attempts).toBe(1)
    expect(isLevelComplete(placed, level)).toBe(true)
  })

  it('advances through the configured level order', () => {
    expect(getNextLevelId(LEVELS[0].id)).toBe(LEVELS[1].id)
    expect(getNextLevelId(LEVELS.at(-1)!.id)).toBeNull()
  })

  it('places a nikkud syllable choice into a nikkud word slot', () => {
    const level = LEVELS.find((candidate) => candidate.id === 'halav-qamats-nikkud')!
    const state = createInitialGameState(level.id)
    const firstSlot = level.target.slots.find((slot) => !slot.fixed)!
    const choice = level.choices.find((candidate) => candidate.id === 'syllable-het-qamats')!

    const placed = gameReducer(state, {
      type: 'PLACE_CHOICE',
      slotId: firstSlot.id,
      choice,
    })

    expect(placed.slots[firstSlot.id]).toBe('syllable-het-qamats')
    expect(isLevelComplete(placed, level)).toBe(false)
  })
})

describe('snap matching', () => {
  it('returns the nearest compatible empty slot inside the snap radius', () => {
    const level = LEVELS.find((candidate) => candidate.id === 'bayit-full')!
    const state = createInitialGameState(level.id)
    const choice = level.choices.find((candidate) => candidate.id === 'י')!
    const rects = Object.fromEntries(
      level.target.slots.map((slot, index) => [
        slot.id,
        { left: 20 + index * 90, top: 100, width: 80, height: 80 },
      ]),
    )
    const targetRect = rects[level.target.slots[1].id]

    const slot = findBestSlot({
      choice,
      level,
      state,
      snapRadius: 80,
      x: targetRect.left + targetRect.width / 2,
      y: targetRect.top + targetRect.height / 2,
      rects,
    })

    expect(slot?.id).toBe(level.target.slots[1].id)
  })

  it('rejects wrong letters and drops outside the radius', () => {
    const level = LEVELS.find((candidate) => candidate.id === 'bayit-full')!
    const state = createInitialGameState(level.id)
    const choice = level.choices.find((candidate) => candidate.id === 'ב')!

    expect(
      findBestSlot({
        choice,
        level,
        state,
        snapRadius: 40,
        x: 500,
        y: 500,
        rects: {
          [level.target.slots[0].id]: { left: 20, top: 100, width: 80, height: 80 },
        },
      }),
    ).toBeNull()
  })
})
