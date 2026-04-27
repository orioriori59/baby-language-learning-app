import { LEVELS, levelById } from './content'
import type { GameAction, GameState, Level } from './types'

export function createInitialGameState(levelId = LEVELS[0].id): GameState {
  return {
    status: 'playing',
    levelId,
    slots: {},
    attempts: 0,
  }
}

export function createHomeGameState(levelId = LEVELS[0].id): GameState {
  return {
    status: 'home',
    levelId,
    slots: {},
    attempts: 0,
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'PLACE_CHOICE':
      if (state.status !== 'playing') return state
      return {
        ...state,
        attempts: state.attempts + 1,
        slots: {
          ...state.slots,
          [action.slotId]: action.choice.id,
        },
      }
    case 'COMPLETE_LEVEL':
      return {
        ...state,
        status: 'levelComplete',
      }
    case 'COMPLETE_PACK':
      return {
        ...state,
        status: 'packComplete',
      }
    default:
      return state
  }
}

export function isLevelComplete(state: GameState, level: Level): boolean {
  if (state.status !== 'playing') return false

  return level.target.slots
    .filter((slot) => !slot.fixed)
    .every((slot) => state.slots[slot.id])
}

export function getNextLevelId(levelId: string): string | null {
  const index = LEVELS.findIndex((level) => level.id === levelId)
  return LEVELS[index + 1]?.id ?? null
}

export function validateLevels(levels = LEVELS): string[] {
  const errors: string[] = []

  for (const level of levels) {
    const choiceIds = new Set(level.choices.map((choice) => choice.id))
    const slotIds = new Set<string>()

    if (!level.target.slots.length) {
      errors.push(`${level.id} has no slots`)
    }

    for (const slot of level.target.slots) {
      if (slotIds.has(slot.id)) {
        errors.push(`${level.id} has duplicate slot ${slot.id}`)
      }
      slotIds.add(slot.id)

      for (const accepted of slot.accepts) {
        if (!choiceIds.has(accepted) && !slot.fixed) {
          errors.push(`${level.id} slot ${slot.id} accepts missing choice ${accepted}`)
        }
      }
    }

    if (!levelById(level.id)) {
      errors.push(`${level.id} is not discoverable by id`)
    }
  }

  return errors
}
