import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
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
  getChoiceHoldSoundId,
  getChoicePlacementSoundId,
  getNextCategoryTitle,
  getNextLevelId,
  getNextRecommendedLevelId,
  hasRecordedAudio,
  isLastLevelInCategory,
  levelById,
  stripNikkud,
} from './game/content'
import { AUDIO_SAMPLE_CLIPS, type AudioSampleClip } from './game/audioSamples'
import {
  createHomeGameState,
  createInitialGameState,
  gameReducer,
  isLevelComplete,
} from './game/gameReducer'
import type { Choice, GameSettings, GameState, Level, Slot, SuccessFanfare } from './game/types'
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

type FeedbackBurst = {
  id: number
  kind: 'failure'
  x: number
  y: number
}

type SuccessBurst = {
  id: number
  x: number
  y: number
}

type TrailUnlock = {
  id: number
  categoryId: string
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

function sameOrder(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function acceptedChoiceOrder(levelId: string) {
  const level = levelById(levelId) ?? LEVELS[0]
  const choiceIds = new Set(level.choices.map((choice) => choice.id))
  const acceptedIds: string[] = []

  for (const slot of level.target.slots) {
    if (slot.fixed) continue
    const accepted = slot.accepts.find((choiceId) => choiceIds.has(choiceId))
    if (accepted && !acceptedIds.includes(accepted)) acceptedIds.push(accepted)
  }

  return acceptedIds
}

function createChoiceOrder(levelId: string, previousOrder: string[] = []) {
  const level = levelById(levelId) ?? LEVELS[0]
  const baseOrder = level.choices.map((choice) => choice.id)
  const answerOrder = acceptedChoiceOrder(levelId)

  if (baseOrder.length < 2) return baseOrder

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const shuffled = [...baseOrder]
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
    }

    if (
      !sameOrder(shuffled, baseOrder) &&
      !sameOrder(shuffled, answerOrder) &&
      !sameOrder(shuffled, previousOrder)
    ) {
      return shuffled
    }
  }

  const offset = baseOrder.length > 2 && previousOrder.length === baseOrder.length && sameOrder(baseOrder, previousOrder)
    ? 2
    : 1
  return [...baseOrder.slice(offset), ...baseOrder.slice(0, offset)]
}

function completionAudioOwnsSuccess(level: Level) {
  return level.completionAudioId.startsWith('he_word_') || level.completionAudioId.startsWith('he_syllable_')
}

