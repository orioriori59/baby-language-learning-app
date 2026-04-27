import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = new URL('..', import.meta.url).pathname
const audioRoot = join(root, 'public', 'audio')
const tmpRoot = join(root, '.audio-tmp')

const phonemes = {
  a: ['ah', 'aah', 'ah!'],
  b: ['buh', 'b', 'buh!'],
  c: ['kuh', 'k', 'kuh!'],
  d: ['duh', 'd', 'duh!'],
  e: ['eh', 'e', 'eh!'],
  f: ['fff', 'fuh', 'fff!'],
  g: ['guh', 'g', 'guh!'],
  h: ['huh', 'h', 'huh!'],
  i: ['ih', 'i', 'ih!'],
  j: ['juh', 'j', 'juh!'],
  k: ['kuh', 'k', 'kuh!'],
  l: ['lll', 'luh', 'lll!'],
  m: ['mmm', 'muh', 'mmm!'],
  n: ['nnn', 'nuh', 'nnn!'],
  o: ['aw', 'o', 'aw!'],
  p: ['puh', 'p', 'puh!'],
  q: ['kwuh', 'qu', 'kwuh!'],
  r: ['rrr', 'ruh', 'rrr!'],
  s: ['sss', 'suh', 'sss!'],
  t: ['tuh', 't', 'tuh!'],
  u: ['uh', 'u', 'uh!'],
  v: ['vvv', 'vuh', 'vvv!'],
  w: ['wuh', 'w', 'wuh!'],
  x: ['ks', 'x', 'ks!'],
  y: ['yuh', 'y', 'yuh!'],
  z: ['zzz', 'zuh', 'zzz!'],
}

const letterNames = {
  a: 'ay',
  b: 'bee',
  c: 'see',
  d: 'dee',
  e: 'ee',
  f: 'eff',
  g: 'gee',
  h: 'aitch',
  i: 'eye',
  j: 'jay',
  k: 'kay',
  l: 'ell',
  m: 'em',
  n: 'en',
  o: 'oh',
  p: 'pee',
  q: 'cue',
  r: 'arr',
  s: 'ess',
  t: 'tee',
  u: 'you',
  v: 'vee',
  w: 'double you',
  x: 'ex',
  y: 'why',
  z: 'zee',
}

const words = [
  'are',
  'bed',
  'big',
  'cat',
  'dog',
  'fox',
  'go',
  'hen',
  'jam',
  'kid',
  'leg',
  'mat',
  'one',
  'pig',
  'red',
  'sat',
  'see',
  'sun',
  'two',
  'up',
  'van',
  'vet',
  'web',
  'yes',
  'zip',
]

const holdTakes = [
  { voice: 'Flo (English (US))', rate: 248 },
  { voice: 'Sandy (English (US))', rate: 272 },
  { voice: 'Eddy (English (US))', rate: 258 },
]

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'pipe' })
  if (result.status !== 0) {
    throw new Error(
      `${command} failed:\n${result.stderr.toString()}\n${result.stdout.toString()}`,
    )
  }
}

function sayToMp3({ text, out, voice = 'Flo (English (US))', rate = 230 }) {
  mkdirSync(dirname(out), { recursive: true })
  const tmp = join(tmpRoot, `${out.replaceAll('/', '_').replaceAll(' ', '_')}.aiff`)
  mkdirSync(dirname(tmp), { recursive: true })

  run('say', ['-v', voice, '-r', String(rate), '-o', tmp, text])
  run('ffmpeg', [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    tmp,
    '-af',
    'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04,areverse,loudnorm=I=-18:TP=-1.5:LRA=8',
    '-ar',
    '44100',
    '-ac',
    '1',
    '-codec:a',
    'libmp3lame',
    '-b:a',
    '96k',
    out,
  ])
}

function writeFxWav(out, events) {
  mkdirSync(dirname(out), { recursive: true })
  const sampleRate = 44100
  const duration = Math.max(...events.map((event) => event.start + event.duration)) + 0.08
  const samples = Math.ceil(sampleRate * duration)
  const data = new Float32Array(samples)

  for (const event of events) {
    const start = Math.floor(event.start * sampleRate)
    const length = Math.floor(event.duration * sampleRate)
    for (let i = 0; i < length; i += 1) {
      const t = i / sampleRate
      const envelope = Math.sin((i / length) * Math.PI)
      const sweep = event.sweep ? event.frequency + event.sweep * (i / length) : event.frequency
      data[start + i] += Math.sin(2 * Math.PI * sweep * t) * envelope * event.gain
    }
  }

  const pcm = Buffer.alloc(samples * 2)
  data.forEach((sample, index) => {
    const clipped = Math.max(-1, Math.min(1, sample))
    pcm.writeInt16LE(Math.round(clipped * 32767), index * 2)
  })

  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(pcm.length, 40)
  writeFileSync(out, Buffer.concat([header, pcm]))
}

function wavToMp3(wav, mp3) {
  run('ffmpeg', [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    wav,
    '-codec:a',
    'libmp3lame',
    '-b:a',
    '96k',
    mp3,
  ])
}

rmSync(audioRoot, { recursive: true, force: true })
rmSync(tmpRoot, { recursive: true, force: true })

for (const [letter, takes] of Object.entries(phonemes)) {
  takes.forEach((text, index) => {
    const take = holdTakes[index]
    sayToMp3({
      text,
      voice: take.voice,
      rate: take.rate,
      out: join(audioRoot, 'letters', letter, `hold-${index + 1}.mp3`),
    })
  })

  sayToMp3({
    text: letterNames[letter],
    rate: 222,
    out: join(audioRoot, 'letters', letter, 'name.mp3'),
  })
}

for (const word of words) {
  sayToMp3({
    text: word,
    rate: 216,
    out: join(audioRoot, 'words', `${word}.mp3`),
  })
}

const fxWavRoot = join(tmpRoot, 'fx')
writeFxWav(join(fxWavRoot, 'pop.wav'), [
  { start: 0, duration: 0.09, frequency: 580, sweep: 620, gain: 0.42 },
  { start: 0.035, duration: 0.08, frequency: 950, sweep: 520, gain: 0.28 },
])
writeFxWav(join(fxWavRoot, 'retry.wav'), [
  { start: 0, duration: 0.12, frequency: 260, sweep: -80, gain: 0.28 },
  { start: 0.1, duration: 0.12, frequency: 320, sweep: -90, gain: 0.22 },
])
writeFxWav(join(fxWavRoot, 'word-complete.wav'), [
  { start: 0, duration: 0.14, frequency: 520, sweep: 420, gain: 0.36 },
  { start: 0.08, duration: 0.16, frequency: 780, sweep: 520, gain: 0.3 },
  { start: 0.17, duration: 0.18, frequency: 980, sweep: 760, gain: 0.24 },
])

mkdirSync(join(audioRoot, 'fx'), { recursive: true })
wavToMp3(join(fxWavRoot, 'pop.wav'), join(audioRoot, 'fx', 'pop.mp3'))
wavToMp3(join(fxWavRoot, 'retry.wav'), join(audioRoot, 'fx', 'retry.mp3'))
wavToMp3(
  join(fxWavRoot, 'word-complete.wav'),
  join(audioRoot, 'fx', 'word-complete.mp3'),
)

rmSync(tmpRoot, { recursive: true, force: true })
console.log('Generated audio pack in public/audio')
