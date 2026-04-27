import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Lock, RotateCcw, Settings, Volume2, VolumeX, X } from 'lucide-react'
import './App.css'
import {
  DEFAULT_SETTINGS,
  LEVELS,
  getChoicePlacementSoundId,
  levelById,
} from './game/content'
import {
  createHomeGameState,
  createInitialGameState,
  gameReducer,
  getNextLevelId,
  isLevelComplete,
} from './game/gameReducer'
import type { Choice, GameSettings, Slot } from './game/types'
import { SoundController } from './game/SoundController'
import { findBestSlot } from './game/matching'

type SlotRectMap = Record<string, DOMRect>

type DragState = {
  id: number
  choiceId: string
  pointerId: number
  x: number
  y: number
  originX: number
  originY: number
  status: 'dragging' | 'returning' | 'wrong'
}

const SETTINGS_KEY = 'tiny-phonics-settings'
const PROGRESS_KEY = 'tiny-phonics-progress'

type ProgressState = {
  lastLevelId: string
  completedLevelIds: string[]
}

function loadSettings(): GameSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY)
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

function loadProgress(): ProgressState {
  try {
    const saved = localStorage.getItem(PROGRESS_KEY)
    return saved
      ? { lastLevelId: LEVELS[0].id, completedLevelIds: [], ...JSON.parse(saved) }
      : { lastLevelId: LEVELS[0].id, completedLevelIds: [] }
  } catch {
    return { lastLevelId: LEVELS[0].id, completedLevelIds: [] }
  }
}

function choiceLabel(choice: Choice) {
  return choice.text.length === 1 ? `letter ${choice.text}` : choice.text
}

function getPoint(event: ReactPointerEvent<HTMLElement>) {
  return { x: event.clientX, y: event.clientY }
}

