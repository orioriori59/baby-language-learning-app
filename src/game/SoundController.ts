import { AUDIO_ASSETS } from './content'
import type { GameSettings } from './types'

const HOLD_INTERVAL_MS = 470

export class SoundController {
  private audioContext: AudioContext | null = null
  private buffers = new Map<string, AudioBuffer>()
  private holdTimer: number | null = null
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
    this.play(soundId, { held: true })

    this.holdTimer = window.setInterval(() => {
      this.play(soundId, { held: true })
    }, HOLD_INTERVAL_MS)
  }

  stopHold() {
    if (!this.holdTimer) return
    window.clearInterval(this.holdTimer)
    this.holdTimer = null
  }

  play(soundId: string, options: { held?: boolean; placement?: boolean } = {}) {
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

    if (soundId === 'fx_word_complete' || soundId === 'fx_level_success') {
      this.playToneSequence([
        { frequency: 392, start: 0, duration: 0.1, type: 'sine' },
        { frequency: 523.25, start: 0.08, duration: 0.13, type: 'sine' },
        { frequency: 659.25, start: 0.2, duration: 0.22, type: 'triangle' },
      ], 0.34)
      return
    }

    if (soundId === 'fx_pop' || soundId === 'fx_success') {
      this.playToneSequence([
        { frequency: 523.25, start: 0, duration: 0.08, type: 'sine' },
        { frequency: 784, start: 0.06, duration: 0.12, type: 'triangle' },
      ], 0.22)
    }
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
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(1, start + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, end)
      oscillator.connect(gain)
      gain.connect(master)
      oscillator.start(start)
      oscillator.stop(end + 0.02)
    }
  }
}
