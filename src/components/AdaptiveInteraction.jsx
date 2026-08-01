import { useEffect, useMemo, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowRight,
  faBan,
  faCheck,
  faClipboardList,
  faCode,
  faCommentDots,
  faCommentNodes,
  faCubesStacked,
  faFileLines,
  faMagnifyingGlass,
  faPaperPlane,
  faPuzzlePiece,
  faSpinner,
  faVolume,
  faExpand,
  faXmark,
  faCircleQuestion,
  faBookmark as faBookmarkSolid,
} from '@fortawesome/free-solid-svg-icons'
import {
  faBookmark as faBookmarkRegular,
  faLightbulb,
} from '@fortawesome/free-regular-svg-icons'
import logo from '../assets/logo-transparent.png'
import alex from '../assets/alex.png'
import jordan from '../assets/jordan.png'
import stageBackground from '../assets/bg.jpg'
import {
  initCompanionCharacter,
  initDoctorCharacter,
  playGesture,
  prepareSpeech,
  playPreparedSpeech,
  disposeCharacters,
  speakWithLipsyncStatic,
} from '../character.js'
import '../css/AdaptiveInteraction.css'
import SwipingCards from './SwipingCards'
import { useNavigate, useSearchParams } from 'react-router'
import {
  incrementConversationTurns,
  incrementInteractionCount,
  logFinishButtonAppeared,
  logMainInteraction,
  logSession,
  logIntroFinished,
  logIntroPart,
} from '../api/logging.js'

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

const ADAPTIVE_ALEX_INTROS = [
  {
    key: 'ALEX_INTRO_ADAPTIVE_1',
    text: "Hi there, I'm Alex, and this is Jordan! We are AI powered virtual characters here to help you explore and understand clinical trial participation.",
  },
  {
    key: 'ALEX_INTRO_ADAPTIVE_2',
    text: "I'll explain my role first. I'm a virtual assistant that can quickly search information across several reputable health resources such as the National Cancer Institute to answer questions about clinical trial participation.",
  },
  {
    key: 'ALEX_INTRO_ADAPTIVE_3',
    text: 'These sources cover information such as the purpose and importance of clinical trials, and topics such as safety and costs. As I answer your questions, I will also share the sources I use on this white board behind me that you can save to read later if you want.',
  },
  {
    key: 'ALEX_INTRO_ADAPTIVE_4',
    text: "One important thing to note is that I don't have information on specific clinical trials, so I can't help you find a trial to join or answer questions about a particular study.",
  },
  {
    key: 'ALEX_INTRO_ADAPTIVE_5',
    text: "Now, I'll hand it over to Jordan.",
  },
]

const ADAPTIVE_JORDAN_INTROS = [
  {
    key: 'JORDAN_INTRO_ADAPTIVE_1',
    text: "Thanks! As Alex mentioned, I'm Jordan. I'm a virtual companion here to help keep track of your understanding throughout the conversation.",
  },
  {
    key: 'JORDAN_INTRO_ADAPTIVE_2',
    text: "When Alex shares new information, I'll connect it to what we've already discussed on the white board behind me.",
  },
  {
    key: 'JORDAN_INTRO_ADAPTIVE_3',
    text: "If Alex doesn't have enough information to answer a question, I'll note that down for you as well.",
  },
  {
    key: 'JORDAN_INTRO_ADAPTIVE_4',
    text: "Now, whenever you're ready, let's start exploring clinical trial participation with Alex!",
  },
]

const ADAPTIVE_INTRO_VISUAL_TIMELINE = {
  alex: {
    ALEX_INTRO_ADAPTIVE_1: [
      {
        delay: 2200,
        duration: 2000,
        cue: { type: 'ai' },
      },
      {
        delay: 4700,
        duration: 2200,
        cue: { type: 'explore' },
      },
    ],

    ALEX_INTRO_ADAPTIVE_2: [
      {
        delay: 2500,
        duration: 4800,
        cue: { type: 'search-documents' },
      },
      {
        delay: 8000,
        duration: 3000,
        cue: { type: 'verified-document' },
      },
    ],

    ALEX_INTRO_ADAPTIVE_3: [
      {
        delay: 600,
        duration: 5000,
        cue: { type: 'topic-checklist' },
      },
      {
        delay: 6500,
        duration: 4000,
        cue: { type: 'save-sources' },
      },
    ],

    ALEX_INTRO_ADAPTIVE_4: [
      {
        delay: 1700,
        duration: 5200,
        cue: { type: 'no-specific-trials' },
      },
    ],

    ALEX_INTRO_ADAPTIVE_5: [],
  },

  jordan: {
    JORDAN_INTRO_ADAPTIVE_1: [
      {
        delay: 1500,
        duration: 4500,
        cue: { type: 'jordan-understanding' },
      },
    ],

    JORDAN_INTRO_ADAPTIVE_2: [
      {
        delay: 1000,
        duration: 5200,
        cue: { type: 'jordan-connect-information' },
      },
    ],

    JORDAN_INTRO_ADAPTIVE_3: [
      {
        delay: 1200,
        duration: 4200,
        cue: { type: 'jordan-open-questions' },
      },
    ],

    JORDAN_INTRO_ADAPTIVE_4: [],
  },
}

// const DEFAULT_BASE_URL = 'http://127.0.0.1:8000'
const BASE_URL =
  'https://brcco3c42yqwcnqmvj4h2k2igu0fysxd.lambda-url.us-east-1.on.aws'

function waitForCharacterRender(container, timeout = 10000) {
  return new Promise((resolve, reject) => {
    if (!container) {
      reject(new Error('Character container was not found.'))
      return
    }

    const startedAt = performance.now()

    function check() {
      const canvas = container.querySelector('canvas')

      if (canvas && canvas.width > 0 && canvas.height > 0) {
        requestAnimationFrame(() => requestAnimationFrame(resolve))
        return
      }

      if (performance.now() - startedAt >= timeout) {
        reject(new Error('Timed out waiting for character canvas.'))
        return
      }

      requestAnimationFrame(check)
    }

    check()
  })
}

function normalizeSource(source, index) {
  return {
    id: source.id ?? source.url ?? source.title ?? `source-${index}`,

    title: source.title || source.file || 'Health resource',

    source: source.source || source.organization || '',

    url: source.url || '',

    relevance: source.relevance || '',

    pageNumber: source.page_number ?? source.pageNumber ?? null,

    file: source.file || '',

    chunkId: source.chunk_id ?? source.chunkId ?? null,
  }
}

const getSourceKey = (source) =>
  source.url || source.title || source.file || source.source || source.id

