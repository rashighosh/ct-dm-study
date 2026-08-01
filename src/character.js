import { TalkingHead } from './talkinghead-files/talkinghead.mjs'

// ============================================================
// Config
// ============================================================

// const BASE_URL = 'https://fastapi-rashi.onrender.com';
// const BASE_URL = 'http://127.0.0.1:8000'
const BASE_URL =
  'https://brcco3c42yqwcnqmvj4h2k2igu0fysxd.lambda-url.us-east-1.on.aws'

// ============================================================
// Module state
// ============================================================

let head = null // Dr. Alex (doctor) TalkingHead instance
let head1 = null // Jordan (companion) TalkingHead instance

let onSubtitleCallback = null
let subtitleRunId = 0

let isSwiping = false // kill switch for the swipe gesture loop
let isWriting = false // kill switch for the swipe gesture loop

// Resume suspended audio contexts on first user interaction (autoplay policy)
document.addEventListener(
  'click',
  () => {
    if (head?.audioCtx?.state === 'suspended') {
      head.audioCtx.resume()
    }
    if (head1?.audioCtx?.state === 'suspended') {
      head1.audioCtx.resume()
    }
  },
  { once: true },
)

// ============================================================
// Character initialization / lifecycle
// ============================================================

export async function initDoctorCharacter(containerNode, view = 'mid') {
  head = new TalkingHead(containerNode, {
    lipsyncModules: ['en'],
    cameraView: view, // full, mid, upper, head,
    cameraRotateEnable: false,
    cameraPanEnable: false,
    cameraZoomEnable: false,
    avatarIdleEyeContact: 1,
    avatarIdleHeadMove: 1,
    avatarSpeakingEyeContact: 1,
    avatarSpeakingHeadMove: 1,
  })

  await head.showAvatar({
    url: '/character-models/doctor.glb',
    body: 'F',
    avatarMood: 'neutral',
    ttsLang: 'en-GB',
    ttsVoice: 'en-GB-Standard-A',
    lipsyncLang: 'en',
  })

  return head
}

export async function initCompanionCharacter(containerNode) {
  head1 = new TalkingHead(containerNode, {
    lipsyncModules: ['en'],
    cameraView: 'mid', // full, mid, upper, head,
    avatarIdleEyeContact: 1,
    avatarIdleHeadMove: 1,
    avatarSpeakingEyeContact: 1,
    avatarSpeakingHeadMove: 1,
    cameraRotateEnable: false,
    cameraPanEnable: false,
    cameraZoomEnable: false,
  })

  await head1.showAvatar({
    url: '/character-models/male.glb',
    body: 'M',
    avatarMood: 'neutral',
    ttsLang: 'en-GB',
    ttsVoice: 'en-GB-Standard-A',
    lipsyncLang: 'en',
  })

  return head1
}

export function stopCharacter() {
  head?.stop()
}

async function disposeTalkingHead(instance) {
  if (!instance) return

  // Stop current speech, gestures, and animation activity.
  try {
    instance.stop?.()
  } catch (error) {
    console.warn('Could not stop TalkingHead:', error)
  }

  try {
    instance.stopGesture?.(0)
  } catch (error) {
    console.warn('Could not stop TalkingHead gesture:', error)
  }

  // Prefer the library's own cleanup method when available.
  if (typeof instance.dispose === 'function') {
    try {
      await instance.dispose()
      return
    } catch (error) {
      console.warn('TalkingHead dispose failed; using fallback cleanup:', error)
    }
  }

  // Fallback cleanup for the underlying Three.js renderer.
  try {
    instance.renderer?.setAnimationLoop?.(null)
    instance.renderer?.dispose?.()
    instance.renderer?.forceContextLoss?.()
  } catch (error) {
    console.warn('Could not dispose TalkingHead renderer:', error)
  }

  try {
    instance.controls?.dispose?.()
  } catch (error) {
    console.warn('Could not dispose TalkingHead controls:', error)
  }

  // Remove the old WebGL canvas.
  try {
    instance.renderer?.domElement?.remove()
  } catch (error) {
    console.warn('Could not remove TalkingHead canvas:', error)
  }

  // Release its audio context.
  try {
    if (instance.audioCtx && instance.audioCtx.state !== 'closed') {
      await instance.audioCtx.close()
    }
  } catch (error) {
    console.warn('Could not close TalkingHead audio context:', error)
  }
}

