export type AudioSampleClip = {
  soundId: string
  text: string
  kind: 'letter' | 'syllable' | 'word'
  src: string
}

export const AUDIO_SAMPLE_CLIPS: AudioSampleClip[] = [
  { soundId: 'he_letter_alef', text: 'א', kind: 'letter', src: '/audio/samples/he_letter_alef.mp3' },
  { soundId: 'he_letter_bet', text: 'ב', kind: 'letter', src: '/audio/samples/he_letter_bet.mp3' },
  { soundId: 'he_letter_mem', text: 'מ', kind: 'letter', src: '/audio/samples/he_letter_mem.mp3' },
  { soundId: 'he_hold_letter_alef', text: 'אַ אַ אַ אַ', kind: 'letter', src: '/audio/samples/he_hold_letter_alef.mp3' },
  { soundId: 'he_hold_letter_bet', text: 'בְּ בְּ בְּ בְּ', kind: 'letter', src: '/audio/samples/he_hold_letter_bet.mp3' },
  { soundId: 'he_hold_letter_mem', text: 'מְ מְ מְ מְ', kind: 'letter', src: '/audio/samples/he_hold_letter_mem.mp3' },
  { soundId: 'he_syllable_alef_patah', text: 'אַ', kind: 'syllable', src: '/audio/samples/he_syllable_alef_patah.mp3' },
  { soundId: 'he_syllable_bet_qamats', text: 'בָ', kind: 'syllable', src: '/audio/samples/he_syllable_bet_qamats.mp3' },
  { soundId: 'he_syllable_mem_hiriq', text: 'מִ', kind: 'syllable', src: '/audio/samples/he_syllable_mem_hiriq.mp3' },
  { soundId: 'he_syllable_dalet_segol', text: 'דֶ', kind: 'syllable', src: '/audio/samples/he_syllable_dalet_segol.mp3' },
  { soundId: 'he_syllable_het_holam', text: 'חֹ', kind: 'syllable', src: '/audio/samples/he_syllable_het_holam.mp3' },
  { soundId: 'he_syllable_shin_shuruk', text: 'שוּ', kind: 'syllable', src: '/audio/samples/he_syllable_shin_shuruk.mp3' },
  { soundId: 'he_word_ima', text: 'אִמָא', kind: 'word', src: '/audio/samples/he_word_ima.mp3' },
  { soundId: 'he_word_dag', text: 'דַג', kind: 'word', src: '/audio/samples/he_word_dag.mp3' },
  { soundId: 'he_word_halav', text: 'חָלָב', kind: 'word', src: '/audio/samples/he_word_halav.mp3' },
]
