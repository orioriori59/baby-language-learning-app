import type { Choice, GameState, Level, Slot } from './types'

export type SimpleRect = {
  left: number
  top: number
  width: number
  height: number
}

export function distanceToRectCenter(x: number, y: number, rect: SimpleRect) {
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  return Math.hypot(centerX - x, centerY - y)
}

export function findBestSlot({
  choice,
  level,
  state,
  rects,
  x,
  y,
  snapRadius,
}: {
  choice: Choice
  level: Level
  state: GameState
  rects: Record<string, SimpleRect>
  x: number
  y: number
  snapRadius: number
}): Slot | null {
  const candidates = level.target.slots
    .filter((slot) => !slot.fixed && slot.accepts.includes(choice.id))
    .filter((slot) => !state.slots[slot.id])
    .map((slot) => ({
      slot,
      distance: rects[slot.id]
        ? distanceToRectCenter(x, y, rects[slot.id])
        : Number.POSITIVE_INFINITY,
    }))
    .sort((a, b) => a.distance - b.distance)

  const nearest = candidates[0]
  return nearest && nearest.distance <= snapRadius ? nearest.slot : null
}