export async function disposeCharacters() {
  // Stop any persistent loops or stale subtitle callbacks.
  isSwiping = false
  subtitleRunId += 1
  onSubtitleCallback = null

  const doctor = head
  const companion = head1

  // Clear the shared references immediately so no new calls use old instances.
  head = null
  head1 = null

  await Promise.allSettled([
    disposeTalkingHead(doctor),
    disposeTalkingHead(companion),
  ])
}

// ============================================================
// Gestures (TalkingHead built-in gesture system)
// Mostly act on head1 (Jordan/companion); a couple act on head
// (Dr. Alex/doctor) - kept explicit per-function rather than
// parameterized, so the target character stays obvious at a glance.
// ============================================================

export async function shrug() {
  head1?.stopGesture(3000)
  head1?.playGesture('shrug')
}

export async function thinking() {
  console.log('STARTING THINKING GESTURE')
  head1?.stopGesture(1500)
  head1?.playGesture('think', Infinity, false, 1500)
}

export async function thinkingTurn() {
  console.log('STARTING THINKING GESTURE')
  head1?.stopGesture(1500)
  head1?.playGesture('thinkTurn', Infinity, false, 3000)
}

export async function thinkingDoctor() {
  head?.stopGesture(1500)
  head?.playGesture('think', Infinity, false, 1500)
}

export async function thumbsup() {
  head1?.stopGesture(3000)
  head1?.playGesture('thumbup', Infinity, false, 1500)
}

export async function thumbsupQuick() {
  head1.playGesture('thumbup', 2, false, 1000)
}

export async function wave() {
  head1.stopGesture(3000)
  head1?.playGesture('handup')
}

export async function ready() {
  head1?.stopGesture(3000)
  head1?.playGesture('ok')
}

export async function lookup() {
  head1?.stopGesture(3000)
  head1?.playGesture('lookup')
}

export async function lookdown() {
  head1?.stopGesture(1500)
  head1?.playGesture('lookdown', Infinity, false, 1500)
}

export async function lookright() {
  head1?.stopGesture(1500)
  head1?.playGesture('lookright', Infinity, true, 1500)
}

export async function alexLookAtJordan() {
  head?.stopGesture(1500)
  head?.playGesture('lookright', Infinity, true, 1500)
}

export async function jordanLookAtAlex() {
  head1?.stopGesture(1500)
  head1?.playGesture('lookright', Infinity, false, 1500)
}

export async function indexFingerRaise() {
  head1?.stopGesture(1500)
  head1?.playGesture('indexFingerRaise', Infinity, false, 1500)
}

export async function rightGesture() {
  head1?.playGesture('rightGesture')
}

export async function sourcesGesture() {
  head?.playGesture('sourcesGesture')
}

export async function leftGesture() {
  console.log('IN LEFT GESTURE')
  head1?.playGesture('leftGesture', Infinity, true, 1500)
}

export async function introduceJordan() {
  head?.playGesture('introduceJordan')
}

export async function headNod() {
  head.playGesture('yes', 5, false, 1500)
  // head.playAnimation('/animations/Looking Around.fbx')
}

export async function stopAlexGesture() {
  head?.stopGesture(3000)
}

export async function stopCompanionGesture() {
  console.log('STOPPING COMPANION GESTURE')
  head1?.stopGesture(3000)
}

// --- Swipe gesture loop (stateful start/stop pair) ---

async function playSmoothSequence(talkingHead, sequence) {
  for (const item of sequence) {
    talkingHead.playGesture(item.name, item.dur, item.mirror, item.ms)

    // Overlap by 20ms to keep the engine's "exponential smoothing" active
    const overlap = 20
    const waitTime = item.dur * 1000 - overlap

    await new Promise((resolve) => setTimeout(resolve, Math.max(0, waitTime)))
  }
}

export async function startSwiping() {
  if (isSwiping) return // prevent multiple loops starting at once
  isSwiping = true

  // Initial lift (only happens once at the start)
  await playSmoothSequence(head, [{ name: 'swipeReady', dur: 1, ms: 1000 }])

  const loopMoves = [
    { name: 'swipeDone', dur: 0.9, ms: 2000 },
    { name: 'swipeReady', dur: 0.9, ms: 2000 },
  ]

  while (isSwiping) {
    await playSmoothSequence(head, loopMoves)
  }

  // Final drop (only happens once when isSwiping becomes false)
  await playSmoothSequence(head, [{ name: null, dur: 0, ms: 200 }])
}

export function stopSwiping() {
  isSwiping = false
}