function completesLevelAfterPlacement(level: Level, state: GameState, slotId: string) {
  if (!completionAudioOwnsSuccess(level)) return false

  return level.target.slots
    .filter((slot) => !slot.fixed)
    .every((slot) => slot.id === slotId || Boolean(state.slots[slot.id]))
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

function formatStopwatchTime(milliseconds: number) {
  const totalCentiseconds = Math.max(0, Math.floor(milliseconds / 10))
  const seconds = Math.floor(totalCentiseconds / 100)
  const centiseconds = totalCentiseconds % 100

  return `${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`
}

function App() {
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings())
  const [progress, setProgress] = useState(() => loadProgress())
  const [gameState, dispatch] = useState(() =>
    createHomeGameState(progress.lastLevelId),
  )
  const [drag, setDrag] = useState<DragState | null>(null)
  const [feedbackBurst, setFeedbackBurst] = useState<FeedbackBurst | null>(null)
  const [successBurst, setSuccessBurst] = useState<SuccessBurst | null>(null)
  const [trailUnlock, setTrailUnlock] = useState<TrailUnlock | null>(null)
  const [completionTimeMs, setCompletionTimeMs] = useState<number | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [entryLevelId, setEntryLevelId] = useState<string | null>(null)
  const [choiceOrder, setChoiceOrder] = useState<string[]>(() =>
    createChoiceOrder(progress.lastLevelId),
  )
  const dragRef = useRef<DragState | null>(null)
  const slotRefs = useRef<Record<string, HTMLSpanElement | null>>({})
  const trayRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const dragTimer = useRef<number | null>(null)
  const dragReturnTimer = useRef<number | null>(null)
  const feedbackTimer = useRef<number | null>(null)
  const successBurstTimer = useRef<number | null>(null)
  const successOriginRef = useRef<{ x: number; y: number } | null>(null)
  const levelStartedAtRef = useRef<number | null>(null)
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
      if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current)
      if (successBurstTimer.current) window.clearTimeout(successBurstTimer.current)
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
      successOriginRef.current = null
      levelStartedAtRef.current = performance.now()
      setCompletionTimeMs(null)
      setEntryLevelId(null)
      setChoiceOrder((current) => createChoiceOrder(levelId, current))
      setProgress((current) => ({ ...current, lastLevelId: levelId }))
      dispatch(createInitialGameState(levelId))
    },
    [recommendedLevelId],
  )

  const returnToPath = useCallback(() => {
    sound.current?.stopHold()
    successOriginRef.current = null
    levelStartedAtRef.current = null
    setDrag(null)
    dispatch(createHomeGameState(progress.lastLevelId))
  }, [progress.lastLevelId])

  const restartPack = useCallback(() => {
    const nextProgress = { lastLevelId: LEVELS[0].id, completedLevelIds: [] }
    successOriginRef.current = null
    levelStartedAtRef.current = performance.now()
    setCompletionTimeMs(null)
    setChoiceOrder((current) => createChoiceOrder(LEVELS[0].id, current))
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
      'fx_success',
      'fx_failure',
      'fx_level_success',
      ...level.choices.flatMap((choice) => [
        choice.soundId,
        getChoiceHoldSoundId(choice),
        getChoicePlacementSoundId(choice),
      ]),
    ]
    sound.current?.preload(levelSoundIds)
  }, [level])

  const updateSettings = useCallback((patch: Partial<GameSettings>) => {
    setSettings((current) => ({ ...current, ...patch }))
  }, [])

  const previewSuccessFanfare = useCallback((variant: SuccessFanfare) => {
    sound.current?.unlock()
    sound.current?.play(`fx_level_success_${variant}`)
  }, [])

  const finishTrailUnlock = useCallback(() => {
    setTrailUnlock(null)
  }, [])

  const previewTrailUnlock = useCallback(() => {
    const recommendedLevel = levelById(recommendedLevelId) ?? LEVELS[0]
    setTrailUnlock({
      id: Date.now(),
      categoryId: recommendedLevel.categoryId,
    })
  }, [recommendedLevelId])

  const showFailureFeedback = useCallback((x: number, y: number) => {
    if (feedbackTimer.current) {
      window.clearTimeout(feedbackTimer.current)
    }

    setFeedbackBurst({
      id: Date.now(),
      kind: 'failure',
      x,
      y,
    })
    feedbackTimer.current = window.setTimeout(() => {
      setFeedbackBurst(null)
    }, 560)
  }, [])

  const completionPoint = useCallback(() => {
    if (successOriginRef.current) {
      return successOriginRef.current
    }

    const rects = Object.values(slotRefs.current)
      .filter((element): element is HTMLSpanElement => Boolean(element))
      .map((element) => element.getBoundingClientRect())

    if (!rects.length) {
      return { x: window.innerWidth / 2, y: window.innerHeight * 0.42 }
    }

    const left = Math.min(...rects.map((rect) => rect.left))
    const right = Math.max(...rects.map((rect) => rect.right))
    const top = Math.min(...rects.map((rect) => rect.top))
    const bottom = Math.max(...rects.map((rect) => rect.bottom))
    return {
      x: left + (right - left) / 2,
      y: top + (bottom - top) / 2,
    }
  }, [])

  const showSuccessBurst = useCallback(() => {
    if (successBurstTimer.current) {
      window.clearTimeout(successBurstTimer.current)
    }

    setSuccessBurst({
      id: Date.now(),
      ...completionPoint(),
    })
    successBurstTimer.current = window.setTimeout(() => {
      setSuccessBurst(null)
    }, 1250)
  }, [completionPoint])

  const onPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    choice: Choice,
  ) => {
    if (gameState.status !== 'playing' || dragRef.current) return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    sound.current?.unlock()
    sound.current?.startHold(getChoiceHoldSoundId(choice))

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
      const nearest = findBestSlot({
        choice,
        level,
        state: gameState,
        rects,
        x: dropX,
        y: dropY,
        snapRadius: Number.POSITIVE_INFINITY,
        requireInside: true,
        hitSlop: 8,
      })

      sound.current?.stopHold()

      if (nearest) {
        successOriginRef.current = { x: dropX, y: dropY }
        const shouldReserveCompletionAudio = completesLevelAfterPlacement(level, gameState, nearest.id)
        if (!shouldReserveCompletionAudio) {
          const placementSoundId = getChoicePlacementSoundId(choice)
          if (!hasRecordedAudio(placementSoundId)) {
            sound.current?.play('fx_success')
          }
          sound.current?.play(placementSoundId, { placement: true })
        }
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

      sound.current?.play('fx_failure')
      showFailureFeedback(dropX, dropY)
      const currentDragId = currentDrag.id
      updateCurrentDrag((current) =>
        current?.id === currentDragId ? { ...current, status: 'wrong' } : current,
      )
      dragTimer.current = window.setTimeout(() => {
        returnDrag(currentDragId)
      }, 180)
    },
    [cancelDrag, gameState, level, returnDrag, setCurrentDrag, showFailureFeedback, slotRects, updateCurrentDrag],
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
      sound.current?.unlock()
      sound.current?.play('fx_failure')
      showFailureFeedback(window.innerWidth / 2, window.innerHeight * 0.66)
      return
    }

    sound.current?.unlock()
    const slotElement = slotRefs.current[openSlot.id]
    if (slotElement) {
      const rect = slotElement.getBoundingClientRect()
      successOriginRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      }
    } else {
      successOriginRef.current = completionPoint()
    }
    const placementSoundId = getChoicePlacementSoundId(choice)
    const shouldReserveCompletionAudio = completesLevelAfterPlacement(level, gameState, openSlot.id)
    if (!shouldReserveCompletionAudio) {
      if (!hasRecordedAudio(placementSoundId)) {
        sound.current?.play('fx_success')
      }
      sound.current?.play(placementSoundId, { placement: true })
    }
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

    const finishedAt = performance.now()
    setCompletionTimeMs(
      levelStartedAtRef.current == null ? 0 : finishedAt - levelStartedAtRef.current,
    )
    levelStartedAtRef.current = null

    const isWordCompletion = level.completionAudioId.startsWith('he_word_')
    const isSyllableCompletion = level.completionAudioId.startsWith('he_syllable_')
    const burstTimer = window.setTimeout(showSuccessBurst, 0)
    let fanfareTimer: number | null = null
    const completeDelay = isWordCompletion ? 1500 : 980
    if (isWordCompletion) {
      sound.current?.play(level.completionAudioId)
      fanfareTimer = window.setTimeout(() => sound.current?.play('fx_level_success'), 1250)
    } else if (isSyllableCompletion) {
      sound.current?.play(level.completionAudioId, { clipped: true })
    } else {
      sound.current?.play('fx_level_success')
    }

    const timer = window.setTimeout(() => {
      dispatch((current) => gameReducer(current, { type: 'COMPLETE_LEVEL' }))
      setProgress((current) => ({
        lastLevelId: level.id,
        completedLevelIds: Array.from(
          new Set([...current.completedLevelIds, level.id]),
        ),
      }))
    }, completeDelay)

    return () => {
      window.clearTimeout(burstTimer)
      window.clearTimeout(timer)
      if (fanfareTimer) window.clearTimeout(fanfareTimer)
    }
  }, [gameState, level, showSuccessBurst])

  const continueAfterComplete = useCallback(() => {
    const nextLevelId = getNextLevelId(gameState.levelId)
    if (!nextLevelId) {
      dispatch((current) => gameReducer(current, { type: 'COMPLETE_PACK' }))
      return
    }

    const nextLevel = levelById(nextLevelId)
    setProgress((current) => ({ ...current, lastLevelId: nextLevelId }))
    successOriginRef.current = null
    setChoiceOrder((current) => createChoiceOrder(nextLevelId, current))

    if (nextLevel && isLastLevelInCategory(gameState.levelId)) {
      setTrailUnlock({
        id: Date.now(),
        categoryId: nextLevel.categoryId,
      })
      dispatch(createHomeGameState(nextLevelId))
      return
    }

    levelStartedAtRef.current = performance.now()
    setCompletionTimeMs(null)
    dispatch(createInitialGameState(nextLevelId))
  }, [gameState.levelId])

  const placedChoiceIds = new Set(Object.values(gameState.slots))
  const orderedChoices = useMemo(() => {
    const choicesById = new Map(level.choices.map((choice) => [choice.id, choice]))
    const ordered = choiceOrder
      .map((choiceId) => choicesById.get(choiceId))
      .filter((choice): choice is Choice => Boolean(choice))
    const missing = level.choices.filter((choice) => !choiceOrder.includes(choice.id))

    return [...ordered, ...missing]
  }, [choiceOrder, level])
  const availableChoices = orderedChoices.filter(
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
            unlockingCategoryId={trailUnlock?.categoryId ?? null}
            unlockAnimationKey={trailUnlock?.id ?? 0}
            onUnlockAnimationComplete={finishTrailUnlock}
            onPreviewUnlock={previewTrailUnlock}
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
              className="icon-button parent-gate"
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              aria-label="הגדרות"
              title="הגדרות"
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

          {successBurst && <CompletionBurst burst={successBurst} />}

          {gameState.status === 'levelComplete' && (
            <CompletionDialog
              levelId={level.id}
              completionTimeMs={completionTimeMs}
              onContinue={continueAfterComplete}
            />
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

          {feedbackBurst && (
            <div
              key={feedbackBurst.id}
              className={`feedback-burst ${feedbackBurst.kind}`}
              style={
                {
                  '--feedback-x': `${feedbackBurst.x}px`,
                  '--feedback-y': `${feedbackBurst.y}px`,
                } as React.CSSProperties
              }
              aria-hidden="true"
            >
              ×
            </div>
          )}

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
          onPreviewSuccessFanfare={previewSuccessFanfare}
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
  unlockingCategoryId: string | null
  unlockAnimationKey: number
  onUnlockAnimationComplete: () => void
  onPreviewUnlock: () => void
  onStartLevel: (levelId?: string) => void
}

function StagePath({
  completedLevelIds,
  recommendedLevelId,
  unlockingCategoryId,
  unlockAnimationKey,
  onUnlockAnimationComplete,
  onPreviewUnlock,
  onStartLevel,
}: StagePathProps) {
  const recommendedNodeRef = useRef<HTMLButtonElement | null>(null)
  const completed = new Set(completedLevelIds)
  const completedCount = LEVELS.filter((level) => completed.has(level.id)).length
  const recommendedLevel = levelById(recommendedLevelId) ?? LEVELS[0]
  const recommendedIndex = Math.max(
    0,
    LEVELS.findIndex((candidate) => candidate.id === recommendedLevel.id),
  )
  const activeCategory =
    CATEGORIES.find((category) => category.id === recommendedLevel.categoryId) ?? CATEGORIES[0]
  const openCategoryOrder = activeCategory.order
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

  useLayoutEffect(() => {
    recommendedNodeRef.current?.scrollIntoView({
      block: 'center',
      inline: 'nearest',
      behavior: 'instant',
    })
  }, [recommendedLevelId])

  useEffect(() => {
    if (!unlockingCategoryId) return

    const timer = window.setTimeout(onUnlockAnimationComplete, 5600)
    return () => window.clearTimeout(timer)
  }, [onUnlockAnimationComplete, unlockingCategoryId, unlockAnimationKey])

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
              const isCategoryOpen = category.order <= openCategoryOrder
              const isCurrentCategory = category.id === activeCategory.id
              const isUnlockingCategory = category.id === unlockingCategoryId

              return (
                <span
                  key={category.id}
                  className={[
                    isCategoryOpen ? 'category-open' : 'category-locked',
                    isCurrentCategory ? 'category-current' : '',
                    isUnlockingCategory ? 'category-unlocking' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
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
              const isPlayable = isCompleted || isNext
              const isCategoryOpen = category.order <= openCategoryOrder
              const isFutureCategory = !isCategoryOpen
              const isSequenceLocked = isCategoryOpen && !isPlayable
              const isUnlockingCategory = category.id === unlockingCategoryId
              const categoryFirstLevelIndex = LEVELS.findIndex((candidate) => candidate.categoryId === category.id)
              const point = trailPoints[index]
              const revealIndex = Math.min(Math.abs(index - recommendedIndex), 8)
              const solutionText = level.target.display
              const solutionLength = stripNikkud(solutionText).length

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
                    !isPlayable ? 'locked' : '',
                    isSequenceLocked ? 'sequence-locked' : '',
                    isFutureCategory ? 'future-category' : '',
                    isUnlockingCategory ? 'category-unlocking' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    if (isPlayable) onStartLevel(level.id)
                  }}
                  disabled={!isPlayable}
                  aria-label={`${level.title}, ${
                    isCompleted ? 'הושלם' : isNext ? 'השלב הבא' : 'נעול'
                  }`}
                  style={
                    {
                      '--node-index': index,
                      '--node-reveal-index': revealIndex,
                      '--unlock-step': Math.max(0, index - categoryFirstLevelIndex),
                      '--category-color': category.color,
                      '--map-x': `${point.x}px`,
                      '--map-y': `${point.y}px`,
                    } as React.CSSProperties
                  }
                >
                  {isNext && <em aria-hidden="true">השלב הבא</em>}
                  <span
                    className={[
                      'level-dot-face',
                      isCompleted ? 'completed-face' : '',
                      isCompleted && solutionLength > 3 ? 'solution-long' : '',
                      isCompleted && solutionLength > 1 && solutionLength <= 3 ? 'solution-medium' : '',
                      isCompleted && solutionLength <= 1 ? 'solution-short' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {isCompleted ? (
                      <>
                        <span className="completed-solution">{solutionText}</span>
                        <span className="completed-check" aria-hidden="true">
                          <Check />
                        </span>
                      </>
                    ) : isCategoryOpen ? (
                      index + 1
                    ) : (
                      <Lock aria-hidden="true" />
                    )}
                  </span>
                  {isUnlockingCategory && !isCompleted && (
                    <>
                      <span className="unlock-lock" aria-hidden="true">
                        <Lock />
                      </span>
                      <span className="unlock-glow" aria-hidden="true" />
                    </>
                  )}
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
        {import.meta.env.DEV && (
          <button
            className="dev-unlock-test"
            type="button"
            onClick={onPreviewUnlock}
            aria-label="בדיקת אנימציית פתיחת אזור"
          >
            בדיקת פתיחה
          </button>
        )}
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

function CompletionDialog({
  levelId,
  completionTimeMs,
  onContinue,
}: {
  levelId: string
  completionTimeMs: number | null
  onContinue: () => void
}) {
  const level = levelById(levelId) ?? LEVELS[0]
  const nextLevelId = getNextLevelId(levelId)
  const nextLevel = nextLevelId ? levelById(nextLevelId) : null
  const nextCategoryTitle = getNextCategoryTitle(levelId)
  const completionTime = formatStopwatchTime(completionTimeMs ?? 0)

  return (
    <div className="modal-layer completion-layer" role="presentation">
      <section className="complete-card" role="dialog" aria-modal="true" aria-labelledby="complete-title">
        <CardConfetti />
        <div className="complete-banner" id="complete-title">
          כל הכבוד!
        </div>
        <div className="complete-star" aria-hidden="true">
          <Star />
        </div>
        <h2>סיימתם את שלב {levelNumber(level.id)}</h2>
        <div className="completion-time" aria-label={`זמן השלמה ${completionTime}`}>
          <span>זמן</span>
          <strong>{completionTime}</strong>
        </div>
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

function CardConfetti() {
  return (
    <div className="card-confetti" aria-hidden="true">
      {Array.from({ length: 12 }, (_, index) => (
        <i key={index} />
      ))}
    </div>
  )
}

function CompletionBurst({ burst }: { burst: SuccessBurst }) {
  return (
    <div
      key={burst.id}
      className="completion-burst"
      style={
        {
          '--burst-x': `${burst.x}px`,
          '--burst-y': `${burst.y}px`,
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      {Array.from({ length: 24 }, (_, index) => (
        <i key={index} />
      ))}
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
  onPreviewSuccessFanfare: (variant: SuccessFanfare) => void
  onClose: () => void
  onRestart: () => void
  closeRef: React.MutableRefObject<HTMLButtonElement | null>
}

function SettingsPanel({
  settings,
  onChange,
  onPreviewSuccessFanfare,
  onClose,
  onRestart,
  closeRef,
}: SettingsPanelProps) {
  const fanfares: Array<{ id: SuccessFanfare; label: string }> = [
    { id: 'sparkle', label: 'ניצוץ' },
    { id: 'climb', label: 'עלייה' },
    { id: 'dance', label: 'ריקוד' },
    { id: 'chime', label: 'פעמון' },
  ]

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

        <div className="fanfare-preview" aria-label="בחירת צליל הצלחה">
          <div>
            <strong>צליל הצלחה</strong>
            <span>בחרו מנגינה קצרה לסיום שלב</span>
          </div>
          <div className="fanfare-options">
            {fanfares.map((fanfare) => (
              <button
                key={fanfare.id}
                type="button"
                className={settings.successFanfare === fanfare.id ? 'selected' : ''}
                onClick={() => {
                  onChange({ successFanfare: fanfare.id })
                  onPreviewSuccessFanfare(fanfare.id)
                }}
              >
                <Play aria-hidden="true" />
                {fanfare.label}
              </button>
            ))}
          </div>
        </div>

        {import.meta.env.DEV && <AudioSampleReview />}

        <button className="restart-button" type="button" onClick={onRestart}>
          <RotateCcw aria-hidden="true" />
          להתחיל מהתחלה
        </button>
      </section>
    </div>
  )
}

function AudioSampleReview() {
  const [status, setStatus] = useState<Record<string, 'checking' | 'ready' | 'missing'>>(() =>
    Object.fromEntries(
      AUDIO_SAMPLE_CLIPS.map((clip) => [clip.soundId, 'checking' as const]),
    ),
  )

  const fetchSampleStatus = useCallback(() => {
    AUDIO_SAMPLE_CLIPS.forEach((clip) => {
      void fetch(clip.src, { method: 'HEAD', cache: 'no-store' })
        .then((response) => {
          setStatus((current) => ({
            ...current,
            [clip.soundId]: response.ok ? 'ready' : 'missing',
          }))
        })
        .catch(() => {
          setStatus((current) => ({
            ...current,
            [clip.soundId]: 'missing',
          }))
        })
    })
  }, [])

  const checkSamples = useCallback(() => {
    setStatus(
      Object.fromEntries(
        AUDIO_SAMPLE_CLIPS.map((clip) => [clip.soundId, 'checking' as const]),
      ),
    )
    fetchSampleStatus()
  }, [fetchSampleStatus])

  useEffect(() => {
    fetchSampleStatus()
  }, [fetchSampleStatus])

  const readyCount = AUDIO_SAMPLE_CLIPS.filter((clip) => status[clip.soundId] === 'ready').length

  return (
    <div className="audio-sample-review" aria-label="בדיקת דוגמאות קול">
      <header>
        <div>
          <strong>דוגמאות קול AI</strong>
          <span>
            {readyCount}/{AUDIO_SAMPLE_CLIPS.length} מוכנות
          </span>
        </div>
        <button type="button" onClick={checkSamples}>
          רענון
        </button>
      </header>

      <div className="audio-sample-list">
        {AUDIO_SAMPLE_CLIPS.map((clip) => (
          <AudioSampleRow key={clip.soundId} clip={clip} status={status[clip.soundId] ?? 'checking'} />
        ))}
      </div>
    </div>
  )
}

function AudioSampleRow({
  clip,
  status,
}: {
  clip: AudioSampleClip
  status: 'checking' | 'ready' | 'missing'
}) {
  return (
    <div className={`audio-sample-row ${status}`}>
      <div className="audio-sample-meta">
        <b>{clip.text}</b>
        <span>{clip.soundId}</span>
      </div>
      {status === 'ready' ? (
        <audio controls preload="none" src={clip.src}>
          <a href={clip.src}>השמעה</a>
        </audio>
      ) : (
        <span className="audio-sample-status">
          {status === 'checking' ? 'בודק...' : 'חסר קובץ'}
        </span>
      )}
    </div>
  )
}

export default App
