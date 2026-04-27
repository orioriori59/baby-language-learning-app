import { AUDIO_ASSETS, SOUND_TEXT } from './content'
import type { GameSettings } from './types'

const HOLD_INTERVAL_MS = 470
const JUMPY_PITCHES = [1.1, 1.46, 1.22, 1.58, 1.32]
const JUMPY_RATES = [1.05, 1.2, 1.12, 1.26, 1.14]

export class SoundController {
  private audioContext: AudioContext | null = null
  private buffers = new Map<string, AudioBuffer>()
  private holdTimer: number | null = null
  private settings: GameSettings
  private lastPlayAt = 0
  private playStep = 0
  private assetStep = 0

  constructor(settings: GameSettings) {
    this.settings = settings
  }

  updateSettings(settings: GameSettings) {
    this.settings = settings
    if (settings.muted || settings.volume <= 0) {
      this.stopHold()
      this.stopSpeech()
    }
  }

  unlock() {
    try {
      if (!this.audioContext) {
        const AudioContextCtor =
          window.AudioContext ??
          (window as Window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext
        this.audioContext = AudioContextCtor ? new AudioContextCtor() : null
      }

      if (this.audioContext?.state === 'suspended') {
        void this.audioContext.resume()
      }
    } catch {
      this.audioContext = null
    }
  }

  startHold(soundId: string) {
    this.stopHold()
    this.play(soundId, { held: true })

    this.holdTimer = window.setInterval(() => {
      this.play(soundId, { held: true })
    }, HOLD_INTERVAL_MS)
  }

  stopHold() {
    if (!this.holdTimer) return
    window.clearInterval(this.holdTimer)
    this.holdTimer = null
    this.stopSpeech()
  }

  play(soundId: string, options: { held?: boolean; placement?: boolean } = {}) {
    if (this.settings.muted || this.settings.volume <= 0) return

    this.unlock()
    const didPlayAsset = this.playAsset(soundId, options)

    if (!didPlayAsset) {
      this.playPop(options.held ? this.nextToneFrequency() : options.placement ? 560 : 420)
      this.speak(this.pickText(soundId), options)
    }
  }

  preload(soundIds: string[]) {
    for (const soundId of soundIds) {
      for (const src of AUDIO_ASSETS[soundId] ?? []) {
        void this.loadBuffer(src)
      }
    }
  }

  private playAsset(soundId: string, options: { held?: boolean; placement?: boolean }) {
    const assets = AUDIO_ASSETS[soundId]
    if (!assets?.length || !this.audioContext) return false

    const src =
      assets[
        options.held || assets.length > 1
          ? this.assetStep++ % assets.length
          : 0
      ]

    void this.loadBuffer(src).then((buffer) => {
      if (!buffer) {
        this.playPop(options.held ? this.nextToneFrequency() : options.placement ? 560 : 420)
        this.speak(this.pickText(soundId), options)
        return
      }

      if (!buffer || !this.audioContext || this.settings.muted || this.settings.volume <= 0) {
        return
      }

      const source = this.audioContext.createBufferSource()
      const gain = this.audioContext.createGain()
      source.buffer = buffer
      source.playbackRate.value = options.held ? this.getAssetRate() : 1
      gain.gain.value = this.settings.volume
      source.connect(gain)
      gain.connect(this.audioContext.destination)
      source.start()
    })

    return true
  }

  private async loadBuffer(src: string) {
    if (!this.audioContext) return null
    const cached = this.buffers.get(src)
    if (cached) return cached

    try {
      const response = await fetch(src)
      if (!response.ok) return null
      const arrayBuffer = await response.arrayBuffer()
      const buffer = await this.audioContext.decodeAudioData(arrayBuffer)
      this.buffers.set(src, buffer)
      return buffer
    } catch {
      return null
    }
  }

  private playPop(frequency: number) {
    if (!this.audioContext) return

    const now = this.audioContext.currentTime
    const oscillator = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    const peakVolume = Math.max(0.0001, this.settings.volume * 0.12)
    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(frequency, now)
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.62, now + 0.055)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(peakVolume, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)
    oscillator.connect(gain)
    gain.connect(this.audioContext.destination)
    oscillator.start(now)
    oscillator.stop(now + 0.14)
  }

  private speak(text: string, options: { held?: boolean; placement?: boolean }) {
    if (!('speechSynthesis' in window)) return

    const now = performance.now()
    if (now - this.lastPlayAt < 90) return
    this.lastPlayAt = now

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.volume = this.settings.volume
    utterance.rate = this.getRate(options)
    utterance.pitch = this.getPitch(options)

    window.speechSynthesis.speak(utterance)
  }

  private pickText(soundId: string) {
    const cue = SOUND_TEXT[soundId] ?? soundId.replace(/_/g, ' ')
    if (!Array.isArray(cue)) return cue

    const text = cue[this.playStep % cue.length]
    this.playStep += 1
    return text
  }

  private nextToneFrequency() {
    const base = [330, 440, 392, 520, 455][this.playStep % 5]
    return this.settings.voiceIntensity === 'extra' ? base * 1.12 : base
  }

  private getRate(options: { held?: boolean; placement?: boolean }) {
    if (options.placement) return 0.92
    if (this.settings.voiceIntensity === 'calm') return options.held ? 0.94 : 0.84
    if (options.held) return JUMPY_RATES[this.playStep % JUMPY_RATES.length]
    return this.settings.voiceIntensity === 'extra' ? 1.08 : 0.96
  }

  private getPitch(options: { held?: boolean; placement?: boolean }) {
    if (options.placement) return 1.12
    if (this.settings.voiceIntensity === 'calm') return options.held ? 1.14 : 1.05
    if (options.held) {
      const pitch = JUMPY_PITCHES[this.playStep % JUMPY_PITCHES.length]
      return this.settings.voiceIntensity === 'extra' ? pitch + 0.12 : pitch
    }
    return this.settings.voiceIntensity === 'extra' ? 1.5 : 1.28
  }

  private getAssetRate() {
    if (this.settings.voiceIntensity === 'calm') return 0.98
    const rates = this.settings.voiceIntensity === 'extra'
      ? [1.05, 1.16, 0.98, 1.22]
      : [1, 1.1, 0.96, 1.14]
    return rates[this.assetStep % rates.length]
  }

  private stopSpeech() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }
}
