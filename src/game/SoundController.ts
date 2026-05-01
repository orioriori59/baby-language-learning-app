import { AUDIO_ASSETS } from './content'
import type { GameSettings, SuccessFanfare } from './types'

const HOLD_INTERVAL_MS = 470
type Tone = { frequency: number; start: number; duration: number; type: OscillatorType }
type PlaybackOptions = { held?: boolean; placement?: boolean; clipped?: boolean }

export class SoundController {
  private audioContext: AudioContext | null = null
  private buffers = new Map<string, AudioBuffer>()
  private holdTimer: number | null = null
  private holdNodes: Array<{ source: AudioBufferSourceNode; gain: GainNode }> = []
  private settings: GameSettings
  private assetStep = 0

  constructor(settings: GameSettings) {
    this.settings = settings
  }

  updateSettings(settings: GameSettings) {
    this.settings = settings
    if (settings.muted || settings.volume <= 0) {
      this.stopHold()
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
    this.playHold(soundId)

    this.holdTimer = window.setInterval(() => {
      this.playHold(soundId)
    }, HOLD_INTERVAL_MS + 110)
  }

  stopHold() {
    if (this.holdTimer) {
      window.clearInterval(this.holdTimer)
      this.holdTimer = null
    }
    this.stopHoldNodes()
  }

  play(soundId: string, options: PlaybackOptions = {}) {
    if (this.settings.muted || this.settings.volume <= 0) return

    this.unlock()
    if (!this.playAsset(soundId, options)) {
      this.playGeneratedEffect(soundId)
    }
  }

  preload(soundIds: string[]) {
    for (const soundId of soundIds) {
      for (const src of AUDIO_ASSETS[soundId] ?? []) {
        void this.loadBuffer(src)
      }
    }
  }

  private playAsset(soundId: string, options: PlaybackOptions) {
    const assets = AUDIO_ASSETS[soundId]
    if (!assets?.length || !this.audioContext) return false

    const src =
      assets[
        options.held || assets.length > 1
          ? this.assetStep++ % assets.length
          : 0
      ]

    void this.loadBuffer(src).then((buffer) => {
      if (!buffer || !this.audioContext || this.settings.muted || this.settings.volume <= 0) {
        return
      }

      const source = this.audioContext.createBufferSource()
      const gain = this.audioContext.createGain()
      const now = this.audioContext.currentTime
      source.buffer = buffer
      source.playbackRate.value = options.held ? this.getAssetRate() : 1
      if (options.clipped) {
        gain.gain.setValueAtTime(0.0001, now)
        gain.gain.linearRampToValueAtTime(this.settings.volume * 0.9, now + 0.018)
        gain.gain.setValueAtTime(this.settings.volume * 0.9, now + 0.36)
        gain.gain.linearRampToValueAtTime(0.0001, now + 0.46)
      } else {
        gain.gain.value = this.settings.volume
      }
      source.connect(gain)
      gain.connect(this.audioContext.destination)
      source.start(now)
      if (options.clipped) {
        source.stop(now + 0.5)
      }
    })

    return true
  }

  private playHold(soundId: string) {
    if (this.settings.muted || this.settings.volume <= 0) return

    this.unlock()
    const assets = AUDIO_ASSETS[soundId]
    if (!assets?.length || !this.audioContext) return

    const src = assets[this.assetStep++ % assets.length]

    void this.loadBuffer(src).then((buffer) => {
      if (!buffer || !this.audioContext || this.settings.muted || this.settings.volume <= 0 || !this.holdTimer) {
        return
      }

      this.stopHoldNodes(0.035)

      const now = this.audioContext.currentTime
      const source = this.audioContext.createBufferSource()
      const gain = this.audioContext.createGain()
      source.buffer = buffer
      source.playbackRate.value = this.getAssetRate()
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.linearRampToValueAtTime(this.settings.volume * 0.86, now + 0.018)
      gain.gain.setValueAtTime(this.settings.volume * 0.86, now + 0.36)
      gain.gain.linearRampToValueAtTime(0.0001, now + 0.46)
      source.connect(gain)
      gain.connect(this.audioContext.destination)
      source.start(now)
      source.stop(now + 0.5)

      const node = { source, gain }
      this.holdNodes = [node]
      source.addEventListener('ended', () => {
        this.holdNodes = this.holdNodes.filter((candidate) => candidate !== node)
      })
    })
  }

  private stopHoldNodes(fadeSeconds = 0.05) {
    if (!this.audioContext || !this.holdNodes.length) return

    const now = this.audioContext.currentTime
    for (const { source, gain } of this.holdNodes) {
      try {
        gain.gain.cancelScheduledValues(now)
        gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now)
        gain.gain.linearRampToValueAtTime(0.0001, now + fadeSeconds)
        source.stop(now + fadeSeconds + 0.01)
      } catch {
        // A node may already have ended; stopping is best-effort.
      }
    }

    this.holdNodes = []
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

  private getAssetRate() {
    if (this.settings.voiceIntensity === 'calm') return 0.98
    const rates = this.settings.voiceIntensity === 'extra'
      ? [1.05, 1.16, 0.98, 1.22]
      : [1, 1.1, 0.96, 1.14]
    return rates[this.assetStep % rates.length]
  }

  private playGeneratedEffect(soundId: string) {
    if (!this.audioContext || !soundId.startsWith('fx_')) return

    if (soundId === 'fx_retry' || soundId === 'fx_failure') {
      this.playFailureEffect()
      return
    }

    if (
      soundId === 'fx_word_complete' ||
      soundId === 'fx_level_success' ||
      soundId.startsWith('fx_level_success_')
    ) {
      const requested = soundId.replace('fx_level_success_', '') as SuccessFanfare
      this.playFanfareEffect(soundId.startsWith('fx_level_success_') ? requested : undefined)
      return
    }

    if (soundId === 'fx_pop' || soundId === 'fx_success') {
      this.playToneSequence([
        { frequency: 523.25, start: 0, duration: 0.08, type: 'sine' },
        { frequency: 784, start: 0.06, duration: 0.12, type: 'triangle' },
      ], 0.22)
    }
  }

  private playFanfareEffect(variant: SuccessFanfare = this.settings.successFanfare) {
    const fanfares: Record<SuccessFanfare, { melody: Tone[]; harmony: Tone[]; sparkle: Tone[] }> = {
      sparkle: {
        melody: [
          { frequency: 523.25, start: 0, duration: 0.24, type: 'sine' },
          { frequency: 659.25, start: 0.2, duration: 0.24, type: 'sine' },
          { frequency: 783.99, start: 0.42, duration: 0.28, type: 'triangle' },
          { frequency: 1046.5, start: 0.68, duration: 0.36, type: 'sine' },
          { frequency: 987.77, start: 1.02, duration: 0.18, type: 'sine' },
          { frequency: 1174.66, start: 1.16, duration: 0.26, type: 'sine' },
        ],
        harmony: [
          { frequency: 329.63, start: 0, duration: 0.56, type: 'sine' },
          { frequency: 392, start: 0.56, duration: 0.42, type: 'sine' },
          { frequency: 523.25, start: 0.98, duration: 0.42, type: 'sine' },
        ],
        sparkle: [
          { frequency: 1567.98, start: 0.78, duration: 0.12, type: 'sine' },
          { frequency: 2093, start: 1.22, duration: 0.14, type: 'sine' },
        ],
      },
      climb: {
        melody: [
          { frequency: 392, start: 0, duration: 0.22, type: 'sine' },
          { frequency: 493.88, start: 0.18, duration: 0.22, type: 'sine' },
          { frequency: 587.33, start: 0.36, duration: 0.24, type: 'sine' },
          { frequency: 783.99, start: 0.58, duration: 0.3, type: 'triangle' },
          { frequency: 987.77, start: 0.86, duration: 0.26, type: 'sine' },
          { frequency: 1174.66, start: 1.08, duration: 0.36, type: 'sine' },
        ],
        harmony: [
          { frequency: 246.94, start: 0, duration: 0.48, type: 'sine' },
          { frequency: 293.66, start: 0.48, duration: 0.46, type: 'sine' },
          { frequency: 392, start: 0.94, duration: 0.48, type: 'sine' },
        ],
        sparkle: [
          { frequency: 1567.98, start: 1.18, duration: 0.14, type: 'sine' },
        ],
      },
      dance: {
        melody: [
          { frequency: 659.25, start: 0, duration: 0.22, type: 'sine' },
          { frequency: 783.99, start: 0.18, duration: 0.22, type: 'sine' },
          { frequency: 659.25, start: 0.36, duration: 0.2, type: 'sine' },
          { frequency: 987.77, start: 0.56, duration: 0.3, type: 'triangle' },
          { frequency: 880, start: 0.86, duration: 0.22, type: 'sine' },
          { frequency: 1046.5, start: 1.06, duration: 0.36, type: 'sine' },
        ],
        harmony: [
          { frequency: 329.63, start: 0, duration: 0.44, type: 'sine' },
          { frequency: 392, start: 0.44, duration: 0.42, type: 'sine' },
          { frequency: 523.25, start: 0.86, duration: 0.52, type: 'sine' },
        ],
        sparkle: [
          { frequency: 1318.51, start: 0.64, duration: 0.12, type: 'sine' },
          { frequency: 1760, start: 1.12, duration: 0.13, type: 'sine' },
        ],
      },
      chime: {
        melody: [
          { frequency: 783.99, start: 0, duration: 0.28, type: 'sine' },
          { frequency: 1046.5, start: 0.24, duration: 0.32, type: 'sine' },
          { frequency: 1318.51, start: 0.54, duration: 0.34, type: 'sine' },
          { frequency: 1567.98, start: 0.9, duration: 0.48, type: 'sine' },
        ],
        harmony: [
          { frequency: 392, start: 0, duration: 0.72, type: 'sine' },
          { frequency: 523.25, start: 0.72, duration: 0.66, type: 'sine' },
        ],
        sparkle: [
          { frequency: 2093, start: 0.62, duration: 0.16, type: 'sine' },
          { frequency: 2637.02, start: 1.02, duration: 0.18, type: 'sine' },
        ],
      },
    }

    const fanfare = fanfares[variant] ?? fanfares.sparkle
    this.playToneSequence(fanfare.melody, 0.22)
    this.playToneSequence(fanfare.harmony, 0.1)
    this.playToneSequence(fanfare.sparkle, 0.08)
  }

  private playFailureEffect() {
    if (!this.audioContext) return

    const now = this.audioContext.currentTime
    const master = this.audioContext.createGain()
    master.gain.setValueAtTime(this.settings.volume * 0.2, now)
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.42)
    master.connect(this.audioContext.destination)

    const chirp = this.audioContext.createOscillator()
    const chirpGain = this.audioContext.createGain()
    chirp.type = 'triangle'
    chirp.frequency.setValueAtTime(420, now)
    chirp.frequency.exponentialRampToValueAtTime(540, now + 0.055)
    chirp.frequency.exponentialRampToValueAtTime(250, now + 0.18)
    chirp.detune.setValueAtTime(0, now)
    chirp.detune.linearRampToValueAtTime(-38, now + 0.18)
    chirpGain.gain.setValueAtTime(0.0001, now)
    chirpGain.gain.exponentialRampToValueAtTime(0.95, now + 0.018)
    chirpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2)
    chirp.connect(chirpGain)
    chirpGain.connect(master)
    chirp.start(now)
    chirp.stop(now + 0.23)

