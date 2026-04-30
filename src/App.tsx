import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  ArrowLeft,
  Check,
  Lock,
  Play,
  RotateCcw,
  Settings,
  Star,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import './App.css'
import {
  CATEGORIES,
  DEFAULT_SETTINGS,
  LEVELS,
  getChoicePlacementSoundId,
  getNextCategoryTitle,
  getNextLevelId,
  getNextRecommendedLevelId,
  isLastLevelInCategory,
  levelById,
  stripNikkud,
} from './game/content'
import {
  createHomeGameState,
  createInitialGameState,
  gameReducer,
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
  const fallback = { lastLevelId: LEVELS[0].id, completedLevelIds: [] }
  try {
    const saved = localStorage.getItem(PROGRESS_KEY)
    if (!saved) return fallback

    const parsed = { ...fallback, ...JSON.parse(saved) } as ProgressState
    const completedLevelIds = parsed.completedLevelIds.filter((levelId) =>
      Boolean(levelById(levelId)),
    )
    const lastLevelId = levelById(parsed.lastLevelId)
      ? parsed.lastLevelId
      : getNextRecommendedLevelId(completedLevelIds)

    return { lastLevelId, completedLevelIds }
  } catch {
    return fallback
  }
}

function choiceLabel(choice: Choice) {
  if (choice.kind === 'letter') return `אות ${choice.text}`
  if (choice.kind === 'syllable') return `צירוף ${choice.text}`
  return choice.text
}

