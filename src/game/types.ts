export type Difficulty = 'letters' | 'missing-letter' | 'cvc-word' | 'sight-word'

export type VoiceIntensity = 'calm' | 'jumpy' | 'extra'

export type GameSettings = {
  muted: boolean
  volume: number
  reducedMotion: boolean
  voiceIntensity: VoiceIntensity
}

export type Slot = {
  id: string
  text: string
  accepts: string[]
  soundId: string
  fixed?: boolean
}

export type Choice = {
  id: string
  text: string
  soundId: string
  color: string
}

export type Level = {
  id: string
  title: string
  difficulty: Difficulty
  promptText: string
  target: {
    display: string
    slots: Slot[]
  }
  choices: Choice[]
  completionAudioId: string
}

export type PlayStatus = 'home' | 'playing' | 'levelComplete' | 'packComplete'

export type GameState = {
  status: PlayStatus
  levelId: string
  slots: Record<string, string>
  attempts: number
}

export type GameAction =
  | { type: 'PLACE_CHOICE'; slotId: string; choice: Choice }
  | { type: 'COMPLETE_LEVEL' }
  | { type: 'COMPLETE_PACK' }
