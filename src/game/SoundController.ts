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
    this.playAsset(soundId, options)
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
}