export async function startWriting() {
  if (isWriting) return
  isWriting = true

  await playSmoothSequence(head1, [{ name: 'boardTurn', dur: 1.6, ms: 1800 }])
  await playSmoothSequence(head1, [{ name: 'boardReady', dur: 0.6, ms: 800 }])

  const strokeMoves = [
    { name: 'writeStrokeA', dur: 0.3, ms: 650 },
    { name: 'writeStrokeB', dur: 0.3, ms: 650 },
  ]

  let strokeCount = 0
  while (isWriting) {
    await playSmoothSequence(head1, strokeMoves)
    strokeCount++
    if (isWriting && strokeCount % 4 === 0) {
      await playSmoothSequence(head1, [
        { name: 'writeShift', dur: 0.4, ms: 900 },
      ])
    }
  }
  // No turn-back here anymore — stopWriting owns that now
}

export async function stopWriting() {
  if (!isWriting) return
  isWriting = false

  await playSmoothSequence(head1, [{ name: 'armDown', dur: 0.6, ms: 800 }])
  await playSmoothSequence(head1, [
    { name: 'boardTurnBack', dur: 1.0, ms: 1200 },
  ])
  await playSmoothSequence(head1, [{ name: null, dur: 0, ms: 200 }])
}

// Registry mapping gesture names (strings) to their trigger functions,
// used by playGesture() below to invoke a gesture dynamically by name.
export const gestures = {
  shrug,
  thumbsup,
  thumbsupQuick,
  thinking,
  thinkingDoctor,
  thinkingTurn,
  ready,
  lookup,
  lookdown,
  lookright,
  alexLookAtJordan,
  jordanLookAtAlex,
  indexFingerRaise,
  headNod,
  startSwiping,
  stopSwiping,
  wave,
  rightGesture,
  stopCompanionGesture,
  stopAlexGesture,
  sourcesGesture,
  startWriting,
  stopWriting,
}

export function playGesture(name) {
  const gesture = gestures[name]

  if (!gesture) {
    console.warn(`Unknown gesture: "${name}"`)
    return
  }

  gesture()
}

// ============================================================
// Subtitles
// ============================================================

export function setSubtitleCallback(fn) {
  onSubtitleCallback = fn
}

function isMonotonic(timestamps) {
  for (let i = 1; i < timestamps.length; i++) {
    if (timestamps[i].start < timestamps[i - 1].start) return false
  }
  return true
}

function createSubtitleTimers({
  timestamps,
  runId,
  onSubtitle,
  wordsPerCaption = 8,
}) {
  if (!onSubtitle || timestamps.length === 0) {
    return []
  }

  const timers = []

  for (let index = 0; index < timestamps.length; index += wordsPerCaption) {
    const timer = setTimeout(() => {
      if (runId !== subtitleRunId) return

      const caption = timestamps
        .slice(index, index + wordsPerCaption)
        .map((item) => item.word.trim())
        .join(' ')

      onSubtitle(caption)
    }, timestamps[index].start * 1000)

    timers.push(timer)
  }

  return timers
}

// ============================================================
// Preparing & queuing speech
// ============================================================

