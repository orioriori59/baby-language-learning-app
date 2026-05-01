import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const outDir = path.join(repoRoot, 'public', 'audio', 'samples')
const manifestPath = path.join(repoRoot, 'src', 'game', 'audioSamples.ts')
const SONIOX_TTS_ENDPOINT = 'https://tts-rt.soniox.com/tts'
const FIRST_HALF_LEVEL_COUNT = 110

const samplePack = [
  { soundId: 'he_letter_alef', text: 'א', ttsText: 'אָלֶף', kind: 'letter' },
  { soundId: 'he_letter_bet', text: 'ב', ttsText: 'בֶּת', kind: 'letter' },
  { soundId: 'he_letter_mem', text: 'מ', ttsText: 'מֵם', kind: 'letter' },
  { soundId: 'he_hold_letter_alef', text: 'אַ אַ אַ אַ', ttsText: 'אַ אַ אַ אַ', kind: 'hold' },
  { soundId: 'he_hold_letter_bet', text: 'בְּ בְּ בְּ בְּ', kind: 'hold' },
  { soundId: 'he_hold_letter_mem', text: 'מְ מְ מְ מְ', kind: 'hold' },
  { soundId: 'he_syllable_alef_patah', text: 'אַ', kind: 'syllable' },
  { soundId: 'he_syllable_bet_qamats', text: 'בָ', kind: 'syllable' },
  { soundId: 'he_syllable_mem_hiriq', text: 'מִ', kind: 'syllable' },
  { soundId: 'he_syllable_dalet_segol', text: 'דֶ', kind: 'syllable' },
  { soundId: 'he_syllable_het_holam', text: 'חֹ', kind: 'syllable' },
  { soundId: 'he_syllable_shin_shuruk', text: 'שוּ', kind: 'syllable' },
  { soundId: 'he_word_ima', text: 'אִמָא', kind: 'word' },
  { soundId: 'he_word_dag', text: 'דַג', kind: 'word' },
  { soundId: 'he_word_halav', text: 'חָלָב', kind: 'word' },
]

const letterBySlug = {
  alef: 'א',
  bet: 'ב',
  gimel: 'ג',
  dalet: 'ד',
  he: 'ה',
  vav: 'ו',
  zayin: 'ז',
  het: 'ח',
  tet: 'ט',
  yod: 'י',
  kaf: 'כ',
  'final-kaf': 'ך',
  lamed: 'ל',
  mem: 'מ',
  'final-mem': 'ם',
  nun: 'נ',
  'final-nun': 'ן',
  samekh: 'ס',
  ayin: 'ע',
  pe: 'פ',
  'final-pe': 'ף',
  tsadi: 'צ',
  'final-tsadi': 'ץ',
  qof: 'ק',
  resh: 'ר',
  shin: 'ש',
  tav: 'ת',
}

const letterNameText = {
  alef: 'אָלֶף',
  bet: 'בֶּת',
  gimel: 'גִי מֶל',
  dalet: 'דָּלֶת',
  he: 'הֵא',
  vav: 'וָו',
  zayin: 'זַיִן',
  het: 'חֵית',
  tet: 'טֵית',
  yod: 'יִי',
  kaf: 'כַּף',
  'final-kaf': 'כַּף סוֹפִית',
  lamed: 'לָמֶד',
  mem: 'מֵם',
  'final-mem': 'מֵם סוֹפִית',
  nun: 'נוּן',
  'final-nun': 'נוּן סוֹפִית',
  samekh: 'סָמֶךְ',
  ayin: 'עַיִן',
  pe: 'פֵּא',
  'final-pe': 'פֵּא סוֹפִית',
  tsadi: 'צָדִי',
  'final-tsadi': 'צָדִי סוֹפִית',
  qof: 'קוֹף',
  resh: 'רֵישׁ',
  shin: 'שִׁין',
  tav: 'תָּו',
}

