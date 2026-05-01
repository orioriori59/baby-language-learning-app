import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const outDir = path.join(repoRoot, 'public', 'audio', 'samples')
const SONIOX_TTS_ENDPOINT = 'https://tts-rt.soniox.com/tts'

const sampleClips = [
  { soundId: 'he_letter_alef', text: 'א', ttsText: 'אָלֶף', kind: 'letter' },
  { soundId: 'he_letter_bet', text: 'ב', ttsText: 'בֶּת', kind: 'letter' },
  { soundId: 'he_letter_mem', text: 'מ', ttsText: 'מֵם', kind: 'letter' },
  { soundId: 'he_hold_letter_alef', text: 'אַ אַ אַ אַ', kind: 'hold' },
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
  return path.join(outDir, `${clip.soundId}.mp3`)
}

function inputForClip(clip) {
  return clip.ttsText ?? clip.text
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
  await mkdir(outDir, { recursive: true })

  const selectedClips = options.forceIds.size
    ? sampleClips.filter((clip) => options.forceIds.has(clip.soundId))
    : sampleClips

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
    console.log(`Soniox audio sample dry run: ${missing.length} to generate, ${existing} already present.`)
    console.log(`model=${options.model} voice=${options.voice} language=${options.language} format=${options.audioFormat}`)
    for (const row of missing) {
      console.log(`- ${row.clip.soundId} (${row.clip.text}) -> ${path.relative(repoRoot, row.filePath)}`)
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
    console.log(`Generating ${row.clip.soundId} (${row.clip.text}) with Soniox ${options.voice}`)
    const audio = await createSpeech(row.clip, options)
    await writeFile(row.filePath, audio)
  }

  const generatedFiles = await Promise.all(
    sampleClips.map(async (clip) => {
      const filePath = clipPath(clip)
      return (await exists(filePath)) ? path.relative(repoRoot, filePath) : null
    }),
  )

  console.log(`Done. ${generatedFiles.filter(Boolean).length}/${sampleClips.length} sample files are present.`)

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