export async function prepareSpeech(text, character = 'doctor') {
  const activeHead = character === 'companion' ? head1 : head

  const ttsRes = await fetch(`${BASE_URL}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, character }),
  })

  if (!ttsRes.ok) {
    throw new Error(`TTS request failed (${ttsRes.status})`)
  }

  const { audio, timestamps: rawTimestamps = [] } = await ttsRes.json()

  const timestamps = isMonotonic(rawTimestamps) ? rawTimestamps : []

  const audioBytes = Uint8Array.from(atob(audio), (character) =>
    character.charCodeAt(0),
  )

  const audioBuffer = await activeHead.audioCtx.decodeAudioData(
    audioBytes.buffer,
  )

  return {
    activeHead,
    text,
    timestamps,
    audioBuffer,
  }
}

export async function playPreparedSpeech({
  prepared,
  gesture = null,
  onStart = null,
  onSubtitle = null,
}) {
  const { activeHead, text, timestamps, audioBuffer } = prepared

  const words = timestamps.map((item) =>
    item.word.trim().replace(/[.,!?;:]/g, ''),
  )

  const wtimes = timestamps.map((item) => item.start * 1000)

  const wdurations = timestamps.map((item) => (item.end - item.start) * 1000)

  activeHead.stopGesture()

  if (gesture) {
    activeHead.playGesture(gesture, 1)
  }

  const runId = ++subtitleRunId
  const subtitleTimers = []

  if (onSubtitle) {
    if (timestamps.length > 0) {
      const wordsPerCaption = 8

      for (let index = 0; index < timestamps.length; index += wordsPerCaption) {
        const timer = window.setTimeout(() => {
          if (runId !== subtitleRunId) return

          const caption = timestamps
            .slice(index, index + wordsPerCaption)
            .map((item) => item.word)
            .join(' ')

          onSubtitle(caption)
        }, timestamps[index].start * 1000)

        subtitleTimers.push(timer)
      }
    } else {
      onSubtitle(text)
    }
  }

  const { markers, mtimes } = createSpeechGestures(activeHead, audioBuffer)

  onStart?.()

  activeHead.speakAudio(
    {
      audio: audioBuffer,
      words,
      wtimes,
      wdurations,
      markers,
      mtimes,
    },
    { isRaw: true },
    null,
  )

  return new Promise((resolve) => {
    window.setTimeout(() => {
      subtitleTimers.forEach(window.clearTimeout)

      if (runId === subtitleRunId) {
        onSubtitle?.('')
      }

      resolve()
    }, audioBuffer.duration * 1000)
  })
}

// ============================================================
// Speech / lipsync - dynamic TTS (calls backend /tts endpoint)
// ============================================================

export function speakText(text) {
  head?.speakText(text)
}

function createSpeechGestures(activeHead, audioBuffer) {
  const markers = []
  const mtimes = []

  const gesturePool = ['talkopen', 'rightGesture']
  const durationMs = audioBuffer.duration * 1000

  if (durationMs <= 2500) {
    return { markers, mtimes }
  }

  const numberOfGestures = Math.min(
    3,
    Math.max(1, Math.floor(durationMs / 6000)),
  )

  const usedTimes = []

  for (let i = 0; i < numberOfGestures; i++) {
    const minTime = 1200
    const maxTime = durationMs - 1200

    if (maxTime <= minTime) break

    const time = minTime + Math.random() * (maxTime - minTime)

    const tooClose = usedTimes.some((used) => Math.abs(used - time) < 2500)
    if (tooClose) continue

    usedTimes.push(time)

    const gesture = gesturePool[Math.floor(Math.random() * gesturePool.length)]

    markers.push(() => {
      activeHead.playGesture(gesture, 1.6, false, 1200)
    })

    mtimes.push(time)
  }

  return { markers, mtimes }
}

export async function speakWithLipsync(
  text,
  character = 'doctor',
  gesture = null,
  onStart = null,
  onSubtitle = null,
) {
  const activeHead = character === 'companion' ? head1 : head

  const ttsRes = await fetch(`${BASE_URL}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, character }),
  })

  const { audio, timestamps: rawTimestamps = [] } = await ttsRes.json()

  const timestamps = isMonotonic(rawTimestamps) ? rawTimestamps : []

  if (!isMonotonic(rawTimestamps)) {
    console.warn(
      'Non-monotonic timestamps from /tts; falling back to plain caption.',
    )
  }

  const audioBytes = Uint8Array.from(atob(audio), (c) => c.charCodeAt(0))
  const audioBuffer = await activeHead.audioCtx.decodeAudioData(
    audioBytes.buffer,
  )

  const words = timestamps.map((t) => t.word.trim().replace(/[.,!?;:]/g, ''))
  const wtimes = timestamps.map((t) => t.start * 1000)
  const wdurations = timestamps.map((t) => (t.end - t.start) * 1000)

  activeHead.stopGesture()

  if (gesture) {
    activeHead.playGesture(gesture, 1)
  }

  onStart?.()
  onSubtitle?.('')

  const runId = ++subtitleRunId
  const subtitleTimers = []

  if (onSubtitle) {
    if (timestamps.length > 0) {
      const WORDS_PER_CAPTION = 8

      for (let i = 0; i < timestamps.length; i += WORDS_PER_CAPTION) {
        const timer = setTimeout(() => {
          if (runId !== subtitleRunId) return
          const caption = timestamps
            .slice(i, Math.min(i + WORDS_PER_CAPTION, timestamps.length))
            .map((item) => item.word)
            .join(' ')

          onSubtitle(caption)
        }, timestamps[i].start * 1000)

        subtitleTimers.push(timer)
      }
    } else {
      onSubtitle(text)
    }
  }

  const { markers, mtimes } = createSpeechGestures(activeHead, audioBuffer)

  activeHead.speakAudio(
    {
      audio: audioBuffer,
      words,
      wtimes,
      wdurations,
      markers,
      mtimes,
    },
    { isRaw: true },
    null,
  )

  return new Promise((resolve) => {
    setTimeout(() => {
      subtitleTimers.forEach(clearTimeout)
      if (runId === subtitleRunId) {
        onSubtitle?.('')
      }

      resolve()
    }, audioBuffer.duration * 1000)
  })
}