const holdText = {
  alef: 'אַ אַ אַ אַ',
  bet: 'בְּ בְּ בְּ בְּ',
  gimel: 'גְּ גְּ גְּ גְּ',
  dalet: 'דְּ דְּ דְּ דְּ',
  he: 'הְ הְ הְ הְ',
  vav: 'וְ וְ וְ וְ',
  zayin: 'זְ זְ זְ זְ',
  het: 'חְ חְ חְ חְ',
  tet: 'טְ טְ טְ טְ',
  yod: 'יְ יְ יְ יְ',
  kaf: 'כְּ כְּ כְּ כְּ',
  'final-kaf': 'ךְ ךְ ךְ ךְ',
  lamed: 'לְ לְ לְ לְ',
  mem: 'מְ מְ מְ מְ',
  'final-mem': 'םְ םְ םְ םְ',
  nun: 'נְ נְ נְ נְ',
  'final-nun': 'ןְ ןְ ןְ ןְ',
  samekh: 'סְ סְ סְ סְ',
  ayin: 'עַ עַ עַ עַ',
  pe: 'פְּ פְּ פְּ פְּ',
  'final-pe': 'ףְ ףְ ףְ ףְ',
  tsadi: 'צְ צְ צְ צְ',
  'final-tsadi': 'ץְ ץְ ץְ ץְ',
  qof: 'קְ קְ קְ קְ',
  resh: 'רְ רְ רְ רְ',
  shin: 'שְׁ שְׁ שְׁ שְׁ',
  tav: 'תְּ תְּ תְּ תְּ',
}

const vowelMarks = {
  patah: '\u05B7',
  qamats: '\u05B8',
  hiriq: '\u05B4',
  tsere: '\u05B5',
  segol: '\u05B6',
  holam: '\u05B9',
  qubuts: '\u05BB',
  shuruk: `ו\u05BC`,
}

function ttsTextForSyllable(letter, vowel) {
  if (letter === 'י' && vowel === 'hiriq') return 'יִי'
  if (vowel === 'patah' || vowel === 'qamats') return `${letter}${vowelMarks.qamats}`
  if (vowel === 'hiriq') return `${letter}${vowelMarks.hiriq}י`
  if (vowel === 'qubuts' || vowel === 'shuruk') return `${letter}${vowelMarks.shuruk}`
  return `${letter}${vowelMarks[vowel]}`
}

const clipKindRank = {
  letter: 1,
  hold: 2,
  syllable: 3,
  word: 4,
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    forceAll: false,
    forceIds: new Set(),
    limit: null,
    model: 'tts-rt-v1',
    voice: 'Nina',
    language: 'he',
    audioFormat: 'mp3',
    sampleRate: 24000,
    bitrate: 128000,
    pack: 'samples',
    writeManifest: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg === '--force') {
      const next = argv[index + 1]
      if (next && !next.startsWith('--')) {
        options.forceIds.add(next)
        index += 1
      } else {
        options.forceAll = true
      }
    } else if (arg === '--model') {
      options.model = argv[index + 1] ?? options.model
      index += 1
    } else if (arg === '--voice') {
      options.voice = argv[index + 1] ?? options.voice
      index += 1
    } else if (arg === '--language') {
      options.language = argv[index + 1] ?? options.language
      index += 1
    } else if (arg === '--audio-format') {
      options.audioFormat = argv[index + 1] ?? options.audioFormat
      index += 1
    } else if (arg === '--limit') {
      const value = Number(argv[index + 1])
      options.limit = Number.isFinite(value) && value > 0 ? value : null
      index += 1
    } else if (arg === '--pack') {
      options.pack = argv[index + 1] ?? options.pack
      index += 1
    } else if (arg === '--write-manifest') {
      options.writeManifest = true
    }
  }

  return options
}

async function exists(filePath) {
  try {
    await stat(filePath)
    return true
  } catch {
    return false
  }
}

function clipPath(clip) {
  return path.join(outDir, `${clip.srcSoundId ?? clip.soundId}.mp3`)
}

function inputForClip(clip) {
  return clip.ttsText ?? clip.text
}

function stripNikkud(text) {
  return text.replace(/[\u0591-\u05C7]/g, '')
}

function slugFromSoundId(soundId, prefix) {
  return soundId.slice(prefix.length)
}

function letterNameClip(soundId) {
  const slug = slugFromSoundId(soundId, 'he_letter_')
  const text = letterBySlug[slug]
  if (!text) return null
  return {
    soundId,
    text,
    ttsText: letterNameText[slug] ?? text,
    kind: 'letter',
  }
}

function holdClip(soundId) {
  const slug = slugFromSoundId(soundId, 'he_hold_letter_')
  const text = holdText[slug]
  if (!text) return null
  return {
    soundId,
    text,
    ttsText: text,
    kind: 'hold',
  }
}

