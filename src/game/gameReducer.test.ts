import { describe, expect, it } from 'vitest'
import { LEVELS } from './content'
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

  it('starts with letters and includes CVC progression', () => {
    expect(LEVELS[0].difficulty).toBe('letters')
    expect(LEVELS.some((level) => level.difficulty === 'cvc-word')).toBe(true)
  })
})

describe('game reducer', () => {
  it('places a choice and completes only when required slots are filled', () => {
    const level = LEVELS.find((candidate) => candidate.id === 'cat-missing-a')!
    const state = createInitialGameState(level.id)
    const missingSlot = level.target.slots.find((slot) => !slot.fixed)!

    expect(isLevelComplete(state, level)).toBe(false)

    const placed = gameReducer(state, {
      type: 'PLACE_CHOICE',
      slotId: missingSlot.id,
      choice: level.choices[0],
    })

    expect(placed.slots[missingSlot.id]).toBe('a')
    expect(placed.attempts).toBe(1)
    expect(isLevelComplete(placed, level)).toBe(true)
  })

  it('advances through the configured level order', () => {
    expect(getNextLevelId(LEVELS[0].id)).toBe(LEVELS[1].id)
    expect(getNextLevelId(LEVELS.at(-1)!.id)).toBeNull()
  })
})

describe('snap matching', () => {
  it('returns the nearest compatible empty slot inside the snap radius', () => {
    const level = LEVELS.find((candidate) => candidate.id === 'sun-full')!
    const state = createInitialGameState(level.id)
    const choice = level.choices.find((candidate) => candidate.id === 'u')!
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
    const level = LEVELS.find((candidate) => candidate.id === 'sun-full')!
    const state = createInitialGameState(level.id)
    const choice = level.choices.find((candidate) => candidate.id === 's')!

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