// ============================================================
// Speech / lipsync - static/pre-rendered audio, with hand-authored
// gesture cue maps keyed by audio file path
// ============================================================

const STATIC_GESTURE_MAPS = {
  '/intro-voices/doctor-audio-ALEX_INTRO_1.mp3': [
    { engine: 'native', word: 'hi', gesture: 'handup', dur: 1.5, reset: false },
    {
      engine: 'native',
      word: 'this',
      gesture: 'introduceJordan',
      dur: 1,
      reset: false,
    },
    {
      engine: 'native',
      word: 'we',
      gesture: 'chest',
      dur: 1.2,
      resetTransition: 500,
    },
    {
      engine: 'native',
      word: 'help',
      gesture: 'talkopen',
      dur: 2,
      resetTransition: 500,
    },
  ],
  '/intro-voices/doctor-audio-ALEX_INTRO_ADAPTIVE_1.mp3': [
    { engine: 'native', word: 'hi', gesture: 'handup', dur: 1.5, reset: false },
    {
      engine: 'native',
      word: 'this',
      gesture: 'introduceJordan',
      dur: 1,
      reset: false,
    },
    {
      engine: 'native',
      word: 'we',
      gesture: 'chest',
      dur: 1.2,
      resetTransition: 500,
    },
    {
      engine: 'native',
      word: 'help',
      gesture: 'talkopen',
      dur: 2,
      resetTransition: 500,
    },
  ],
  '/intro-voices/doctor-audio-ALEX_INTRO_1_FORAGING_COMBINED.mp3': [
    { engine: 'native', word: 'hi', gesture: 'handup', dur: 0.8, reset: false },
    {
      engine: 'native',
      word: 'I',
      gesture: 'chest',
      dur: 1.2,
      resetTransition: 500,
    },
    {
      engine: 'native',
      word: 'help',
      gesture: 'talkopen',
      dur: 2,
      resetTransition: 300,
    },
  ],
  '/intro-voices/doctor-audio-ALEX_INTRO_2.mp3': [
    {
      engine: 'native',
      word: 'explain',
      gesture: 'chest',
      dur: 1.5,
      reset: false,
    },
    {
      engine: 'native',
      word: 'virtual',
      gesture: 'talkopen',
      dur: 1,
      resetTransition: 500,
    },
    {
      engine: 'native',
      word: 'search',
      gesture: 'rightGesture',
      dur: 1.5,
      resetTransition: 200,
    },
    {
      engine: 'native',
      word: 'pull',
      gesture: 'talkopen',
      dur: 1.5,
      resetTransition: 200,
    },
  ],
  '/intro-voices/doctor-audio-ALEX_INTRO_ADAPTIVE_2.mp3': [
    {
      engine: 'native',
      word: 'explain',
      gesture: 'chest',
      dur: 1.5,
      reset: false,
    },
    {
      engine: 'native',
      word: 'virtual',
      gesture: 'talkopen',
      dur: 1,
      resetTransition: 500,
    },
    {
      engine: 'native',
      word: 'search',
      gesture: 'rightGesture',
      dur: 1.5,
      resetTransition: 200,
    },
    {
      engine: 'native',
      word: 'the',
      gesture: 'talkopen',
      dur: 1.5,
      resetTransition: 200,
    },
  ],
  '/intro-voices/doctor-audio-ALEX_INTRO_3.mp3': [
    {
      engine: 'native',
      word: 'these',
      gesture: 'rightGesture',
      dur: 1.5,
      reset: false,
    },
    {
      engine: 'native',
      word: 'purpose',
      gesture: 'talkopen',
      dur: 1.5,
      reset: false,
    },
    {
      engine: 'native',
      word: 'topics',
      gesture: 'rightGesture',
      dur: 1.5,
      resetTransition: 200,
    },
    {
      engine: 'native',
      word: 'share',
      gesture: 'chest',
      dur: 1.5,
      resetTransition: 200,
    },
    {
      engine: 'native',
      word: 'save',
      gesture: 'talkopen',
      dur: 1.5,
      resetTransition: 200,
    },
  ],
  '/intro-voices/doctor-audio-ALEX_INTRO_ADAPTIVE_3.mp3': [
    {
      engine: 'native',
      word: 'these',
      gesture: 'rightGesture',
      dur: 1.5,
      reset: false,
    },
    {
      engine: 'native',
      word: 'purpose',
      gesture: 'talkopen',
      dur: 1.5,
      reset: false,
    },
    {
      engine: 'native',
      word: 'topics',
      gesture: 'rightGesture',
      dur: 1.5,
      resetTransition: 200,
    },
    {
      engine: 'native',
      word: 'share',
      gesture: 'chest',
      dur: 1.5,
      resetTransition: 200,
    },
    {
      engine: 'native',
      word: 'this',
      gesture: 'rightGesture',
      dur: 1.5,
      resetTransition: 200,
    },
    {
      engine: 'native',
      word: 'save',
      gesture: 'talkopen',
      dur: 1.5,
      resetTransition: 200,
    },
  ],
  '/intro-voices/doctor-audio-ALEX_INTRO_4.mp3': [
    {
      engine: 'native',
      word: 'one',
      gesture: 'oneQuestion',
      dur: 1,
      reset: false,
    },
    {
      engine: 'native',
      word: 'that',
      gesture: 'talkopen',
      dur: 1,
      reset: false,
    },
    {
      engine: 'native',
      word: 'so',
      gesture: 'rightGesture',
      dur: 1.5,
      resetTransition: 200,
    },
  ],
  '/intro-voices/doctor-audio-ALEX_INTRO_ADAPTIVE_4.mp3': [
    {
      engine: 'native',
      word: 'one',
      gesture: 'oneQuestion',
      dur: 1,
      reset: false,
    },
    {
      engine: 'native',
      word: 'that',
      gesture: 'talkopen',
      dur: 1,
      reset: false,
    },
    {
      engine: 'native',
      word: 'so',
      gesture: 'rightGesture',
      dur: 1.5,
      resetTransition: 200,
    },
  ],
  '/intro-voices/doctor-audio-ALEX_INTRO_4_1_FORAGING.mp3': [
    {
      engine: 'native',
      word: 'explore',
      gesture: 'chest',
      dur: 1.5,
      reset: false,
    },
    {
      engine: 'native',
      word: 'information',
      gesture: 'talkopen',
      dur: 2,
      reset: false,
    },
    {
      engine: 'native',
      word: 'suggest',
      gesture: 'rightGesture',
      dur: 2,
      reset: false,
    },
  ],
  '/intro-voices/doctor-audio-ALEX_INTRO_4_1_FORAGING_V2.mp3': [
    {
      engine: 'native',
      word: 'whiteboard',
      gesture: 'leftGesture',
      dur: 1.5,
      reset: false,
    },
  ],
  '/intro-voices/doctor-audio-ALEX_INTRO_4_2_FORAGING.mp3': [
    {
      engine: 'native',
      word: 'between',
      gesture: 'talkopen',
      dur: 1.5,
      reset: false,
    },
    {
      engine: 'native',
      word: 'click',
      gesture: 'chest',
      dur: 1.5,
      reset: false,
    },
  ],
  '/intro-voices/doctor-audio-ALEX_INTRO_4_2_FORAGING_V2.mp3': [
    {
      engine: 'native',
      word: 'questions',
      gesture: 'rightGesture',
      dur: 2,
      reset: false,
    },
  ],
  '/intro-voices/doctor-audio-ALEX_INTRO_5.mp3': [
    {
      engine: 'native',
      word: 'now',
      gesture: 'introduceJordan',
      dur: 1.5,
      reset: false,
    },
  ],
  '/intro-voices/doctor-audio-ALEX_INTRO_ADAPTIVE_5.mp3': [
    {
      engine: 'native',
      word: 'now',
      gesture: 'introduceJordan',
      dur: 1.5,
      reset: false,
    },
  ],
  '/intro-voices/doctor-audio-ALEX_INTRO_5_FORAGING_COMBINED.mp3': [
    {
      engine: 'native',
      word: 'whenever',
      gesture: 'talkopen',
      dur: 1.5,
      resetTransition: 200,
    },
  ],
  '/intro-voices/doctor-audio-ALEX_INSTRUCTION_FORAGING.mp3': [
    {
      engine: 'native',
      word: 'shared',
      gesture: 'rightGesture',
      dur: 2.1,
      resetTransition: 300,
    },
  ],
  '/intro-voices/doctor-audio-ALEX_INSTRUCTION_SENSEMAKING.mp3': [
    {
      engine: 'native',
      word: 'track',
      gesture: 'leftGesture',
      dur: 1.5,
      resetTransition: 200,
    },
  ],
  '/intro-voices/companion-audio-JORDAN_INTRO_1.mp3': [
    {
      engine: 'native',
      word: 'mentioned',
      gesture: 'chest',
      dur: 1.5,
      reset: false,
    },
    {
      engine: 'native',
      word: 'provide',
      gesture: 'talkopen',
      dur: 2,
      reset: false,
    },
  ],
  '/intro-voices/companion-audio-JORDAN_INTRO_ADAPTIVE_1.mp3': [
    {
      engine: 'native',
      word: 'mentioned',
      gesture: 'chest',
      dur: 1.5,
      reset: false,
    },
    {
      engine: 'native',
      word: 'help',
      gesture: 'talkopen',
      dur: 2,
      reset: false,
    },
  ],
  '/intro-voices/companion-audio-JORDAN_INTRO_2.mp3': [
    {
      engine: 'native',
      word: 'explore',
      gesture: 'chest',
      dur: 1.5,
      reset: false,
    },
    {
      engine: 'native',
      word: 'information',
      gesture: 'talkopen',
      dur: 2,
      reset: false,
    },
    {
      engine: 'native',
      word: 'suggest',
      gesture: 'rightGesture',
      dur: 2,
      reset: false,
    },
  ],
  '/intro-voices/companion-audio-JORDAN_INTRO_ADAPTIVE_2.mp3': [
    {
      engine: 'native',
      word: 'information',
      gesture: 'chest',
      dur: 1.5,
      reset: false,
    },
    {
      engine: 'native',
      word: 'white',
      gesture: 'rightGesture',
      dur: 2,
      reset: false,
    },
  ],
  '/intro-voices/companion-audio-JORDAN_INTRO_2_V2.mp3': [
    {
      engine: 'native',
      word: 'white',
      gesture: 'leftGesture',
      dur: 1.5,
      reset: false,
    },
  ],
  '/intro-voices/companion-audio-JORDAN_INTRO_3.mp3': [
    {
      engine: 'native',
      word: 'between',
      gesture: 'talkopen',
      dur: 1.5,
      reset: false,
    },
    {
      engine: 'native',
      word: 'click',
      gesture: 'chest',
      dur: 1.5,
      reset: false,
    },
  ],
  '/intro-voices/companion-audio-JORDAN_INTRO_ADAPTIVE_3.mp3': [
    {
      engine: 'native',
      word: 'Alex',
      gesture: 'talkopen',
      dur: 1.5,
      reset: false,
    },
    {
      engine: 'native',
      word: 'question',
      gesture: 'chest',
      dur: 1.5,
      reset: false,
    },
  ],
  '/intro-voices/companion-audio-JORDAN_INTRO_3_V2.mp3': [
    {
      engine: 'native',
      word: 'questions',
      gesture: 'rightGesture',
      dur: 2,
      reset: false,
    },
  ],
  '/intro-voices/companion-audio-JORDAN_INTRO_4.mp3': [
    {
      engine: 'native',
      word: 'whenever',
      gesture: 'talkopen',
      dur: 1.5,
      resetTransition: 200,
    },
  ],
  '/intro-voices/companion-audio-JORDAN_INTRO_ADAPTIVE_4.mp3': [
    {
      engine: 'native',
      word: 'whenever',
      gesture: 'talkopen',
      dur: 1.5,
      resetTransition: 200,
    },
  ],
  '/intro-voices/companion-audio-JORDAN_INSTRUCTION.mp3': [
    {
      engine: 'native',
      word: 'track',
      gesture: 'leftGesture',
      dur: 1.5,
      resetTransition: 200,
    },
  ],
}