function syllableClip(soundId, seenText) {
  const match = soundId.match(/^he_syllable_(.+)_(patah|qamats|hiriq|tsere|segol|holam|qubuts|shuruk)$/)
  if (!match) return null
  const [, slug, vowel] = match
  const letter = letterBySlug[slug]
  if (!letter) return null
  const text = seenText ?? (vowel === 'shuruk' ? `${letter}${vowelMarks.shuruk}` : `${letter}${vowelMarks[vowel]}`)
  const ttsText = ttsTextForSyllable(letter, vowel)
  return {
    soundId,
    text,
    ttsText,
    srcSoundId: slug === 'yod' && vowel === 'patah' ? 'he_syllable_yod_qamats' : undefined,
    kind: 'syllable',
  }
}

function wordClip(soundId, seenText) {
  if (!soundId.startsWith('he_word_')) return null
  const text = seenText ?? slugFromSoundId(soundId, 'he_word_')
  return {
    soundId,
    text,
    ttsText: text,
    kind: 'word',
  }
}

function clipFromSoundId(soundId, seenText) {
  if (soundId.startsWith('he_letter_')) return letterNameClip(soundId)
  if (soundId.startsWith('he_hold_letter_')) return holdClip(soundId)
  if (soundId.startsWith('he_syllable_')) return syllableClip(soundId, seenText)
  if (soundId.startsWith('he_word_')) return wordClip(soundId, seenText)
  return null
}

function addSeenText(map, soundId, text) {
  if (!soundId || !text) return
  const cleaned = text.trim()
  if (!cleaned || map.has(soundId)) return
  map.set(soundId, cleaned)
}

function compareClips(left, right) {
  return (clipKindRank[left.kind] ?? 99) - (clipKindRank[right.kind] ?? 99) || left.soundId.localeCompare(right.soundId)
}

async function transpileTsFile(sourcePath, outputPath, replacements = []) {
  const source = await readFile(sourcePath, 'utf8')
  let output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
    },
  }).outputText

  for (const [from, to] of replacements) {
    output = output.replaceAll(from, to)
  }

  await writeFile(outputPath, output)
}

async function loadCurriculum() {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ivrit-audio-'))
  await transpileTsFile(path.join(repoRoot, 'src', 'game', 'audioSamples.ts'), path.join(tempDir, 'audioSamples.cjs'))
  await transpileTsFile(path.join(repoRoot, 'src', 'game', 'content.ts'), path.join(tempDir, 'content.cjs'), [
    ['require("./audioSamples")', 'require("./audioSamples.cjs")'],
  ])

  const require = createRequire(import.meta.url)
  return require(path.join(tempDir, 'content.cjs'))
}

function collectLevelSoundIds(levels, getChoiceHoldSoundId) {
  const soundIds = new Set()
  const seenText = new Map()

  for (const level of levels) {
    addSeenText(seenText, level.completionAudioId, level.target.display)
    soundIds.add(level.completionAudioId)

    for (const choice of level.choices) {
      soundIds.add(choice.soundId)
      addSeenText(seenText, choice.soundId, choice.text)
      const holdSoundId = getChoiceHoldSoundId(choice)
      soundIds.add(holdSoundId)
      addSeenText(seenText, holdSoundId, choice.text)
    }

    for (const slot of level.target.slots) {
      soundIds.add(slot.soundId)
      addSeenText(seenText, slot.soundId, slot.text)
    }
  }

  return { soundIds, seenText }
}

async function firstHalfPack() {
  const curriculum = await loadCurriculum()
  const firstHalfLevels = curriculum.LEVELS.slice(0, FIRST_HALF_LEVEL_COUNT)
  const { soundIds, seenText } = collectLevelSoundIds(firstHalfLevels, curriculum.getChoiceHoldSoundId)

  return [...soundIds]
    .map((soundId) => clipFromSoundId(soundId, seenText.get(soundId)))
    .filter(Boolean)
    .sort(compareClips)
}

async function allGamePack() {
  const curriculum = await loadCurriculum()
  const { soundIds, seenText } = collectLevelSoundIds(curriculum.LEVELS, curriculum.getChoiceHoldSoundId)

  return [...soundIds]
    .map((soundId) => clipFromSoundId(soundId, seenText.get(soundId)))
    .filter(Boolean)
    .sort(compareClips)
}

async function clipsForPack(pack) {
  if (pack === 'samples') return [...samplePack].sort(compareClips)
  if (pack === 'first-half') return firstHalfPack()
  if (pack === 'all') return allGamePack()
  throw new Error(`Unknown audio pack "${pack}". Use samples, first-half, or all.`)
}