function App() {
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings())
  const [progress, setProgress] = useState(() => loadProgress())
  const [gameState, dispatch] = useState(() =>
    createHomeGameState(progress.lastLevelId),
  )
  const [drag, setDrag] = useState<DragState | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [parentGateStarted, setParentGateStarted] = useState(false)
  const slotRefs = useRef<Record<string, HTMLSpanElement | null>>({})
  const trayRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const gateTimer = useRef<number | null>(null)
  const gatePointer = useRef<number | null>(null)
  const gateRect = useRef<DOMRect | null>(null)
  const dragTimer = useRef<number | null>(null)
  const dragReturnTimer = useRef<number | null>(null)
  const dragId = useRef(0)
  const closeSettingsRef = useRef<HTMLButtonElement | null>(null)
  const sound = useRef<SoundController | null>(null)
  if (sound.current == null) {
    sound.current = new SoundController(settings)
  }

  const level = useMemo(
    () => levelById(gameState.levelId) ?? LEVELS[0],
    [gameState.levelId],
  )

  useEffect(
    () => () => {
      sound.current?.stopHold()
      if (dragTimer.current) window.clearTimeout(dragTimer.current)
      if (dragReturnTimer.current) window.clearTimeout(dragReturnTimer.current)
    },
    [],
  )

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      // Restricted storage should not break a toddler play session.
    }
    sound.current?.updateSettings(settings)
  }, [settings])

  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
    } catch {
      // Progress persistence is useful, but gameplay must continue without it.
    }
  }, [progress])

  useEffect(() => {
    if (!isSettingsOpen) return
    closeSettingsRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSettingsOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isSettingsOpen])

  const slotRects = useCallback((): SlotRectMap => {
    return Object.fromEntries(
      Object.entries(slotRefs.current)
        .filter((entry): entry is [string, HTMLSpanElement] => Boolean(entry[1]))
        .map(([slotId, element]) => [slotId, element.getBoundingClientRect()]),
    )
  }, [])

  const startLevel = useCallback(
    (levelId = progress.lastLevelId) => {
      sound.current?.unlock()
      dispatch(createInitialGameState(levelId))
    },
    [progress.lastLevelId],
  )

  const restartPack = useCallback(() => {
    const nextProgress = { lastLevelId: LEVELS[0].id, completedLevelIds: [] }
    setProgress(nextProgress)
    dispatch(createInitialGameState(LEVELS[0].id))
  }, [])

  const replayLevelSound = useCallback(() => {
    sound.current?.unlock()
    sound.current?.play(level.completionAudioId)
  }, [level.completionAudioId])

  const updateSettings = useCallback((patch: Partial<GameSettings>) => {
    setSettings((current) => ({ ...current, ...patch }))
  }, [])

  const cancelParentGate = () => {
    setParentGateStarted(false)
    gatePointer.current = null
    gateRect.current = null
    if (gateTimer.current) {
      window.clearTimeout(gateTimer.current)
      gateTimer.current = null
    }
  }

  const onParentGateDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    gatePointer.current = event.pointerId
    gateRect.current = event.currentTarget.getBoundingClientRect()
    setParentGateStarted(true)
    gateTimer.current = window.setTimeout(() => {
      setIsSettingsOpen(true)
      setParentGateStarted(false)
      gatePointer.current = null
      gateRect.current = null
    }, 1600)
  }

  const onParentGateMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (gatePointer.current !== event.pointerId || !gateRect.current) return
    const rect = gateRect.current
    const padding = 10
    const isInside =
      event.clientX >= rect.left - padding &&
      event.clientX <= rect.right + padding &&
      event.clientY >= rect.top - padding &&
      event.clientY <= rect.bottom + padding

    if (!isInside) {
      cancelParentGate()
    }
  }

  const onPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    choice: Choice,
  ) => {
    if (gameState.status !== 'playing' || drag) return

    event.currentTarget.setPointerCapture(event.pointerId)
    sound.current?.unlock()
    sound.current?.startHold(getChoicePlacementSoundId(choice))

    const point = getPoint(event)
    const rect = event.currentTarget.getBoundingClientRect()
    const nextDragId = dragId.current + 1
    dragId.current = nextDragId
    setDrag({
      id: nextDragId,
      choiceId: choice.id,
      pointerId: event.pointerId,
      x: point.x,
      y: point.y,
      originX: rect.left + rect.width / 2,
      originY: rect.top + rect.height / 2,
      status: 'dragging',
    })
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag || event.pointerId !== drag.pointerId) return

    const point = getPoint(event)
    setDrag((current) =>
      current ? { ...current, x: point.x, y: point.y, status: 'dragging' } : null,
    )
  }

  const onPointerCancel = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag || event.pointerId !== drag.pointerId) return
    const currentDragId = drag.id
    sound.current?.stopHold()
    setDrag((current) =>
      current?.id === currentDragId ? { ...current, status: 'returning' } : current,
    )
    dragReturnTimer.current = window.setTimeout(
      () =>
        setDrag((current) => (current?.id === currentDragId ? null : current)),
      260,
    )
  }

  const onPointerUp = (
    event: ReactPointerEvent<HTMLButtonElement>,
    choice: Choice,
  ) => {
    if (!drag || event.pointerId !== drag.pointerId) return

    const point = getPoint(event)
    const rects = slotRects()
    const snapRadius = Math.max(
      44,
      Math.min(66, Math.min(window.innerWidth, window.innerHeight) * 0.08),
    )
    const nearest = findBestSlot({
      choice,
      level,
      state: gameState,
      rects,
      x: point.x,
      y: point.y,
      snapRadius,
    })

    sound.current?.stopHold()

    if (nearest) {
      sound.current?.play(getChoicePlacementSoundId(choice), { placement: true })
      dispatch((current) =>
        gameReducer(current, {
          type: 'PLACE_CHOICE',
          slotId: nearest.id,
          choice,
        }),
      )
      setDrag(null)
      return
    }

    sound.current?.play('fx_retry')
    const currentDragId = drag.id
    setDrag((current) =>
      current?.id === currentDragId ? { ...current, status: 'wrong' } : current,
    )
    dragTimer.current = window.setTimeout(() => {
      setDrag((current) =>
        current?.id === currentDragId ? { ...current, status: 'returning' } : current,
      )
      dragReturnTimer.current = window.setTimeout(
        () =>
          setDrag((current) => (current?.id === currentDragId ? null : current)),
        260,
      )
    }, 180)
  }

  const placeByKeyboard = (choice: Choice) => {
    if (gameState.status !== 'playing') return

    const openSlot = level.target.slots.find(
      (slot) =>
        !slot.fixed && !gameState.slots[slot.id] && slot.accepts.includes(choice.id),
    )
    if (!openSlot) {
      sound.current?.play('fx_retry')
      return
    }

    sound.current?.unlock()
    sound.current?.play(getChoicePlacementSoundId(choice), { placement: true })
    dispatch((current) =>
      gameReducer(current, {
        type: 'PLACE_CHOICE',
        slotId: openSlot.id,
        choice,
      }),
    )
  }

  useEffect(() => {
    if (!isLevelComplete(gameState, level)) return

    const timer = window.setTimeout(() => {
      sound.current?.play(level.completionAudioId)
      dispatch((current) => gameReducer(current, { type: 'COMPLETE_LEVEL' }))
      setProgress((current) => ({
        lastLevelId: level.id,
        completedLevelIds: Array.from(
          new Set([...current.completedLevelIds, level.id]),
        ),
      }))
    }, 450)

    return () => window.clearTimeout(timer)
  }, [gameState, level])

  useEffect(() => {
    if (gameState.status !== 'levelComplete') return

    const nextLevelId = getNextLevelId(gameState.levelId)
    const timer = window.setTimeout(() => {
      if (!nextLevelId) {
        dispatch((current) => gameReducer(current, { type: 'COMPLETE_PACK' }))
        return
      }

      setProgress((current) => ({ ...current, lastLevelId: nextLevelId }))
      dispatch(createInitialGameState(nextLevelId))
    }, 1900)

    return () => window.clearTimeout(timer)
  }, [gameState.levelId, gameState.status])

  const placedChoiceIds = new Set(Object.values(gameState.slots))
  const availableChoices = level.choices.filter(
    (choice) => !placedChoiceIds.has(choice.id),
  )
  const activeChoice = level.choices.find((choice) => choice.id === drag?.choiceId)
  const isReducedMotion = settings.reducedMotion
  const completeCount = progress.completedLevelIds.length

  return (
    <main className={`app-shell ${isReducedMotion ? 'reduced-motion' : ''}`}>
      {gameState.status === 'home' ? (
        <section className="start-screen" aria-label="Start game">
          <div className="start-copy">
            <p className="eyebrow">tiny phonics</p>
            <h1>Touch, hear, drag.</h1>
            <p>
              Big bouncy letters, clear sounds, and simple first words for
              tablet play.
            </p>
          </div>
          <button className="primary-start" type="button" onClick={() => startLevel()}>
            <Volume2 aria-hidden="true" />
            Play
          </button>
        </section>
      ) : (
        <section className="game-screen" aria-label="Letter matching game">
          <header className="game-header">
            <button
              className="icon-button sound-button"
              type="button"
              onClick={replayLevelSound}
              aria-label="Replay word sound"
              title="Replay sound"
            >
              <Volume2 aria-hidden="true" />
            </button>
            <div className="level-progress" aria-live="polite">
              <span>{level.title}</span>
              <strong>
                {completeCount}/{LEVELS.length}
              </strong>
            </div>
            <button
              className={`icon-button parent-gate ${parentGateStarted ? 'holding' : ''}`}
              type="button"
              onPointerDown={onParentGateDown}
              onPointerMove={onParentGateMove}
              onPointerUp={cancelParentGate}
              onPointerCancel={cancelParentGate}
              onLostPointerCapture={cancelParentGate}
              aria-label="Hold for grown-up settings"
              title="Hold for settings"
            >
              <Settings aria-hidden="true" />
            </button>
          </header>

          <div className="prompt-line" aria-live="polite">
            {level.promptText}
          </div>

          <TargetWord
            slots={level.target.slots}
            slotState={gameState.slots}
            choices={level.choices}
            slotRefs={slotRefs}
          />

          {gameState.status === 'levelComplete' && (
            <div className="celebration" aria-live="assertive">
              <span>pop!</span>
              <i />
              <i />
              <i />
            </div>
          )}

          {gameState.status === 'packComplete' && (
            <div className="pack-complete">
              <h2>All done!</h2>
              <button type="button" onClick={restartPack}>
                <RotateCcw aria-hidden="true" />
                Play again
              </button>
            </div>
          )}

          <div className="choice-tray" aria-label="Letter choices">
            {availableChoices.map((choice, index) => {
              const isActive = drag?.choiceId === choice.id
              const style = {
                '--tile-color': choice.color,
                '--idle-delay': `${index * 120}ms`,
              } as React.CSSProperties

              return (
                <button
                  key={choice.id}
                  ref={(node) => {
                    trayRefs.current[choice.id] = node
                  }}
                  className={`letter-tile ${isActive ? `is-${drag?.status}` : ''}`}
                  type="button"
                  style={style}
                  onPointerDown={(event) => onPointerDown(event, choice)}
                  onPointerMove={onPointerMove}
                  onPointerUp={(event) => onPointerUp(event, choice)}
                  onPointerCancel={onPointerCancel}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      placeByKeyboard(choice)
                    }
                  }}
                  aria-label={`Drag ${choiceLabel(choice)}`}
                >
                  <span>{choice.text}</span>
                </button>
              )
            })}
          </div>

          {drag && activeChoice && (
            <div
              className={`drag-ghost is-${drag.status}`}
              style={
                {
                  '--tile-color': activeChoice.color,
                  '--drag-x': `${drag.x}px`,
                  '--drag-y': `${drag.y}px`,
                  '--origin-x': `${drag.originX}px`,
                  '--origin-y': `${drag.originY}px`,
                } as React.CSSProperties
              }
              aria-hidden="true"
            >
              {activeChoice.text}
            </div>
          )}
        </section>
      )}

      {isSettingsOpen && (
        <SettingsPanel
          settings={settings}
          onChange={updateSettings}
          onClose={() => setIsSettingsOpen(false)}
          onRestart={restartPack}
          closeRef={closeSettingsRef}
        />
      )}
    </main>
  )
}