function normalizeWord(word) {
  return word
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:]/g, '')
}

function buildGestureMarkers({
  audioPath,
  timestamps,
  wtimes,
  activeHead,
  character,
  gesturesEnabled,
}) {
  if (!gesturesEnabled) {
    return { markers: [], mtimes: [] }
  }

  const gestureDefinitions = STATIC_GESTURE_MAPS[audioPath] || []

  const normalizedTimestampWords = timestamps.map((item) =>
    normalizeWord(item.word),
  )

  const markers = []
  const mtimes = []

  gestureDefinitions.forEach(
    ({
      word,
      gesture,
      engine = 'native',
      dur = 2,
      transition = 800,
      resetTransition = 600,
      mirror = false,
      occurrence = 0,
      reset = true,
    }) => {
      const targetWord = normalizeWord(word)

      const matchingIndexes = normalizedTimestampWords
        .map((timestampWord, index) =>
          timestampWord === targetWord ? index : -1,
        )
        .filter((index) => index !== -1)

      const index = matchingIndexes[occurrence]

      if (index === undefined) {
        console.warn(
          `Gesture word "${word}" not found in timestamps for ${audioPath}`,
        )
        return
      }

      const startTime = wtimes[index]

      markers.push(() => {
        if (gesture === 'introduceJordan') {
          wave()

          setTimeout(() => {
            jordanLookAtAlex()
          }, 1800)
        }
        activeHead.playGesture(gesture, dur, mirror, transition)
      })

      mtimes.push(startTime)

      if (reset) {
        markers.push(() => {
          activeHead.playGesture(null, 0, false, resetTransition)
        })

        mtimes.push(startTime + dur * 1000)
      }
    },
  )

  const scheduledMarkers = markers
    .map((marker, index) => ({
      marker,
      time: mtimes[index],
    }))
    .sort((a, b) => a.time - b.time)

  return {
    markers: scheduledMarkers.map((item) => item.marker),
    mtimes: scheduledMarkers.map((item) => item.time),
  }
}