function tileClass(choice: Choice, isActive: boolean, dragStatus?: DragState['status']) {
  return [
    'letter-tile',
    `${choice.kind}-tile`,
    stripNikkud(choice.text).length > 1 ? 'word-tile' : '',
    isActive ? `is-${dragStatus}` : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function slotClass(text: string, isFilled: boolean) {
  const plain = stripNikkud(text)
  return [
    'target-slot',
    text !== plain ? 'nikkud-slot' : '',
    plain.length > 1 ? 'word-slot' : '',
    isFilled ? 'filled' : 'empty',
  ]
    .filter(Boolean)
    .join(' ')
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
  const [entryLevelId, setEntryLevelId] = useState<string | null>(null)
  const dragRef = useRef<DragState | null>(null)
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

  const setCurrentDrag = useCallback((nextDrag: DragState | null) => {
    dragRef.current = nextDrag
    setDrag(nextDrag)
  }, [])

  const updateCurrentDrag = useCallback(
    (updater: (current: DragState | null) => DragState | null) => {
      const nextDrag = updater(dragRef.current)
      dragRef.current = nextDrag
      setDrag(nextDrag)
    },
    [],
  )

  const level = useMemo(
    () => levelById(gameState.levelId) ?? LEVELS[0],
    [gameState.levelId],
  )
  const recommendedLevelId = useMemo(
    () => getNextRecommendedLevelId(progress.completedLevelIds),
    [progress.completedLevelIds],
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
    (levelId = recommendedLevelId) => {
      sound.current?.unlock()
      setEntryLevelId(null)
      setProgress((current) => ({ ...current, lastLevelId: levelId }))
      dispatch(createInitialGameState(levelId))
    },
    [recommendedLevelId],
  )

  const returnToPath = useCallback(() => {
    sound.current?.stopHold()
    setDrag(null)
    dispatch(createHomeGameState(progress.lastLevelId))
  }, [progress.lastLevelId])

  const restartPack = useCallback(() => {
    const nextProgress = { lastLevelId: LEVELS[0].id, completedLevelIds: [] }
    setProgress(nextProgress)
    dispatch(createInitialGameState(LEVELS[0].id))
  }, [])

  const replayLevelSound = useCallback(() => {
    sound.current?.unlock()
    sound.current?.play(level.completionAudioId)
  }, [level.completionAudioId])

  useEffect(() => {
    const levelSoundIds = [
      level.completionAudioId,
      'fx_pop',
      'fx_retry',
      'fx_word_complete',
      ...level.choices.flatMap((choice) => [
        choice.soundId,
        getChoicePlacementSoundId(choice),
      ]),
    ]
    sound.current?.preload(levelSoundIds)
  }, [level])

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
    if (gameState.status !== 'playing' || dragRef.current) return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    sound.current?.unlock()
    sound.current?.startHold(getChoicePlacementSoundId(choice))

    const point = getPoint(event)
    const rect = event.currentTarget.getBoundingClientRect()
    const nextDragId = dragId.current + 1
    dragId.current = nextDragId
    setCurrentDrag({
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

  const returnDrag = useCallback(
    (currentDragId: number, status: DragState['status'] = 'returning') => {
      updateCurrentDrag((current) =>
        current?.id === currentDragId ? { ...current, status } : current,
      )
      dragReturnTimer.current = window.setTimeout(
        () =>
          updateCurrentDrag((current) =>
            current?.id === currentDragId ? null : current,
          ),
        260,
      )
    },
    [updateCurrentDrag],
  )

  const cancelDrag = useCallback(
    (pointerId: number) => {
      const currentDrag = dragRef.current
      if (!currentDrag || pointerId !== currentDrag.pointerId) return
      sound.current?.stopHold()
      returnDrag(currentDrag.id)
    },
    [returnDrag],
  )

  const moveDrag = useCallback(
    (pointerId: number, x: number, y: number) => {
      const currentDrag = dragRef.current
      if (!currentDrag || pointerId !== currentDrag.pointerId) return

      updateCurrentDrag((current) =>
        current
          ? {
              ...current,
              x,
              y,
              status: 'dragging',
            }
          : null,
      )
    },
    [updateCurrentDrag],
  )

  const finishDrag = useCallback(
    (pointerId: number, x: number, y: number) => {
      const currentDrag = dragRef.current
      if (!currentDrag || pointerId !== currentDrag.pointerId) return
      const dropX = currentDrag.x || x
      const dropY = currentDrag.y || y

      const choice = level.choices.find((candidate) => candidate.id === currentDrag.choiceId)
      if (!choice) {
        cancelDrag(pointerId)
        return
      }

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
        x: dropX,
        y: dropY,
        snapRadius,
      }) ?? findBestSlot({
        choice,
        level,
        state: gameState,
        rects,
        x,
        y,
        snapRadius: Math.max(snapRadius, 260),
      })

      sound.current?.stopHold()

      if (nearest) {
        sound.current?.play('fx_pop')
        sound.current?.play(getChoicePlacementSoundId(choice), { placement: true })
        dispatch((current) =>
          gameReducer(current, {
            type: 'PLACE_CHOICE',
            slotId: nearest.id,
            choice,
          }),
        )
        setCurrentDrag(null)
        return
      }

      sound.current?.play('fx_retry')
      const currentDragId = currentDrag.id
      updateCurrentDrag((current) =>
        current?.id === currentDragId ? { ...current, status: 'wrong' } : current,
      )
      dragTimer.current = window.setTimeout(() => {
        returnDrag(currentDragId)
      }, 180)
    },
    [cancelDrag, gameState, level, returnDrag, setCurrentDrag, slotRects, updateCurrentDrag],
  )

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    moveDrag(event.pointerId, event.clientX, event.clientY)
  }

  const onPointerCancel = (event: ReactPointerEvent<HTMLButtonElement>) => {
    cancelDrag(event.pointerId)
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    finishDrag(event.pointerId, event.clientX, event.clientY)
  }

  useEffect(() => {
    if (!drag) return

    const onWindowPointerMove = (event: PointerEvent) => {
      moveDrag(event.pointerId, event.clientX, event.clientY)
    }

    const onWindowPointerUp = (event: PointerEvent) => {
      finishDrag(event.pointerId, event.clientX, event.clientY)
    }

    const onWindowPointerCancel = (event: PointerEvent) => {
      cancelDrag(event.pointerId)
    }

    window.addEventListener('pointermove', onWindowPointerMove)
    window.addEventListener('pointerup', onWindowPointerUp)
    window.addEventListener('pointercancel', onWindowPointerCancel)

    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove)
      window.removeEventListener('pointerup', onWindowPointerUp)
      window.removeEventListener('pointercancel', onWindowPointerCancel)
    }
  }, [cancelDrag, drag, finishDrag, moveDrag])

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
    sound.current?.play('fx_pop')
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
      sound.current?.play('fx_word_complete')
      if (level.completionAudioId.startsWith('he_word_')) {
        window.setTimeout(() => sound.current?.play(level.completionAudioId), 520)
      }
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

  const continueAfterComplete = useCallback(() => {
    const nextLevelId = getNextLevelId(gameState.levelId)
    if (!nextLevelId) {
      dispatch((current) => gameReducer(current, { type: 'COMPLETE_PACK' }))
      return
    }

    setProgress((current) => ({ ...current, lastLevelId: nextLevelId }))
    dispatch(createInitialGameState(nextLevelId))
  }, [gameState.levelId])

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
        <>
          <StagePath
            completedLevelIds={progress.completedLevelIds}
            recommendedLevelId={recommendedLevelId}
            onStartLevel={(levelId) => setEntryLevelId(levelId ?? recommendedLevelId)}
          />
          {entryLevelId && (
            <LevelEntryDialog
              levelId={entryLevelId}
              onClose={() => setEntryLevelId(null)}
              onStart={() => startLevel(entryLevelId)}
            />
          )}
        </>
      ) : (
        <section
          className={[
            'game-screen',
            level.levelKind === 'letter-match' ? 'letter-only-level' : '',
            drag ? 'is-dragging-choice' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-label="משחק התאמת אותיות"
        >
          <header className="game-header">
            <button
              className="icon-button path-button"
              type="button"
              onClick={returnToPath}
              aria-label="חזרה לשביל"
              title="חזרה לשביל"
            >
              <ArrowLeft aria-hidden="true" />
            </button>
            <button
              className="icon-button sound-button"
              type="button"
              onClick={replayLevelSound}
              aria-label="השמיעו שוב"
              title="השמיעו שוב"
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
              aria-label="לחצו לחיצה ארוכה להגדרות"
              title="לחיצה ארוכה להגדרות"
            >
              <Settings aria-hidden="true" />
            </button>
          </header>

          <div className="lesson-copy" aria-live="polite">
            <p>{level.promptText}</p>
            <span>{level.categoryTitle}</span>
          </div>

          <TargetWord
            slots={level.target.slots}
            slotState={gameState.slots}
            choices={level.choices}
            slotRefs={slotRefs}
          />

          {gameState.status === 'levelComplete' && (
            <CompletionDialog levelId={level.id} onContinue={continueAfterComplete} />
          )}

          {gameState.status === 'packComplete' && (
            <div className="pack-complete">
              <h2>סיימנו!</h2>
              <button type="button" onClick={restartPack}>
                <RotateCcw aria-hidden="true" />
                שחקו שוב
              </button>
            </div>
          )}

          <div className="choice-tray" aria-label="אפשרויות לבחירה">
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
                  className={tileClass(choice, isActive, drag?.status)}
                  type="button"
                  style={style}
                  onPointerDown={(event) => onPointerDown(event, choice)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerCancel}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      placeByKeyboard(choice)
                    }
                  }}
                  aria-label={`גררו ${choiceLabel(choice)}`}
                >
                  <span>{choice.text}</span>
                </button>
              )
            })}
          </div>

          <div className="lesson-hills" aria-hidden="true">
            <span />
            <i />
            <b />
          </div>

          {drag && activeChoice && (
            <div
              className={`drag-ghost ${activeChoice.kind}-tile ${
                stripNikkud(activeChoice.text).length > 1 ? 'word-tile' : ''
              } is-${drag.status}`}
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

type StagePathProps = {
  completedLevelIds: string[]
  recommendedLevelId: string
  onStartLevel: (levelId?: string) => void
}

function StagePath({
  completedLevelIds,
  recommendedLevelId,
  onStartLevel,
}: StagePathProps) {
  const recommendedNodeRef = useRef<HTMLButtonElement | null>(null)
  const completed = new Set(completedLevelIds)
  const completedCount = LEVELS.filter((level) => completed.has(level.id)).length
  const recommendedLevel = levelById(recommendedLevelId) ?? LEVELS[0]
  const activeCategory =
    CATEGORIES.find((category) => category.id === recommendedLevel.categoryId) ?? CATEGORIES[0]
  const levelGap = 78
  const trailTop = 104
  const trailBottom = 190
  const trailHeight = trailTop + (LEVELS.length - 1) * levelGap + trailBottom
  const trailXs = [238, 182, 126, 178, 236, 206, 148, 112, 164, 224]
  const trailPoints = LEVELS.map((_, index) => ({
    x: trailXs[index % trailXs.length],
    y: trailTop + index * levelGap,
  }))
  const trailPath = trailPoints.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`
    const previous = trailPoints[index - 1]
    const controlY = previous.y + (point.y - previous.y) / 2
    return `${path} C ${previous.x} ${controlY}, ${point.x} ${controlY}, ${point.x} ${point.y}`
  }, '')

  useEffect(() => {
    recommendedNodeRef.current?.scrollIntoView({
      block: 'center',
      inline: 'nearest',
    })
  }, [recommendedLevelId])

  return (
    <section className="stage-path" aria-label="שביל השלבים" data-testid="stage-path">
      <header
        className="path-hero"
        style={{ '--active-category-color': activeCategory.color } as React.CSSProperties}
      >
        <span className="hero-sparkle hero-sparkle-right" aria-hidden="true">✦</span>
        <span className="hero-sparkle hero-sparkle-left" aria-hidden="true">✦</span>
        <div className="path-brand">
          <h1>
            <span>עברית</span> קטנה
          </h1>
        </div>
        <p>שביל משחקי ללמידת עברית</p>
      </header>

      <div className="path-phone" style={{ '--trail-height': `${trailHeight}px` } as React.CSSProperties}>
        <div className="phone-hud">
          <button className="mini-icon" type="button" aria-label="הגדרות">
            <Settings aria-hidden="true" />
          </button>
        </div>

        <div className="phone-title">
          <h2>
            <span>עברית</span> קטנה
          </h2>
          <p>בואו ללמוד יחד!</p>
        </div>

        <div className="trail-wrap">
          <svg
            className="trail-svg"
            viewBox={`0 0 360 ${trailHeight}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path className="trail-shadow" d={trailPath} />
            <path className="trail-base" d={trailPath} />
            {trailPoints.slice(1).map((point, index) => (
              <rect
                key={`${point.x}-${point.y}`}
                className="trail-stone"
                x={point.x - 11}
                y={point.y - 76}
                width="22"
                height="13"
                rx="3"
                transform={`rotate(${index % 2 === 0 ? -22 : 24} ${point.x} ${point.y - 70})`}
              />
            ))}
          </svg>
          <div className="category-rail" aria-hidden="true">
            {CATEGORIES.map((category) => {
              const firstLevelIndex = LEVELS.findIndex((level) => level.categoryId === category.id)
              const point = trailPoints[Math.max(firstLevelIndex, 0)]

              return (
                <span
                  key={category.id}
                  style={
                    {
                      '--category-color': category.color,
                      '--category-y': `${point.y - 64}px`,
                    } as React.CSSProperties
                  }
                >
                  <b>{category.order}</b>
                  {category.title}
                </span>
              )
            })}
          </div>
          <div className="level-dots" aria-label="שלבי הלמידה">
            {LEVELS.map((level, index) => {
              const category = CATEGORIES.find((item) => item.id === level.categoryId) ?? activeCategory
              const isCompleted = completed.has(level.id)
              const isNext = level.id === recommendedLevel.id
              const isUnlocked = isCompleted || isNext
              const point = trailPoints[index]

              return (
                <button
                  key={level.id}
                  ref={isNext ? recommendedNodeRef : undefined}
                  type="button"
                  data-testid="level-node"
                  data-level-id={level.id}
                  data-level-index={index + 1}
                  data-level-status={
                    isCompleted ? 'completed' : isNext ? 'next' : 'locked'
                  }
                  className={[
                    'level-dot',
                    isCompleted ? 'completed' : '',
                    isNext ? 'next' : '',
                    !isUnlocked ? 'locked' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    if (isUnlocked) onStartLevel(level.id)
                  }}
                  disabled={!isUnlocked}
                  aria-label={`${level.title}, ${
                    isCompleted ? 'הושלם' : isNext ? 'השלב הבא' : 'נעול'
                  }`}
                  style={
                    {
                      '--node-index': index,
                      '--category-color': category.color,
                      '--map-x': `${point.x}px`,
                      '--map-y': `${point.y}px`,
                    } as React.CSSProperties
                  }
                >
                  {isNext && <em aria-hidden="true">השלב הבא</em>}
                  <span>
                    {isCompleted ? (
                      <Check aria-hidden="true" />
                    ) : isNext ? (
                      index + 1
                    ) : (
                      <Lock aria-hidden="true" />
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <button
          className="primary-start"
          type="button"
          onClick={() => onStartLevel(recommendedLevel.id)}
        >
          <Play aria-hidden="true" />
          המשיכו
        </button>
      </div>

      <div className="path-summary" aria-live="polite">
        <span>השלב הבא: {recommendedLevel.title}</span>
        <strong>
          {completedCount}/{LEVELS.length}
        </strong>
      </div>
    </section>
  )
}

function levelNumber(levelId: string) {
  return LEVELS.findIndex((candidate) => candidate.id === levelId) + 1
}

function LevelEntryDialog({
  levelId,
  onClose,
  onStart,
}: {
  levelId: string
  onClose: () => void
  onStart: () => void
}) {
  const level = levelById(levelId) ?? LEVELS[0]
  return (
    <div className="modal-layer entry-layer" role="presentation">
      <section className="entry-card" role="dialog" aria-modal="true" aria-labelledby="entry-title">
        <button className="mini-icon entry-close" type="button" onClick={onClose} aria-label="סגירה">
          <X aria-hidden="true" />
        </button>
        <div className="entry-orbit" aria-hidden="true">
          <Star />
          <i />
          <b />
        </div>
        <div className="entry-number">{levelNumber(level.id)}</div>
        <div className="entry-ribbon">שלב {levelNumber(level.id)}</div>
        <h2 id="entry-title">התחילו!</h2>
        <p>{level.title}</p>
        <button className="primary-start entry-start" type="button" onClick={onStart}>
          <Play aria-hidden="true" />
          בואו נלמד
        </button>
      </section>
    </div>
  )
}

function CompletionDialog({ levelId, onContinue }: { levelId: string; onContinue: () => void }) {
  const level = levelById(levelId) ?? LEVELS[0]
  const nextLevelId = getNextLevelId(levelId)
  const nextLevel = nextLevelId ? levelById(nextLevelId) : null
  const nextCategoryTitle = getNextCategoryTitle(levelId)

  return (
    <div className="modal-layer completion-layer" role="presentation">
      <section className="complete-card" role="dialog" aria-modal="true" aria-labelledby="complete-title">
        <div className="confetti" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="complete-banner" id="complete-title">
          כל הכבוד!
        </div>
        <div className="complete-star" aria-hidden="true">
          <Star />
        </div>
        <h2>סיימתם את שלב {levelNumber(level.id)}</h2>
        <p>מעולה!</p>
        <div className="unlock-list">
          {nextLevel && (
            <div className="unlock-item next-unlock">
              <span>{levelNumber(nextLevel.id)}</span>
              <div>
                <strong>שלב {levelNumber(nextLevel.id)}</strong>
                <p>{nextLevel.title}</p>
              </div>
            </div>
          )}
          {isLastLevelInCategory(levelId) && nextCategoryTitle && (
            <div className="unlock-item category-unlock">
              <span><Lock aria-hidden="true" /></span>
              <div>
                <strong>נפתחה קטגוריה חדשה!</strong>
                <p>{nextCategoryTitle}</p>
              </div>
            </div>
          )}
        </div>
        <button className="primary-start complete-continue" type="button" onClick={onContinue}>
          המשיכו
        </button>
      </section>
    </div>
  )
}

function TargetWord({ slots, slotState, choices, slotRefs }: TargetWordProps) {
  return (
    <div className="target-word" aria-label="מילת יעד">
      {slots.map((slot) => {
        const choice = choices.find((candidate) => candidate.id === slotState[slot.id])
        const text = slot.fixed ? slot.text : choice?.text ?? slot.text

        return (
          <span
            key={slot.id}
            ref={(node) => {
              slotRefs.current[slot.id] = node
            }}
            className={slotClass(text, Boolean(slot.fixed || choice))}
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
            <p className="eyebrow">מבוגרים</p>
            <h2 id="settings-title">הגדרות</h2>
          </div>
          <button
            ref={closeRef}
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="סגירת הגדרות"
            title="סגירה"
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <label className="toggle-row">
          <span>
            {settings.muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
            צליל
          </span>
          <input
            type="checkbox"
            checked={!settings.muted}
            onChange={(event) => onChange({ muted: !event.target.checked })}
          />
        </label>

        <label className="range-row">
          <span>עוצמה</span>
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
            תנועה מופחתת
          </span>
          <input
            type="checkbox"
            checked={settings.reducedMotion}
            onChange={(event) => onChange({ reducedMotion: event.target.checked })}
          />
        </label>

        <div className="segmented" aria-label="סגנון קול">
          {(['calm', 'jumpy', 'extra'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={settings.voiceIntensity === mode ? 'selected' : ''}
              onClick={() => onChange({ voiceIntensity: mode })}
            >
              {mode === 'calm' ? 'רגוע' : mode === 'jumpy' ? 'קופצני' : 'חזק'}
            </button>
          ))}
        </div>

        <button className="restart-button" type="button" onClick={onRestart}>
          <RotateCcw aria-hidden="true" />
          להתחיל מהתחלה
        </button>
      </section>
    </div>
  )
}

export default App