type TargetWordProps = {
  slots: Slot[]
  slotState: Record<string, string>
  choices: Choice[]
  slotRefs: React.MutableRefObject<Record<string, HTMLSpanElement | null>>
}

function TargetWord({ slots, slotState, choices, slotRefs }: TargetWordProps) {
  return (
    <div className="target-word" aria-label="Target word">
      {slots.map((slot) => {
        const choice = choices.find((candidate) => candidate.id === slotState[slot.id])
        const text = slot.fixed ? slot.text : choice?.text ?? slot.text

        return (
          <span
            key={slot.id}
            ref={(node) => {
              slotRefs.current[slot.id] = node
            }}
            className={`target-slot ${slot.fixed || choice ? 'filled' : 'empty'}`}
            style={
              choice
                ? ({ '--filled-color': choice.color } as React.CSSProperties)
                : undefined
            }
          >
            {text}
          </span>
        )
      })}
    </div>
  )
}

type SettingsPanelProps = {
  settings: GameSettings
  onChange: (patch: Partial<GameSettings>) => void
  onClose: () => void
  onRestart: () => void
  closeRef: React.MutableRefObject<HTMLButtonElement | null>
}

function SettingsPanel({
  settings,
  onChange,
  onClose,
  onRestart,
  closeRef,
}: SettingsPanelProps) {
  return (
    <div className="settings-backdrop" role="presentation">
      <section
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <header>
          <div>
            <p className="eyebrow">grown-up</p>
            <h2 id="settings-title">Settings</h2>
          </div>
          <button
            ref={closeRef}
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            title="Close"
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <label className="toggle-row">
          <span>
            {settings.muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
            Sound
          </span>
          <input
            type="checkbox"
            checked={!settings.muted}
            onChange={(event) => onChange({ muted: !event.target.checked })}
          />
        </label>

        <label className="range-row">
          <span>Volume</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.volume}
            onChange={(event) => onChange({ volume: Number(event.target.value) })}
          />
        </label>

        <label className="toggle-row">
          <span>
            <Lock aria-hidden="true" />
            Reduced motion
          </span>
          <input
            type="checkbox"
            checked={settings.reducedMotion}
            onChange={(event) => onChange({ reducedMotion: event.target.checked })}
          />
        </label>

        <div className="segmented" aria-label="Voice intensity">
          {(['calm', 'jumpy', 'extra'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={settings.voiceIntensity === mode ? 'selected' : ''}
              onClick={() => onChange({ voiceIntensity: mode })}
            >
              {mode}
            </button>
          ))}
        </div>

        <button className="restart-button" type="button" onClick={onRestart}>
          <RotateCcw aria-hidden="true" />
          Restart first pack
        </button>
      </section>
    </div>
  )
}

export default App