    const bounce = this.audioContext.createOscillator()
    const bounceGain = this.audioContext.createGain()
    bounce.type = 'sine'
    bounce.frequency.setValueAtTime(170, now + 0.15)
    bounce.frequency.exponentialRampToValueAtTime(105, now + 0.34)
    bounceGain.gain.setValueAtTime(0.0001, now + 0.14)
    bounceGain.gain.exponentialRampToValueAtTime(0.72, now + 0.18)
    bounceGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36)
    bounce.connect(bounceGain)
    bounceGain.connect(master)
    bounce.start(now + 0.14)
    bounce.stop(now + 0.38)
  }

  private playToneSequence(
    tones: Array<{ frequency: number; start: number; duration: number; type: OscillatorType }>,
    gainScale: number,
  ) {
    if (!this.audioContext) return

    const now = this.audioContext.currentTime
    const master = this.audioContext.createGain()
    master.gain.value = this.settings.volume * gainScale
    master.connect(this.audioContext.destination)

    for (const tone of tones) {
      const oscillator = this.audioContext.createOscillator()
      const gain = this.audioContext.createGain()
      const start = now + tone.start
      const end = start + tone.duration

      oscillator.type = tone.type
      oscillator.frequency.setValueAtTime(tone.frequency, start)
      const attack = Math.min(0.055, Math.max(0.025, tone.duration * 0.24))
      const release = Math.min(0.14, Math.max(0.055, tone.duration * 0.42))
      const releaseStart = Math.max(start + attack + 0.015, end - release)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.78, start + attack)
      gain.gain.setValueAtTime(0.78, releaseStart)
      gain.gain.exponentialRampToValueAtTime(0.0001, end)
      oscillator.connect(gain)
      gain.connect(master)
      oscillator.start(start)
      oscillator.stop(end + 0.04)
    }
  }
}
