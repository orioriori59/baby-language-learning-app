export type Difficulty =
  | 'letters'
  | 'final-letters'
  | 'missing-letter'
  | 'cvc-word'
  | 'sight-word'
  | 'syllable'
  | 'nikkud-word'
  | 'patah-qamats'
  | 'hiriq'
  | 'tsere-segol'
  | 'holam'
  | 'qubuts-shuruk'
  | 'mixed-a-i-e'
  | 'mixed-o-u'
  | 'first-reading'

export type CategoryId =
  | 'letters'
  | 'final-letters'
  | 'patah-qamats'
  | 'hiriq'
  | 'tsere-segol'
  | 'holam'
  | 'qubuts-shuruk'
  | 'mixed-a-i-e'
  | 'mixed-o-u'
  | 'first-reading'

export type VowelId =
  | 'patah'
  | 'qamats'
  | 'hiriq'
  | 'tsere'
  | 'segol'
  | 'holam'
  | 'qubuts'
  | 'shuruk'

export type ChoiceKind = 'letter' | 'syllable' | 'word'

export type LevelKind =
  | 'letter-match'
  | 'missing-letter'
  | 'word-build'
  | 'word-match'
  | 'syllable-match'
  | 'nikkud-word-build'

export type Category = {
  id: CategoryId
  title: string
  description: string
  order: number
  color: string
}

export type VoiceIntensity = 'calm' | 'jumpy' | 'extra'
export type SuccessFanfare = 'sparkle' | 'climb' | 'dance' | 'chime'

export type GameSettings = {
  muted: boolean
  volume: number
  reducedMotion: boolean
  voiceIntensity: VoiceIntensity
  successFanfare: SuccessFanfare
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
  kind: ChoiceKind
}

export type Level = {
  id: string
  title: string
  categoryId: CategoryId
  categoryTitle: string
  levelKind: LevelKind
  order: number
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