export default function AdaptiveInteraction() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE_URL
  const [searchParams] = useSearchParams()

  const condition = Number(searchParams.get('c') ?? 5)
  const participantId =
    searchParams.get('id') ||
    searchParams.get('PROLIFIC_PID') ||
    'test-participant'

  // Keep each participant/condition in an isolated browser-tab session.
  const ADAPTIVE_SESSION_KEY = `adaptiveInteractionSession-${participantId}-condition-${condition}`

  function getSavedAdaptiveSession() {
    try {
      const saved = sessionStorage.getItem(ADAPTIVE_SESSION_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  }

  const savedAdaptiveSession = getSavedAdaptiveSession()

  const doctorRef = useRef(null)
  const companionRef = useRef(null)
  const textareaRef = useRef(null)
  const speakingQueueRef = useRef(Promise.resolve())
  const queuedSpeechCountRef = useRef(0)
  const historyBodyRef = useRef(null)
  const sessionLoggedRef = useRef(false)
  const finishButtonLoggedRef = useRef(false)
  const introStartedRef = useRef(false)
  const introCueTimersRef = useRef([])

  const [isProcessing, setIsProcessing] = useState(false)
  const [isJordanUpdating, setIsJordanUpdating] = useState(false)
  const [isConsulting, setIsConsulting] = useState(false)
  const [consultingSpeaker, setConsultingSpeaker] = useState('alex')
  const [consultingDecision, setConsultingDecision] = useState(null)
  const [showCards, setShowCards] = useState(false)
  const [charactersReady, setCharactersReady] = useState(false)
  const [input, setInput] = useState(savedAdaptiveSession?.input ?? '')
  const [messages, setMessages] = useState(savedAdaptiveSession?.messages ?? [])
  const [history, setHistory] = useState(savedAdaptiveSession?.history ?? [])
  const [transcript, setTranscript] = useState(
    savedAdaptiveSession?.transcript ?? [],
  )
  const [introTranscript, setIntroTranscript] = useState(
    savedAdaptiveSession?.introTranscript ?? [],
  )
  const [showAlexSources, setShowAlexSources] = useState(false)
  const [sources, setSources] = useState(savedAdaptiveSession?.sources ?? [])
  const [savedResources, setSavedResources] = useState(
    savedAdaptiveSession?.savedResources ?? [],
  )
  const [talkingPoints, setTalkingPoints] = useState(
    savedAdaptiveSession?.talkingPoints ?? [],
  )
  const [showTalkingPoints, setShowTalkingPoints] = useState(false)
  const [alexTurnComplete, setAlexTurnComplete] = useState(false)
  const [jordanTurnStarted, setJordanTurnStarted] = useState(false)
  const [isAlexSpeaking, setIsAlexSpeaking] = useState(false)
  const [isJordanSpeaking, setIsJordanSpeaking] = useState(false)
  const [alexSubtitle, setAlexSubtitle] = useState('')
  const [jordanSubtitle, setJordanSubtitle] = useState('')
  const [adaptiveIntroDone, setAdaptiveIntroDone] = useState(
    savedAdaptiveSession?.adaptiveIntroDone ?? false,
  )
  const [isIntroPlaying, setIsIntroPlaying] = useState(false)
  const [introCue, setIntroCue] = useState(null)
  const [error, setError] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [jordanWhiteboardPhase, setJordanWhiteboardPhase] = useState('writing')
  const [workspacePhase, setWorkspacePhase] = useState(
    savedAdaptiveSession?.workspacePhase ?? 'consulting',
  ) // consulting, opening, open, connecting, complete
  const [mentalModel, setMentalModel] = useState(
    savedAdaptiveSession?.mentalModel ?? null,
  )
  const [mentalModelHighlight, setMentalModelHighlight] = useState(
    savedAdaptiveSession?.mentalModelHighlight ?? null,
  )
  const [mentalModelChangeType, setMentalModelChangeType] = useState(
    savedAdaptiveSession?.mentalModelChangeType ?? null,
  )
  const [openQuestions, setOpenQuestions] = useState(
    savedAdaptiveSession?.openQuestions ?? [],
  )
  const [showMentalModel, setShowMentalModel] = useState(false)
  const [showWorkspace, setShowWorkspace] = useState(
    savedAdaptiveSession?.showWorkspace ?? false,
  )
  const [audioReady, setAudioReady] = useState(
    savedAdaptiveSession?.audioReady ?? false,
  )
  const [startChecks, setStartChecks] = useState({
    volume: false,
    browser: false,
  })
  const [characterActivity, setCharacterActivity] = useState({
    alex: 'Ready',
    jordan: 'Ready',
  })

  const canStart = startChecks.volume && startChecks.browser

  useEffect(() => {
    if (sessionLoggedRef.current || !participantId) return

    sessionLoggedRef.current = true
    logSession(participantId, condition).catch((loggingError) => {
      console.error('Failed to log adaptive session:', loggingError)
      sessionLoggedRef.current = false
    })
  }, [participantId, condition])

  useEffect(() => {
    try {
      const session = {
        audioReady,
        input,
        messages,
        history,
        transcript,
        sources,
        savedResources,
        talkingPoints,
        mentalModel,
        mentalModelHighlight,
        mentalModelChangeType,
        workspacePhase,
        openQuestions,
        adaptiveIntroDone,
        showWorkspace,
        introTranscript,
      }

      sessionStorage.setItem(ADAPTIVE_SESSION_KEY, JSON.stringify(session))
    } catch (storageError) {
      console.warn('Could not save adaptive interaction session:', storageError)
    }
  }, [
    ADAPTIVE_SESSION_KEY,
    audioReady,
    input,
    messages,
    history,
    transcript,
    sources,
    savedResources,
    talkingPoints,
    mentalModel,
    mentalModelHighlight,
    mentalModelChangeType,
    workspacePhase,
    openQuestions,
    adaptiveIntroDone,
    showWorkspace,
    introTranscript,
  ])

  const completedInteractionTurns = messages.filter(
    (message) => message.from === 'jordan' && message.kind === 'interpretation',
  ).length

  const showFinishButton = completedInteractionTurns >= 1

  useEffect(() => {
    if (!showFinishButton || finishButtonLoggedRef.current || !participantId) {
      return
    }

    finishButtonLoggedRef.current = true
    logFinishButtonAppeared(participantId).catch((loggingError) => {
      console.error('Failed to log finish button appearance:', loggingError)
      finishButtonLoggedRef.current = false
    })
  }, [showFinishButton, participantId])

  const workspaceMounted = true

  const workspaceOpen = ['open', 'connecting', 'complete'].includes(
    workspacePhase,
  )

  const normalizedSources = useMemo(
    () => sources.map(normalizeSource).slice(0, 3),
    [sources],
  )

  const introVisualClass = (extraClass = '') =>
    [
      'adaptive-intro-visual-card',
      extraClass,
      introCue?.isExiting && 'adaptive-intro-visual-exiting',
    ]
      .filter(Boolean)
      .join(' ')

  // For chat history modal, auto scroll to most recent message
  useEffect(() => {
    if (!isConsulting) {
      setConsultingSpeaker('alex')
      setConsultingDecision(null)
      return
    }

    if (consultingDecision) {
      return
    }

    let cancelled = false

    const cycle = (speaker) => {
      if (cancelled) return

      // Show the bubble
      setConsultingSpeaker(speaker)

      // Keep it visible
      window.setTimeout(() => {
        if (cancelled) return

        // Hide both bubbles
        setConsultingSpeaker(null)

        // Pause before the other character responds
        window.setTimeout(() => {
          if (cancelled) return

          cycle(speaker === 'alex' ? 'jordan' : 'alex')
        }, 500) // <-- pause
      }, 1300) // <-- visible duration
    }

    cycle('alex')

    return () => {
      cancelled = true
    }
  }, [isConsulting, consultingDecision])

  useEffect(() => {
    // While the start overlay is visible, the character containers are not
    // mounted, so their refs are null. Initialize only after Begin is clicked.
    if (!audioReady) return

    let cancelled = false

    async function initializeCharacters() {
      const doctorContainer = doctorRef.current
      const companionContainer = companionRef.current

      // Wait one paint cycle after removing the overlay so React has mounted
      // both character containers before TalkingHead reads their dimensions.
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      )

      if (
        cancelled ||
        !doctorContainer ||
        !companionContainer ||
        !doctorContainer.isConnected ||
        !companionContainer.isConnected
      ) {
        return
      }

      try {
        setCharactersReady(false)

        await Promise.all([
          initDoctorCharacter(doctorContainer),
          initCompanionCharacter(companionContainer),
        ])

        if (cancelled) {
          await disposeCharacters()
          return
        }

        await Promise.all([
          waitForCharacterRender(doctorContainer),
          waitForCharacterRender(companionContainer),
        ])

        if (cancelled) {
          await disposeCharacters()
          return
        }

        if (!adaptiveIntroDone) {
          /*
           * Keep the loader visible while they turn toward each other.
           */
          playGesture('alexLookAtJordan')
          playGesture('jordanLookAtAlex')

          /*
           * Give the gestures enough time to reach the looking pose
           * before revealing the interaction.
           */
          await wait(500)

          if (cancelled) return

          /*
           * The loader disappears here, so the first visible frame
           * already shows Alex and Jordan looking at each other.
           */
          setCharactersReady(true)

          // Keep the visible looking-at-each-other moment.
          await wait(1500)

          // Turn both characters toward the user.
          playGesture('stopAlexGesture')
          playGesture('stopCompanionGesture')

          // Let the forward-facing pose settle before Alex speaks.
          await wait(300)

          await playAdaptiveIntroSequence()
        } else {
          /*
           * On a return visit where the intro already played,
           * reveal the characters normally.
           */
          setCharactersReady(true)
        }
      } catch (characterError) {
        console.error('Character initialization failed:', characterError)

        if (!cancelled) {
          setCharactersReady(false)
          setError(
            'The virtual characters could not be loaded. Please refresh and try again.',
          )
        }
      }
    }

    initializeCharacters()

    return () => {
      cancelled = true

      disposeCharacters().finally(() => {
        doctorRef.current?.replaceChildren()
        companionRef.current?.replaceChildren()
      })
    }
  }, [audioReady])

  /* ------------------------------------------------------------------------ */
  /* Navigation                                               */
  /* ------------------------------------------------------------------------ */

  const navigate = useNavigate()

  function handleContinue() {
    navigate('/interaction-notes-review', {
      state: {
        participantId,
        condition,
        mentalModel,
        savedResources,
        openQuestions,
      },
    })

    sessionStorage.removeItem(ADAPTIVE_SESSION_KEY)
  }

  function handleToggleSavedResource(source) {
    const sourceKey = getSourceKey(source)

    const alreadySaved = savedResources.some(
      (savedSource) => getSourceKey(savedSource) === sourceKey,
    )

    const sourceMetadata = {
      source_key: sourceKey,
      source_title: source.title || source.file || null,
      source_organization: source.source || null,
      source_url: source.url || null,
      source_file: source.file || null,
      source_page_number: source.pageNumber ?? source.page_number ?? null,
      source_chunk_id: source.chunkId ?? source.chunk_id ?? null,
    }

    if (alreadySaved) {
      setSavedResources((previous) =>
        previous.filter(
          (savedSource) => getSourceKey(savedSource) !== sourceKey,
        ),
      )

      updateTranscript('resource_unsaved', 'Resource unsaved', sourceMetadata)

      incrementInteractionCount(participantId, 'source_save_count', -1).catch(
        (loggingError) => {
          console.error('Source save count decrement failed:', loggingError)
        },
      )

      return
    }

    setSavedResources((previous) => [
      ...previous,
      {
        ...source,
        savedAt: new Date().toISOString(),
      },
    ])

    updateTranscript('resource_saved', 'Resource saved', sourceMetadata)

    incrementInteractionCount(participantId, 'source_save_count', 1).catch(
      (loggingError) => {
        console.error('Source save count increment failed:', loggingError)
      },
    )
  }

  function setActivity(character, label) {
    setCharacterActivity((previous) => ({
      ...previous,
      [character]: label,
    }))
  }

  function turnCharactersTowardEachOther() {
    playGesture('alexLookAtJordan')
    playGesture('jordanLookAtAlex')
  }

  function stopCharactersLookingAtEachOther() {
    playGesture('stopAlexGesture')
    playGesture('stopCompanionGesture')
  }

  function enqueueSpeech(text, speaker, onStart = null, onEnd = null) {
    if (!text) return Promise.resolve()

    const isAlex = speaker === 'alex'
    const character = isAlex ? 'doctor' : 'companion'
    const setSubtitle = isAlex ? setAlexSubtitle : setJordanSubtitle

    /*
     * Starts fetching and decoding immediately—even while another
     * character is still speaking.
     */
    const preparedSpeechPromise = prepareSpeech(text, character)

    queuedSpeechCountRef.current += 1

    speakingQueueRef.current = speakingQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        try {
          // Often already finished by the time this speech reaches the queue.
          const prepared = await preparedSpeechPromise

          await playPreparedSpeech({
            prepared,
            onSubtitle: setSubtitle,
            onStart: () => {
              if (isAlex) {
                setIsAlexSpeaking(true)
              } else {
                setIsJordanSpeaking(true)
              }

              onStart?.()
            },
          })
        } catch (speechError) {
          console.error(`${speaker} speech failed:`, speechError)
        } finally {
          if (isAlex) {
            setIsAlexSpeaking(false)
            setAlexSubtitle('')
          } else {
            setIsJordanSpeaking(false)
            setJordanSubtitle('')
          }

          onEnd?.()

          queuedSpeechCountRef.current -= 1

          if (queuedSpeechCountRef.current === 0) {
            playGesture('stopAlexGesture')
            playGesture('stopCompanionGesture')
          }
        }
      })

    return speakingQueueRef.current
  }

  function updateIntroTranscript(role, content, meta = {}) {
    const newEntry = {
      role,
      content,
      timestamp: new Date().toISOString(),
      condition,
      ...meta,
    }

    setIntroTranscript((previous) => {
      const updated = [...previous, newEntry]

      logIntroPart(participantId, updated).catch((error) => {
        console.error('Failed to log intro transcript:', error)
      })

      return updated
    })
  }

  function updateTranscript(role, content, meta = {}) {
    if (!content) return

    const newEntry = {
      role,
      content,
      timestamp: new Date().toISOString(),
      condition,
      ...meta,
    }

    setTranscript((previous) => {
      const updated = [...previous, newEntry]
      logMainInteraction(participantId, updated).catch((loggingError) => {
        console.error('Failed to log adaptive transcript:', loggingError)
      })
      return updated
    })
  }

  function addMessage(from, text, kind = 'response', meta = {}) {
    if (!text) return

    updateTranscript(from, text, {
      kind,
      ...meta,
    })

    setMessages((previous) => [
      ...previous,
      {
        id: participantId,
        from,
        text,
        kind,
        ...meta,
      },
    ])
  }

  function clearAdaptiveIntroCues() {
    introCueTimersRef.current.forEach((timer) => {
      window.clearTimeout(timer)
    })

    introCueTimersRef.current = []
    setIntroCue(null)
  }

  function scheduleAdaptiveIntroVisuals(character, introKey) {
    clearAdaptiveIntroCues()

    const visualCues =
      ADAPTIVE_INTRO_VISUAL_TIMELINE[character]?.[introKey] || []

    visualCues.forEach(({ delay, duration, cue }) => {
      const showTimer = window.setTimeout(() => {
        setIntroCue({
          ...cue,
          character,
          isExiting: false,
        })

        if (!duration) return

        const fadeTimer = window.setTimeout(() => {
          setIntroCue((currentCue) =>
            currentCue
              ? {
                  ...currentCue,
                  isExiting: true,
                }
              : null,
          )
        }, duration)

        const removeTimer = window.setTimeout(() => {
          setIntroCue((currentCue) => {
            if (
              currentCue?.character === character &&
              currentCue?.type === cue.type
            ) {
              return null
            }

            return currentCue
          })
        }, duration + 450)

        introCueTimersRef.current.push(fadeTimer, removeTimer)
      }, delay)

      introCueTimersRef.current.push(showTimer)
    })
  }

  async function playAdaptiveIntroSequence() {
    if (introStartedRef.current || adaptiveIntroDone) return

    introStartedRef.current = true
    setIsIntroPlaying(true)

    try {
      setCharacterActivity({
        alex: 'Introducing',
        jordan: 'Introducing',
      })
      // Play all Alex introductions first
      for (const [index, intro] of ADAPTIVE_ALEX_INTROS.entries()) {
        setMessages((previous) => [
          ...previous,
          {
            id: `intro-alex-${index}-${Date.now()}`,
            from: 'alex',
            text: intro.text,
            kind: 'intro',
            isIntro: true,
            introKey: intro.key,
            introCharacter: 'alex',
          },
        ])

        updateIntroTranscript('alex', intro.text, {
          intro_part: index + 1,
          intro_key: intro.key,
          intro_character: 'alex',
        })

        let workspaceRevealTimer = null

        if (intro.key === 'ALEX_INTRO_ADAPTIVE_3' && !showWorkspace) {
          workspaceRevealTimer = window.setTimeout(() => {
            setShowWorkspace(true)
          }, 9500)
        }

        // Start visuals and focus for this specific intro
        scheduleAdaptiveIntroVisuals('alex', intro.key)
        setIsAlexSpeaking(true)

        await speakWithLipsyncStatic(
          `/intro-voices/doctor-audio-${intro.key}.mp3`,
          `/intro-voices/doctor-timestamps-${intro.key}.json`,
          'doctor',
          true,
          setAlexSubtitle,
        )

        setIsAlexSpeaking(false)
        clearAdaptiveIntroCues()

        if (workspaceRevealTimer) {
          window.clearTimeout(workspaceRevealTimer)
          setShowWorkspace(true)
        }

        setAlexSubtitle('')
      }

      // Then play all Jordan introductions
      for (const [index, intro] of ADAPTIVE_JORDAN_INTROS.entries()) {
        setMessages((previous) => [
          ...previous,
          {
            id: `intro-jordan-${index}-${Date.now()}`,
            from: 'jordan',
            text: intro.text,
            kind: 'intro',
            isIntro: true,
            introKey: intro.key,
            introCharacter: 'jordan',
          },
        ])

        updateIntroTranscript('jordan', intro.text, {
          intro_part: index + 1,
          intro_key: intro.key,
          intro_character: 'jordan',
        })

        // Start visuals and focus for this specific intro
        scheduleAdaptiveIntroVisuals('jordan', intro.key)
        setIsJordanSpeaking(true)

        await speakWithLipsyncStatic(
          `/intro-voices/companion-audio-${intro.key}.mp3`,
          `/intro-voices/companion-timestamps-${intro.key}.json`,
          'companion',
          true,
          setJordanSubtitle,
        )

        setIsJordanSpeaking(false)
        clearAdaptiveIntroCues()
        setJordanSubtitle('')
      }

      setAdaptiveIntroDone(true)
      logIntroFinished(participantId).catch((error) => {
        console.error('Failed to log intro completion:', error)
      })
    } catch (introError) {
      console.error('Adaptive intro sequence failed:', introError)

      setError(
        'The introduction could not be played. Please refresh and try again.',
      )

      introStartedRef.current = false
    } finally {
      setCharacterActivity({
        alex: 'Ready',
        jordan: 'Ready',
      })
      setIsAlexSpeaking(false)
      setIsJordanSpeaking(false)
      setAlexSubtitle('')
      setJordanSubtitle('')
      setIsIntroPlaying(false)
      clearAdaptiveIntroCues()
    }
  }
  async function handleStreamPart(part, turnState) {
    switch (part.part) {
      case 'route': {
        turnState.route = part.route

        const isFactFinding = part.route === 'fact_finding'
        const isHypothesisTesting = part.route === 'hypothesis_testing'

        if (!isFactFinding && !isHypothesisTesting) {
          setIsConsulting(false)
          break
        }

        setConsultingDecision(part.route)
        setConsultingSpeaker(isFactFinding ? 'alex' : 'jordan')

        await wait(900)
        setIsConsulting(false)

        if (isFactFinding) {
          playGesture('stopAlexGesture')
          setIsAlexSpeaking(true)
          setShowCards(true)
          playGesture('startSwiping')
        }

        break
      }

      case 'information_need':
        console.log('Information need', part.information_need || '')
        break

      case 'jordan_before':
        turnState.jordanBefore = part.message

        setActivity('jordan', 'Framing your question')
        setActivity('alex', 'Searching for information')

        addMessage('jordan', part.message, 'question_framing')

        enqueueSpeech(
          part.message,
          'jordan',
          () => {
            setJordanWhiteboardPhase(mentalModel ? 'open' : 'writing')
            playGesture('alexLookAtJordan')
          },
          () => {
            setJordanSubtitle('')
            setJordanWhiteboardPhase(mentalModel ? 'open' : 'writing')
            playGesture('jordanLookAtAlex')
            setIsAlexSpeaking(true)
            setActivity('jordan', 'Waiting for new information')
          },
        )

        break

      case 'search_query':
        setShowCards(true)
        playGesture('startSwiping')
        setActivity('alex', 'Searching trusted sources')
        setActivity('jordan', 'Waiting for new information')
        break

      case 'alex': {
        console.log('FULL ALEX STREAM PART:', part)
        console.log('ALEX SOURCES:', part.sources)

        turnState.alexAnswer = part.message

        const nextSources = part.sources || []
        const nextTalkingPoints = part.talking_points || []

        setSources(nextSources)
        setTalkingPoints(nextTalkingPoints)
        setShowAlexSources(false)
        addMessage('alex', part.message, 'response', {
          sources: nextSources,
          talking_points: nextTalkingPoints,
          answer_scope: part.answer_scope || null,
          has_supported_information: part.has_supported_information ?? null,
        })

        let jordanThinkingTimer = null

        enqueueSpeech(
          part.message,
          'alex',
          () => {
            stopCharactersLookingAtEachOther()
            setWorkspacePhase('opening')
            setShowTalkingPoints(true)

            window.setTimeout(() => {
              setWorkspacePhase('open')
            }, 1050)

            setJordanWhiteboardPhase(mentalModel ? 'open' : 'writing')
            setShowCards(false)
            playGesture('stopSwiping')
            setAlexTurnComplete(true)

            playGesture('stopAlexGesture')
            playGesture('stopCompanionGesture')
            playGesture('jordanLookAtAlex')
            setActivity('alex', 'Presenting information')
            setActivity('jordan', 'Listening to Alex')

            jordanThinkingTimer = window.setTimeout(() => {
              playGesture('thinking')
            }, 2500)
          },
          () => {
            window.clearTimeout(jordanThinkingTimer)
            setShowAlexSources(true)
            playGesture('stopWriting')
            playGesture('stopCompanionGesture')
          },
        )
        break
      }

      case 'jordan_after': {
        setWorkspacePhase('connecting')
        stopCharactersLookingAtEachOther()

        turnState.jordanAfter = part.message

        const nextMentalModel = part.mental_model || null
        const nextMentalModelHighlight = part.highlighted_text || null
        const nextMentalModelChangeType = part.change_type || null
        const nextOpenQuestions = part.knowledge_gaps || []

        setOpenQuestions(nextOpenQuestions)

        addMessage('jordan', part.message, 'interpretation', {
          mental_model: nextMentalModel,
          highlighted_text: nextMentalModelHighlight,
          change_type: nextMentalModelChangeType,
          knowledge_gaps: nextOpenQuestions,
        })

        enqueueSpeech(
          part.message,
          'jordan',
          () => {
            setMentalModel(nextMentalModel)
            setMentalModelHighlight(nextMentalModelHighlight)
            setMentalModelChangeType(nextMentalModelChangeType)
            setJordanTurnStarted(true)
            setShowMentalModel(true)
            setIsJordanUpdating(false)
            setWorkspacePhase('connecting')
            setJordanWhiteboardPhase('speaking')
            playGesture('alexLookAtJordan')
            setActivity('alex', 'Listening to Jordan')
            setActivity('jordan', 'Connecting this information')
          },
          () => {
            setJordanSubtitle('')
            setWorkspacePhase('complete')
            setJordanWhiteboardPhase('open')

            setActivity('alex', 'Ready')
            setActivity('jordan', 'Ready')
          },
        )

        break
      }

      case 'error':
        setIsJordanUpdating(false)
        setActivity('alex', 'Information Guide')
        setActivity('jordan', 'Understanding Guide')
        throw new Error(part.message || 'The adaptive chat request failed.')

      case 'done':
        console.log('Done!')
        break

      default:
        break
    }
  }

  async function handleSend(event) {
    event?.preventDefault()

    const message = input.trim()
    if (
      !message ||
      isProcessing ||
      isAlexSpeaking ||
      isJordanSpeaking ||
      isIntroPlaying ||
      !charactersReady
    ) {
      return
    }

    setInput('')
    setError('')
    setIsJordanUpdating(true)
    setShowMentalModel(false)
    setMentalModelHighlight(null)
    setMentalModelChangeType(null)
    setShowAlexSources(false)
    setAlexTurnComplete(false)
    setJordanTurnStarted(false)

    setActivity('alex', 'Planning search')
    setActivity('jordan', 'Identifying information need')

    setSources([])
    setTalkingPoints([])
    setShowTalkingPoints(false)

    setJordanWhiteboardPhase(mentalModel ? 'open' : 'writing')

    // Pull the workspace down while Alex and Jordan consult.
    setWorkspacePhase('consulting')

    setIsProcessing(true)

    addMessage('user', message)

    incrementConversationTurns(participantId).catch((loggingError) => {
      console.error('Conversation turn count update failed:', loggingError)
    })

    setConsultingDecision(null)
    setConsultingSpeaker('alex')

    // Characters turn to each other to "decide" who leads
    turnCharactersTowardEachOther()
    await new Promise((resolve) => setTimeout(resolve, 500))
    setIsConsulting(true)

    const turnState = {
      route: null,
      jordanBefore: null,
      alexAnswer: null,
      jordanAfter: null,
    }

    try {
      const response = await fetch(`${baseUrl}/adaptive/chat-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history,
          mental_model: mentalModel,
          knowledge_gaps: openQuestions,
        }),
      })

      if (!response.ok) {
        throw new Error(
          (await response.text()) || `Request failed (${response.status}).`,
        )
      }

      if (!response.body) {
        throw new Error(
          'The browser did not provide a readable response stream.',
        )
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) continue
          await handleStreamPart(JSON.parse(line), turnState)
        }
      }

      if (buffer.trim()) {
        await handleStreamPart(JSON.parse(buffer), turnState)
      }

      setHistory((previous) => {
        const next = [...previous, { role: 'user', content: message }]
        if (turnState.jordanBefore) {
          next.push({ role: 'jordan', content: turnState.jordanBefore })
        }
        if (turnState.alexAnswer) {
          next.push({ role: 'alex', content: turnState.alexAnswer })
        }
        if (turnState.jordanAfter) {
          next.push({ role: 'jordan', content: turnState.jordanAfter })
        }
        return next
      })
    } catch (requestError) {
      console.error('Adaptive chat failed:', requestError)
      setError(requestError.message)
    } finally {
      setIsProcessing(false)
      setIsConsulting(false)
      textareaRef.current?.focus()
    }
  }

  const inputDisabled =
    isProcessing ||
    isAlexSpeaking ||
    isJordanSpeaking ||
    isIntroPlaying ||
    !charactersReady

  if (!audioReady) {
    return (
      <div className="start-overlay">
        <div className="mi-start-overlay-content">
          <img src={logo} className="logo" alt="Study logo" />

          <h2>Clinical Trials Education</h2>
          <h1>Chat with Virtual Characters</h1>

          <div className="mi-start-information">
            In this activity, you'll learn about clinical trials with the help
            of <strong>two virtual characters: Alex and Jordan</strong>.
            <div className="character-images-row">
              <div>
                <img
                  src={alex}
                  className="character-preview"
                  alt="Alex character"
                />
                <p>Alex</p>
              </div>

              <div>
                <img
                  src={jordan}
                  className="character-preview"
                  alt="Jordan character"
                />
                <p>Jordan</p>
              </div>
            </div>
            They will provide <strong>general information</strong> and help you
            explore questions about clinical trial participation. <br /> <br />
            <strong>Remember</strong>: Imagine you are the person described in
            the pre-survey. Ask the questions you would genuinely have if you
            were in their situation.{' '}
            <strong>
              After your first question, a Finish button will appear.
            </strong>{' '}
            You may continue asking as many or as few questions as you'd like
            until you feel you've experienced how the website can help someone
            learn about clinical trial participation.
          </div>

          <div className="mi-start-instructions">
            Please complete this short checklist to make sure you have the best
            experience. Then, click begin.
          </div>

          <div className="mi-start-checks">
            <label className="mi-start-check">
              <div className="mi-start-check-label">
                <FontAwesomeIcon icon={faVolume} />
                <span>My volume is turned up.</span>
              </div>

              <input
                type="checkbox"
                checked={startChecks.volume}
                onChange={(event) =>
                  setStartChecks((previous) => ({
                    ...previous,
                    volume: event.target.checked,
                  }))
                }
              />
            </label>

            <label className="mi-start-check">
              <div className="mi-start-check-label">
                <FontAwesomeIcon icon={faExpand} />
                <span>My browser window is maximized.</span>
              </div>

              <input
                type="checkbox"
                checked={startChecks.browser}
                onChange={(event) =>
                  setStartChecks((previous) => ({
                    ...previous,
                    browser: event.target.checked,
                  }))
                }
              />
            </label>
          </div>

          <button
            type="button"
            className="cssbuttons-io-button"
            disabled={!canStart}
            onClick={() => setAudioReady(true)}
          >
            Begin
            <span className="icon">
              <FontAwesomeIcon icon={faArrowRight} size="xs" />
            </span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="adaptive-root">
      <button
        type="button"
        className="adaptive-history-btn"
        onClick={() => setShowHistory(true)}
      >
        <FontAwesomeIcon icon={faCommentDots} />
        Chat history
      </button>
      {showFinishButton && (
        <button className="mi-continue-btn" onClick={handleContinue}>
          Finish
        </button>
      )}
      <header className="adaptive-header">
        <img src={logo} alt="" className="adaptive-logo" />
        <div>
          <p>Explore Clinical Trials Information</p>
          <h1>With Virtual Characters</h1>
        </div>
      </header>

      <main className="adaptive-layout">
        <section className="adaptive-stage-card">
          <div
            className={[
              'adaptive-stage',
              workspaceOpen && 'workspace-open',
              workspacePhase === 'consulting' && 'workspace-consulting',
              workspacePhase === 'opening' && 'workspace-opening',
              isAlexSpeaking && 'alex-focused',
              isJordanSpeaking && 'jordan-focused',
              alexTurnComplete && 'alex-turn-complete',
              jordanTurnStarted && 'jordan-turn-started',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div
              className="adaptive-stage-background"
              style={{ backgroundImage: `url(${stageBackground})` }}
            />

            <div className="adaptive-character adaptive-character-alex">
              <div className="adaptive-character-label alex">
                <div className="label">Information Guide</div>
                <div className="name">Alex</div>
                <div className="activity">{characterActivity.alex}</div>
              </div>

              <div className="adaptive-alex-character-content">
                {showCards && (
                  <div className="adaptive-swiping-cards">
                    <SwipingCards />
                  </div>
                )}

                <div
                  ref={doctorRef}
                  id="virtualdoctor"
                  className="virtual-doctor"
                />

                {/* Alex intro visuals go here */}
                {introCue?.character === 'alex' && introCue.type === 'ai' && (
                  <div
                    className={introVisualClass('adaptive-intro-icon-group')}
                  >
                    <FontAwesomeIcon
                      className="adaptive-intro-icon adaptive-intro-icon-1"
                      icon={faCode}
                    />

                    <FontAwesomeIcon
                      className="adaptive-intro-icon adaptive-intro-icon-2"
                      icon={faCommentNodes}
                    />
                  </div>
                )}

                {introCue?.character === 'alex' &&
                  introCue.type === 'explore' && (
                    <div
                      className={introVisualClass('adaptive-intro-icon-group')}
                    >
                      <FontAwesomeIcon
                        className="adaptive-intro-icon adaptive-intro-icon-single"
                        icon={faLightbulb}
                      />
                    </div>
                  )}

                {introCue?.character === 'alex' &&
                  introCue.type === 'search-documents' && (
                    <div
                      className={introVisualClass(
                        'adaptive-intro-search-documents',
                      )}
                    >
                      <FontAwesomeIcon
                        className="adaptive-intro-search-main"
                        icon={faMagnifyingGlass}
                      />

                      <div className="adaptive-intro-document-row">
                        {[1, 2, 3].map((number) => (
                          <FontAwesomeIcon
                            key={number}
                            className={`adaptive-intro-document adaptive-intro-document-${number}`}
                            icon={faFileLines}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                {introCue?.character === 'alex' &&
                  introCue.type === 'verified-document' && (
                    <div
                      className={introVisualClass(
                        'adaptive-intro-verified-document',
                      )}
                    >
                      <div className="adaptive-intro-verified-file">
                        <FontAwesomeIcon icon={faFileLines} />

                        <span className="adaptive-intro-verified-badge">
                          <FontAwesomeIcon icon={faCheck} />
                        </span>
                      </div>
                    </div>
                  )}

                {introCue?.character === 'alex' &&
                  introCue.type === 'topic-checklist' && (
                    <div
                      className={introVisualClass(
                        'adaptive-intro-topic-checklist',
                      )}
                    >
                      {[1, 2, 3, 4].map((number) => (
                        <div
                          key={number}
                          className={`adaptive-intro-check-row adaptive-intro-check-row-${number}`}
                        >
                          <span className="adaptive-intro-check-box">
                            <FontAwesomeIcon icon={faCheck} />
                          </span>

                          <span className="adaptive-intro-check-line" />
                        </div>
                      ))}
                    </div>
                  )}

                {introCue?.character === 'alex' &&
                  introCue.type === 'save-sources' && (
                    <div
                      className={introVisualClass('adaptive-intro-icon-group')}
                    >
                      <FontAwesomeIcon
                        className="adaptive-intro-icon adaptive-intro-icon-1"
                        icon={faBookmarkSolid}
                      />

                      <FontAwesomeIcon
                        className="adaptive-intro-icon adaptive-intro-icon-2"
                        icon={faCheck}
                      />
                    </div>
                  )}

                {introCue?.character === 'alex' &&
                  introCue.type === 'no-specific-trials' && (
                    <div
                      className={introVisualClass(
                        'adaptive-intro-no-specific-trials',
                      )}
                    >
                      <div className="adaptive-intro-restricted-icons">
                        <FontAwesomeIcon
                          className="adaptive-intro-restricted-clipboard"
                          icon={faClipboardList}
                        />

                        <FontAwesomeIcon
                          className="adaptive-intro-restricted-search"
                          icon={faMagnifyingGlass}
                        />

                        <span className="adaptive-intro-restricted-ban">
                          <FontAwesomeIcon icon={faBan} />
                        </span>
                      </div>
                    </div>
                  )}
              </div>

              {alexSubtitle && (
                <div className="adaptive-subtitle adaptive-subtitle-alex">
                  {alexSubtitle}
                </div>
              )}
            </div>

            <div className="adaptive-shared-workspace">
              {workspaceMounted && showWorkspace && (
                <SharedWorkspaceBoard
                  mentalModel={mentalModel}
                  mentalModelHighlight={mentalModelHighlight}
                  mentalModelChangeType={mentalModelChangeType}
                  showMentalModel={showMentalModel}
                  phase={jordanWhiteboardPhase}
                  workspacePhase={workspacePhase}
                  sources={normalizedSources}
                  savedResources={savedResources}
                  onToggleSavedResource={handleToggleSavedResource}
                  talkingPoints={talkingPoints}
                  showTalkingPoints={showTalkingPoints}
                  showSources={showAlexSources}
                  isAlexSpeaking={isAlexSpeaking}
                  openQuestions={openQuestions}
                  isJordanUpdating={isJordanUpdating}
                />
              )}
            </div>

            {isConsulting && (
              <div
                className={`adaptive-consulting-exchange adaptive-consulting-exchange-${consultingSpeaker}`}
                aria-hidden="true"
              >
                <div
                  className={`adaptive-consulting-bubble adaptive-consulting-bubble-alex ${
                    consultingSpeaker === 'alex'
                      ? 'adaptive-consulting-bubble-active'
                      : ''
                  } ${
                    consultingDecision === 'fact_finding'
                      ? 'adaptive-consulting-bubble-decided'
                      : ''
                  }`}
                >
                  {consultingDecision === 'fact_finding' ? (
                    <div className="adaptive-consulting-decision">
                      <FontAwesomeIcon
                        icon={faFileLines}
                        className="adaptive-consulting-decision-main-icon"
                      />

                      <span className="adaptive-consulting-check">
                        <FontAwesomeIcon icon={faCheck} />
                      </span>
                    </div>
                  ) : (
                    <>
                      <span className="adaptive-consulting-dot" />
                      <span className="adaptive-consulting-dot" />
                      <span className="adaptive-consulting-dot" />
                    </>
                  )}

                  <span className="adaptive-consulting-bubble-tail" />
                </div>

                <div
                  className={`adaptive-consulting-bubble adaptive-consulting-bubble-jordan ${
                    consultingSpeaker === 'jordan'
                      ? 'adaptive-consulting-bubble-active'
                      : ''
                  } ${
                    consultingDecision === 'hypothesis_testing'
                      ? 'adaptive-consulting-bubble-decided'
                      : ''
                  }`}
                >
                  {consultingDecision === 'hypothesis_testing' ? (
                    <div className="adaptive-consulting-decision">
                      <FontAwesomeIcon
                        icon={faPuzzlePiece}
                        className="adaptive-consulting-decision-main-icon"
                      />

                      <span className="adaptive-consulting-check">
                        <FontAwesomeIcon icon={faCheck} />
                      </span>
                    </div>
                  ) : (
                    <>
                      <span className="adaptive-consulting-dot" />
                      <span className="adaptive-consulting-dot" />
                      <span className="adaptive-consulting-dot" />
                    </>
                  )}

                  <span className="adaptive-consulting-bubble-tail" />
                </div>
              </div>
            )}

            <div className="adaptive-character adaptive-character-jordan">
              <div className="adaptive-character-label jordan">
                <div className="label">Understanding Guide</div>
                <div className="name">Jordan</div>
                <div className="activity">{characterActivity.jordan}</div>
              </div>

              <div ref={companionRef} className="virtual-companion" />

              {/* Jordan intro visuals go here */}
              {introCue?.character === 'jordan' &&
                introCue.type === 'jordan-understanding' && (
                  <div
                    className={introVisualClass(
                      'adaptive-intro-jordan adaptive-intro-jordan-understanding',
                    )}
                  >
                    <FontAwesomeIcon icon={faCircleQuestion} />
                    <FontAwesomeIcon icon={faArrowRight} />
                    <FontAwesomeIcon icon={faLightbulb} />
                  </div>
                )}

              {introCue?.character === 'jordan' &&
                introCue.type === 'jordan-connect-information' && (
                  <div
                    className={introVisualClass(
                      'adaptive-intro-jordan adaptive-intro-jordan-connect',
                    )}
                  >
                    <FontAwesomeIcon icon={faCubesStacked} />
                    <FontAwesomeIcon icon={faArrowRight} />
                    <FontAwesomeIcon icon={faLightbulb} />
                  </div>
                )}

              {introCue?.character === 'jordan' &&
                introCue.type === 'jordan-open-questions' && (
                  <div
                    className={introVisualClass(
                      'adaptive-intro-jordan adaptive-intro-jordan-open-questions',
                    )}
                  >
                    <FontAwesomeIcon icon={faClipboardList} />
                    <FontAwesomeIcon icon={faCircleQuestion} />
                  </div>
                )}

              {jordanSubtitle && (
                <div className="adaptive-subtitle adaptive-subtitle-jordan">
                  {jordanSubtitle}
                </div>
              )}
            </div>

            {!charactersReady && (
              <div className="adaptive-character-loader">
                <FontAwesomeIcon icon={faSpinner} spin />
                <span>Preparing the virtual characters…</span>
              </div>
            )}
          </div>

          <div className="full-input-area">
            <form className="mi-input-row" onSubmit={handleSend}>
              <div className="mi-input-stack">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      handleSend(event)
                    }
                  }}
                  placeholder={
                    inputDisabled
                      ? 'Please wait for the character to finish speaking...'
                      : 'Type your message to Alex here...'
                  }
                  disabled={inputDisabled}
                  rows={3}
                />
              </div>

              <button
                type="submit"
                className="send-button"
                disabled={inputDisabled || !input.trim()}
              >
                <FontAwesomeIcon icon={faPaperPlane} />
                <span>Send</span>
              </button>
            </form>

            <p>Press enter to send, or Shift + Enter for newline</p>
          </div>

          {error && <div className="adaptive-error">{error}</div>}
        </section>
      </main>
      {showHistory && (
        <HistoryModal
          messages={messages}
          historyBodyRef={historyBodyRef}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  )
}

function HighlightedMentalModel({ mentalModel, highlightedText }) {
  if (!mentalModel) {
    return null
  }

  if (!highlightedText || !mentalModel.includes(highlightedText)) {
    return <>{mentalModel}</>
  }

  const highlightStart = mentalModel.indexOf(highlightedText)
  const highlightEnd = highlightStart + highlightedText.length

  const beforeHighlight = mentalModel.slice(0, highlightStart)
  const afterHighlight = mentalModel.slice(highlightEnd)

  return (
    <>
      {beforeHighlight}

      <mark className="adaptive-mental-model-highlight">{highlightedText}</mark>

      {afterHighlight}
    </>
  )
}

function SharedWorkspaceBoard({
  mentalModel,
  mentalModelHighlight,
  mentalModelChangeType,
  showMentalModel,
  phase,
  workspacePhase,
  sources,
  savedResources,
  onToggleSavedResource,
  talkingPoints,
  showTalkingPoints,
  showSources,
  isAlexSpeaking,
  openQuestions,
  isJordanUpdating,
}) {
  const hasMentalModel = Boolean(mentalModel)
  const isJordanSpeaking = phase === 'speaking'
  const hasAlexEvidence = showSources && sources.length > 0

  return (
    <aside
      className={[
        'adaptive-jordan-whiteboard',
        `adaptive-jordan-whiteboard-${phase}`,
        `adaptive-jordan-whiteboard-workspace-${workspacePhase}`,
      ].join(' ')}
      aria-live="polite"
      aria-label="Shared workspace"
    >
      <div className="adaptive-jordan-whiteboard-frame">
        <div className="adaptive-jordan-whiteboard-surface">
          <section
            className={`adaptive-workspace-column adaptive-workspace-alex ${
              isAlexSpeaking ? 'adaptive-workspace-column-active' : ''
            }`}
          >
            <div className="adaptive-workspace-column-heading">
              <span className="adaptive-workspace-character-dot adaptive-workspace-character-dot-alex" />
              <strong>Alex's Information</strong>
            </div>

            {showTalkingPoints && talkingPoints.length > 0 && (
              <div className="adaptive-talking-points-workspace">
                {talkingPoints.map((point, index) => (
                  <div
                    key={`${point}-${index}`}
                    className="adaptive-talking-point"
                    style={{
                      animationDelay: `${(index + 1) * 1.5}s`,
                    }}
                  >
                    {point}
                  </div>
                ))}
              </div>
            )}

            {hasAlexEvidence && showTalkingPoints && (
              <div className="adaptive-workspace-evidence">
                <EvidenceSourceCards
                  sources={sources}
                  savedResources={savedResources}
                  onToggleSavedResource={onToggleSavedResource}
                />
              </div>
            )}
          </section>

          <div className="adaptive-workspace-divider" aria-hidden="true" />

          <section
            className={`adaptive-workspace-column adaptive-workspace-jordan ${
              isJordanSpeaking ? 'adaptive-workspace-column-active' : ''
            }`}
          >
            <div className="adaptive-workspace-column-heading">
              <span className="adaptive-workspace-character-dot adaptive-workspace-character-dot-jordan" />
              <strong>Jordan's Big Picture</strong>
            </div>

            <div className="adaptive-jordan-workspace-content">
              <div className="adaptive-jordan-whiteboard-notes">
                <article
                  className={`adaptive-jordan-sticky-note adaptive-jordan-mental-model ${
                    isJordanUpdating
                      ? 'adaptive-jordan-sticky-note-updating'
                      : ''
                  }`}
                >
                  <span
                    className="adaptive-jordan-sticky-pin"
                    aria-hidden="true"
                  />

                  <p>
                    {hasMentalModel ? (
                      <HighlightedMentalModel
                        mentalModel={mentalModel}
                        highlightedText={mentalModelHighlight}
                      />
                    ) : (
                      <span className="adaptive-workspace-empty-text">
                        Your overall understanding will appear here.
                      </span>
                    )}
                  </p>
                </article>
              </div>
              <div
                className={`adaptive-open-questions ${
                  isJordanUpdating ? 'adaptive-open-questions-updating' : ''
                }`}
              >
                <strong>Not covered in current sources</strong>

                {openQuestions.length > 0 ? (
                  <ul>
                    {openQuestions.map((question, index) => (
                      <li key={`${question}-${index}`}>{question}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="adaptive-workspace-empty-text">
                    Nothing noted yet.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="adaptive-jordan-whiteboard-tray" aria-hidden="true">
          <span className="adaptive-jordan-whiteboard-marker" />
          <span className="adaptive-jordan-whiteboard-eraser" />
        </div>
      </div>
    </aside>
  )
}

function WorkspaceThinking({ label }) {
  return (
    <div className="adaptive-workspace-thinking">
      <div className="adaptive-jordan-whiteboard-thinking" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <small>{label}</small>
    </div>
  )
}

function HistoryModal({ messages, onClose, historyBodyRef }) {
  return (
    <div
      className="adaptive-history-overlay"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="adaptive-history-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adaptive-history-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="adaptive-history-header">
          <span id="adaptive-history-title">Conversation history</span>

          <button
            type="button"
            className="adaptive-history-close"
            onClick={onClose}
            aria-label="Close conversation history"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div
          ref={historyBodyRef}
          className="adaptive-history-body"
          aria-live="polite"
        >
          {messages.length === 0 ? (
            <div className="adaptive-history-empty">No messages yet.</div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`adaptive-history-message adaptive-history-message-${message.from}`}
              >
                <span className="adaptive-history-sender">
                  {message.from === 'user'
                    ? 'You'
                    : message.from === 'alex'
                      ? 'Alex'
                      : 'Jordan'}
                </span>

                <div className="adaptive-history-bubble">{message.text}</div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

function EvidenceSourceCards({
  sources,
  savedResources,
  onToggleSavedResource,
}) {
  return (
    <div className="adaptive-evidence-source-list">
      {sources.map((source) => {
        const sourceKey = getSourceKey(source)
        const isSaved = savedResources.some(
          (savedSource) => getSourceKey(savedSource) === sourceKey,
        )

        return (
          <article
            key={sourceKey}
            className={`adaptive-evidence-source-card ${
              isSaved ? 'is-saved' : ''
            }`}
          >
            <div className="adaptive-evidence-source-header">
              <span className="adaptive-evidence-source-name">
                {source.source || 'Source'}
              </span>{' '}
              <span>Source: {source.title}</span>
            </div>

            {source.relevance && (
              <div className="adaptive-evidence-relevance">
                <p>{source.relevance}</p>
              </div>
            )}

            {source.url && (
              <div className="save-area">
                <span className="adaptive-evidence-source-link">
                  {source.url}
                </span>
                <button
                  type="button"
                  className={`adaptive-evidence-save ${
                    isSaved ? 'is-saved' : ''
                  }`}
                  onClick={() => onToggleSavedResource(source)}
                  aria-pressed={isSaved}
                  aria-label={
                    isSaved ? 'Remove saved resource' : 'Save resource'
                  }
                >
                  <FontAwesomeIcon
                    icon={isSaved ? faBookmarkSolid : faBookmarkRegular}
                  />
                  <span>{isSaved ? 'Saved' : 'Save'}</span>
                </button>
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