function serializeClip(clip) {
  const ttsText = clip.ttsText && clip.ttsText !== clip.text ? `, ttsText: ${JSON.stringify(clip.ttsText)}` : ''
  const ready = clip.ready === false ? ', ready: false' : ''
  const srcSoundId = clip.srcSoundId ?? clip.soundId
  return `  { soundId: ${JSON.stringify(clip.soundId)}, text: ${JSON.stringify(clip.text)}, kind: ${JSON.stringify(clip.kind)}, src: ${JSON.stringify(`/audio/samples/${srcSoundId}.mp3`)}${ttsText}${ready} },`
}

async function writeAudioManifest(clips) {
  const clipsWithStatus = await Promise.all(
    clips.map(async (clip) => ({
      ...clip,
      ready: await exists(clipPath(clip)),
    })),
  )

  const source = `export type AudioSampleClip = {
  soundId: string
  text: string
  kind: 'letter' | 'hold' | 'syllable' | 'word'
  src: string
  ttsText?: string
  ready?: boolean
}

export const AUDIO_SAMPLE_CLIPS: AudioSampleClip[] = [
${clipsWithStatus.map(serializeClip).join('\n')}
]
`

  await writeFile(manifestPath, source)
}

async function createSpeech(clip, options) {
  const response = await fetch(SONIOX_TTS_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SONIOX_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model,
      language: options.language,
      voice: options.voice,
      audio_format: options.audioFormat,
      text: inputForClip(clip),
      sample_rate: options.sampleRate,
      bitrate: options.bitrate,
    }),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Soniox TTS request failed for ${clip.soundId}: ${response.status} ${message}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const packClips = await clipsForPack(options.pack)
  await mkdir(outDir, { recursive: true })

  const selectedClips = options.forceIds.size
    ? packClips.filter((clip) => options.forceIds.has(clip.soundId))
    : packClips

  const rows = await Promise.all(
    selectedClips.map(async (clip) => {
      const filePath = clipPath(clip)
      const present = await exists(filePath)
      const forced = options.forceAll || options.forceIds.has(clip.soundId)
      return { clip, filePath, present, shouldGenerate: forced || !present }
    }),
  )

  const pending = rows.filter((row) => row.shouldGenerate)
  const missing = pending.slice(0, options.limit ?? pending.length)
  const existing = rows.filter((row) => row.present).length

  if (options.dryRun) {
    if (options.writeManifest) {
      await writeAudioManifest(packClips)
    }
    console.log(`Soniox audio ${options.pack} dry run: ${missing.length} to generate, ${existing} already present, ${packClips.length} clips in pack.`)
    console.log(`model=${options.model} voice=${options.voice} language=${options.language} format=${options.audioFormat}`)
    if (options.writeManifest) console.log(`Updated ${path.relative(repoRoot, manifestPath)}`)
    for (const row of missing) {
      const ttsText = inputForClip(row.clip)
      console.log(`- ${row.clip.soundId} (${row.clip.text}${ttsText !== row.clip.text ? ` -> ${ttsText}` : ''}) -> ${path.relative(repoRoot, row.filePath)}`)
    }
    return
  }

  if (!process.env.SONIOX_API_KEY) {
    throw new Error(
      [
        'SONIOX_API_KEY is not set.',
        'Set it in your shell, then run: npm run audio:samples',
        'Use npm run audio:samples -- --dry-run to preview missing files without generating.',
      ].join('\n'),
    )
  }

  for (const row of missing) {
    console.log(`Generating ${row.clip.soundId} (${inputForClip(row.clip)}) with Soniox ${options.voice}`)
    const audio = await createSpeech(row.clip, options)
    await writeFile(row.filePath, audio)
  }

  if (options.writeManifest) {
    await writeAudioManifest(packClips)
  }

  const generatedFiles = await Promise.all(
    packClips.map(async (clip) => {
      const filePath = clipPath(clip)
      return (await exists(filePath)) ? path.relative(repoRoot, filePath) : null
    }),
  )

  console.log(`Done. ${generatedFiles.filter(Boolean).length}/${packClips.length} ${options.pack} audio files are present.`)

  const gitkeep = path.join(outDir, '.gitkeep')
  if (!(await exists(gitkeep))) {
    await writeFile(gitkeep, '')
  } else {
    await readFile(gitkeep)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