export async function speakWithLipsyncStatic(
  audioPath,
  timestampsPath,
  character = 'doctor',
  gestures = true,
  onSubtitle = null,
) {
  const activeHead = character === 'companion' ? head1 : head

  const [audioRes, timestampsRes] = await Promise.all([
    fetch(audioPath),
    fetch(timestampsPath),
  ])

  if (!audioRes.ok) {
    throw new Error(`Could not load audio: ${audioPath}`)
  }

  if (!timestampsRes.ok) {
    throw new Error(`Could not load timestamps: ${timestampsPath}`)
  }

  const [audioArrayBuffer, timestamps] = await Promise.all([
    audioRes.arrayBuffer(),
    timestampsRes.json(),
  ])

  const audioBuffer =
    await activeHead.audioCtx.decodeAudioData(audioArrayBuffer)

  const safeTimestamps = isMonotonic(timestamps) ? timestamps : []

  if (!isMonotonic(timestamps)) {
    console.warn(
      `Non-monotonic timestamps detected for ${audioPath}; falling back to plain caption / no gesture sync.`,
    )
  }

  const words = safeTimestamps.map((item) => normalizeWord(item.word))
  const wtimes = safeTimestamps.map((item) => item.start * 1000)
  const wdurations = safeTimestamps.map(
    (item) => (item.end - item.start) * 1000,
  )

  const runId = ++subtitleRunId
  const subtitleTimers = createSubtitleTimers({
    timestamps: safeTimestamps,
    runId,
    onSubtitle,
  })

  if (safeTimestamps.length === 0) {
    onSubtitle?.('')
  }

  const { markers, mtimes } = buildGestureMarkers({
    audioPath,
    timestamps: safeTimestamps,
    wtimes,
    activeHead,
    character,
    gesturesEnabled: gestures,
  })

  activeHead.stopGesture()

  activeHead.speakAudio(
    {
      audio: audioBuffer,
      words,
      wtimes,
      wdurations,
      markers,
      mtimes,
    },
    { isRaw: true },
    null,
  )

  return new Promise((resolve) => {
    setTimeout(() => {
      subtitleTimers.forEach(clearTimeout)

      if (runId === subtitleRunId) {
        onSubtitle?.('')
      }

      resolve()
    }, audioBuffer.duration * 1000)
  })
}

// ============================================================
// Lighting / focus
// ============================================================

export async function focusCharacter(character) {
  if (character === 1) {
    head.setLighting({
      lightDirectIntensity: 45, // Dim directional light,
      lightSpotIntensity: 45,
    })
    head1.setLighting({
      lightDirectIntensity: 0, // Dim directional light
    })
    document.querySelector('#virtualcompanion > canvas').classList.add('dim')

    document.querySelector('#virtualdoctor > canvas').classList.remove('dim')
  } else if (character === 2) {
    head.setLighting({
      lightDirectIntensity: 0, // Dim directional light
    })
    head1.setLighting({
      lightDirectIntensity: 45, // Dim directional light
      lightSpotIntensity: 45,
    })
    document.querySelector('#virtualcompanion > canvas').classList.remove('dim')
    document.querySelector('#virtualdoctor > canvas').classList.add('dim')
  }
}
