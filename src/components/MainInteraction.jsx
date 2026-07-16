import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import logo from '../assets/logo-transparent.png'
import alex from '../assets/alex.png'
import jordan from '../assets/jordan.png'
import '../css/MainInteraction.css'
import stageBackground from '../assets/bg.jpg'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPaperPlane,
  faBullseye,
  faCommentDots,
  faXmark,
  faCheck,
  faClipboardList,
  faBan,
  faMagnifyingGlass,
  faRoute,
  faObjectGroup,
  faListCheck,
  faArrowRight,
  faPenToSquare,
  faFileLines,
  faCode,
  faCommentNodes,
  faVolume,
  faExpand,
  faCubesStacked,
  faCircleQuestion,
  faDiagramProject,
  faFilter,
  faShapes,
  faHandHoldingHeart,
  faBookmark as faBookmarkSolid,
} from '@fortawesome/free-solid-svg-icons'
import {
  faLightbulb,
  faBookmark as faBookmarkRegular,
} from '@fortawesome/free-regular-svg-icons'
import {
  initCompanionCharacter,
  initDoctorCharacter,
  playGesture,
  speakWithLipsync,
  speakWithLipsyncStatic,
} from '../character.js'
import SwipingCards from './SwipingCards'
import {
  incrementInteractionCount,
  logMainInteraction,
  logSession,
} from '../api/logging.js'

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const ALEX_INTROS = [
  "Hi there, I'm Alex, and this is Jordan! We are AI powered virtual characters here to help you explore and understand clinical trial participation.",
  "I'll quickly explain my role first. I'm a virtual assistant that can quickly search information across several trusted health resources to answer questions about clinical trial participation. I pull from sources recommended for understanding how clinical trials work, like the National Cancer Institute and ClinicalTrials.gov.",
  'These sources cover topics like how trials work, the different types and phases, how participants are protected, and how insurance and study costs are handled.',
  "One important thing to know is that I don't have information on specific clinical trials, so I can't help you find a trial to join or answer questions about a particular study.",
  "Now, I'll hand it over to Jordan to quickly explain his role.",
]

const JORDAN_INTROS = [
  "Thanks, Alex! So as Alex mentioned, I'm Jordan. I'm a virtual companion here to provide useful guidance during your search process.",
  "As you explore, I'll help you build on your questions and discover new ways to learn about clinical trial participation.",
  'Sometimes that might mean making a question more specific, looking at something from a different perspective, or exploring a related idea.',
  "Ultimately, you decide where the conversation goes. I'm just here to support your exploration.",
  "Whenever you're ready, ask Alex anything you'd like to know about clinical trials!",
]

const INTRO_VISUAL_TIMELINE = {
  alex: {
    1: [
      { delay: 2500, duration: 2000, cue: { type: 'ai' } },
      { delay: 5000, duration: 2200, cue: { type: 'explore' } },
    ],
    2: [
      { delay: 3500, duration: 5500, cue: { type: 'search-documents' } },
      { delay: 9500, duration: 3000, cue: { type: 'verified-document' } },
    ],
    3: [{ delay: 500, duration: 5000, cue: { type: 'topic-checklist' } }],
    4: [{ delay: 1800, duration: 5000, cue: { type: 'no-specific-trials' } }],
  },
  jordan: {
    1: [
      {
        delay: 1800,
        duration: 3500,
        cue: { type: 'jordan-guidance' },
      },
    ],

    2: [
      {
        delay: 1800,
        duration: 4200,
        cue: { type: 'jordan-build-question' },
      },
    ],

    3: [
      {
        delay: 500,
        duration: 1400,
        cue: { type: 'jordan-specific' },
      },
      {
        delay: 3100,
        duration: 1400,
        cue: { type: 'jordan-perspectives' },
      },
      {
        delay: 5000,
        duration: 1800,
        cue: { type: 'jordan-related' },
      },
    ],

    4: [
      {
        delay: 1600,
        duration: 4000,
        cue: { type: 'jordan-user-control' },
      },
    ],
  },
}

const uid = () => crypto.randomUUID()

const getSourceKey = (source) =>
  source.url || source.title || source.file || source.source || source.id

const dedupeSources = (sources = []) =>
  Array.from(
    new Map(sources.map((source) => [getSourceKey(source), source])).values(),
  )

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
        // Give WebGL two complete paint frames before continuing.
        requestAnimationFrame(() => {
          requestAnimationFrame(resolve)
        })
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

/* -------------------------------------------------------------------------- */
/* Main component                                                             */
/* -------------------------------------------------------------------------- */

export default function MainInteraction() {
  // const BASE_URL = 'http://127.0.0.1:8000'
  const BASE_URL =
    'https://brcco3c42yqwcnqmvj4h2k2igu0fysxd.lambda-url.us-east-1.on.aws'

  useEffect(() => {
    const image = new Image()
    image.src = stageBackground

    if (image.decode) {
      image.decode().catch(() => {
        // The browser can still display it even if decode() rejects.
      })
    }
  }, [])

  const [searchParams] = useSearchParams()

  const participantId =
    searchParams.get('id') ||
    searchParams.get('PROLIFIC_PID') ||
    'test-participant'

  const condition = Number(searchParams.get('c') || 1)

  const doctorRef = useRef(null)
  const companionRef = useRef(null)
  const textareaRef = useRef(null)
  const introCueTimers = useRef([])
  const historyBodyRef = useRef(null)
  const sessionLoggedRef = useRef(false)

  useEffect(() => {
    if (sessionLoggedRef.current) return
    if (!participantId) return

    sessionLoggedRef.current = true

    logSession(participantId, condition).catch((error) => {
      console.error('Failed to log session:', error)

      // Permit a retry if logging failed.
      sessionLoggedRef.current = false
    })
  }, [participantId, condition])

  // For using session storage
  const SESSION_KEY = `mainInteractionSession-${participantId}`

  function getSavedSession() {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  }

  const savedSession = getSavedSession()

  const [jordanConversationModel, setJordanConversationModel] = useState(() => {
    const savedModel = savedSession?.jordanConversationModel

    /*
     * Restore only the new theme-based shape.
     * Old sessions may still contain turnNotes/runningSummary.
     */
    if (Array.isArray(savedModel?.themes)) {
      return {
        themes: savedModel.themes,
        latestConnection: savedModel.latestConnection ?? null,
      }
    }

    return {
      themes: [],
      latestConnection: null,
    }
  })
  const [isJordanWorkspaceOpen, setIsJordanWorkspaceOpen] = useState(false)
  const restoredInteractionRef = useRef(
    !!savedSession?.alexIntroDone || (savedSession?.messages?.length ?? 0) > 0,
  )
  const [savedResources, setSavedResources] = useState(
    savedSession?.savedResources ?? [],
  )
  const [isIntroPlaying, setIsIntroPlaying] = useState(false)
  const [hideCharacterLoader, setHideCharacterLoader] = useState(false)
  const [charactersReady, setCharactersReady] = useState(false)
  const [charactersSettled, setCharactersSettled] = useState(false)
  const [alexSubtitle, setAlexSubtitle] = useState('')
  const [jordanSubtitle, setJordanSubtitle] = useState('')
  const introStartedRef = useRef(false)
  const [activeSourcePopout, setActiveSourcePopout] = useState(null)
  const [introCue, setIntroCue] = useState(null)
  const [audioReady, setAudioReady] = useState(
    savedSession?.audioReady ?? false,
  )
  const [showCards, setShowCards] = useState(false)
  const [alexIntroDone, setAlexIntroDone] = useState(
    savedSession?.alexIntroDone ?? false,
  )
  const [alexSources, setAlexSources] = useState([])
  const [alexTalkingPoints, setAlexTalkingPoints] = useState([])
  const [isAlexActive, setIsAlexActive] = useState(false)
  const [isJordanActive, setIsJordanActive] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [input, setInput] = useState(savedSession?.input ?? '')
  const [messages, setMessages] = useState(savedSession?.messages ?? [])
  const [transcript, setTranscript] = useState(savedSession?.transcript ?? [])
  const [isForaging, setIsForaging] = useState(false)
  const [isForagingFading, setIsForagingFading] = useState(false)
  const [startChecks, setStartChecks] = useState({
    volume: false,
    browser: false,
  })
  const [jordanGuidance, setJordanGuidance] = useState(
    savedSession?.jordanGuidance ?? null,
  )

  const [isJordanGuidanceLoading, setIsJordanGuidanceLoading] = useState(false)

  const previousJordanGuidanceTypes = useRef(
    savedSession?.previousJordanGuidanceTypes ?? [],
  )

  const previousJordanGuidanceMessages = useRef(
    savedSession?.previousJordanGuidanceMessages ?? [],
  )

  const canStart = Object.values(startChecks).every(Boolean)

  useEffect(() => {
    const session = {
      audioReady,
      alexIntroDone,
      input,
      messages,
      transcript,
      jordanGuidance,
      savedResources,
      previousJordanGuidanceTypes: previousJordanGuidanceTypes.current,
      previousJordanGuidanceMessages: previousJordanGuidanceMessages.current,
      jordanConversationModel,
    }

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  }, [
    SESSION_KEY,
    audioReady,
    alexIntroDone,
    input,
    messages,
    transcript,
    jordanGuidance,
    savedResources,
    jordanConversationModel,
  ])

  const completedAlexResponses = messages.filter(
    (message) => message.from === 'alex' && !message.isIntro,
  ).length

  const showFinishButton = completedAlexResponses >= 5

  /* ------------------------------------------------------------------------ */
  /* Character setup + scroll behavior                                        */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!audioReady) return

    async function initCharacters() {
      try {
        setCharactersReady(false)
        setCharactersSettled(false)
        setHideCharacterLoader(false)
        setIsAlexActive(false)
        setIsJordanActive(false)

        /* Initialize both characters together */
        await Promise.all([
          initDoctorCharacter(doctorRef.current),
          initCompanionCharacter(companionRef.current),
        ])

        /* Wait until both character canvases exist and have rendered */
        await Promise.all([
          waitForCharacterRender(doctorRef.current),
          waitForCharacterRender(companionRef.current),
        ])

        /* Reveal the character canvases behind the loading overlay */
        setCharactersReady(true)

        /* Let React paint the rendered avatars */
        await new Promise((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(resolve)
          })
        })

        /* Turn the characters toward each other */
        playGesture('jordanLookAtAlex')
        playGesture('alexLookAtJordan')

        /* Give the turning gestures time to settle */
        await new Promise((resolve) => setTimeout(resolve, 1200))

        playGesture('stopCompanionGesture')
        playGesture('stopAlexGesture')

        /* Let the stopped pose settle before removing the overlay */
        await new Promise((resolve) => setTimeout(resolve, 500))

        await new Promise((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(resolve)
          })
        })

        /* Start fading the loader while the finished scene is behind it */
        setHideCharacterLoader(true)

        /* Match the 350ms CSS fade, with a little safety room */
        await new Promise((resolve) => setTimeout(resolve, 400))

        /* Now unmount the loader */
        setCharactersSettled(true)

        /* On refresh, show the ready scene but do not replay the intro */
        if (restoredInteractionRef.current) {
          setIsAlexActive(false)
          setIsJordanActive(false)
          return
        }

        if (introStartedRef.current) return
        introStartedRef.current = true

        /* Brief pause before Alex becomes active and the camera pans */
        await new Promise((resolve) => setTimeout(resolve, 300))

        setIsAlexActive(true)
        setIsJordanActive(false)
        setIsIntroPlaying(true)

        /* ---------------------------------------------------------------------- */
        /* Alex introduction                                                      */
        /* ---------------------------------------------------------------------- */

        playGesture('jordanLookAtAlex')
        for (const [index, text] of ALEX_INTROS.entries()) {
          const introNumber = index + 1

          setMessages((prev) => [
            ...prev,
            {
              id: uid(),
              from: 'alex',
              text,
              sources: [],
              explanation: null,
              confidence: null,
              isIntro: true,
            },
          ])

          updateTranscript('alex', text, {
            sources: [],
            intro: true,
            intro_part: introNumber,
            intro_character: 'alex',
          })

          scheduleIntroVisuals('alex', introNumber)

          await speakWithLipsyncStatic(
            `/intro-voices/doctor-audio-ALEX_INTRO_${introNumber}.mp3`,
            `/intro-voices/doctor-timestamps-ALEX_INTRO_${introNumber}.json`,
            'doctor',
            true,
            setAlexSubtitle,
          )

          clearIntroCues()
        }

        /* ---------------------------------------------------------------------- */
        /* Switch from Alex to Jordan                                              */
        /* ---------------------------------------------------------------------- */

        setAlexSubtitle('')
        setIsAlexActive(false)
        setIsJordanActive(true)
        setIsIntroPlaying(false)

        /* ---------------------------------------------------------------------- */
        /* Jordan introduction                                                    */
        /* ---------------------------------------------------------------------- */
        playGesture('alexLookAtJordan')

        for (const [index, text] of JORDAN_INTROS.entries()) {
          const introNumber = index + 1

          setMessages((prev) => [
            ...prev,
            {
              id: uid(),
              from: 'jordan',
              text,
              sources: [],
              explanation: null,
              confidence: null,
              isIntro: true,
            },
          ])

          updateTranscript('jordan', text, {
            sources: [],
            intro: true,
            intro_part: introNumber,
            intro_character: 'jordan',
          })

          scheduleIntroVisuals('jordan', introNumber)

          await speakWithLipsyncStatic(
            `/intro-voices/companion-audio-JORDAN_INTRO_${introNumber}.mp3`,
            `/intro-voices/companion-timestamps-JORDAN_INTRO_${introNumber}.json`,
            'companion',
            true,
            setJordanSubtitle,
          )

          clearIntroCues()
        }

        /* ---------------------------------------------------------------------- */
        /* Introduction complete                                                  */
        /* ---------------------------------------------------------------------- */

        setJordanSubtitle('')
        setIsJordanActive(false)
        setAlexIntroDone(true)

        playGesture('stopCompanionGesture')
        playGesture('stopAlexGesture')
      } catch (err) {
        console.log(err)
      }
    }
    initCharacters()
  }, [audioReady])

  useEffect(() => {
    if (!showHistory) return

    requestAnimationFrame(() => {
      historyBodyRef.current?.scrollTo({
        top: historyBodyRef.current.scrollHeight,
        behavior: 'smooth',
      })
    })
  }, [showHistory, messages.length])

  /* ------------------------------------------------------------------------ */
  /* Navigation                                               */
  /* ------------------------------------------------------------------------ */

  const navigate = useNavigate()

  function handleContinue() {
    sessionStorage.removeItem(SESSION_KEY)

    navigate('/notes-review', {
      state: {
        participantId,
        condition,
        savedResources,
      },
    })
  }

  /* ------------------------------------------------------------------------ */
  /* Logging helpers                                                    */
  /* ------------------------------------------------------------------------ */

  function updateTranscript(role, content, meta = {}) {
    const newEntry = {
      role,
      content,
      timestamp: new Date().toISOString(),
      condition,
      ...meta,
    }

    setTranscript((prev) => {
      const updated = [...prev, newEntry]
      logMainInteraction(participantId, updated).catch(console.error)
      return updated
    })
  }

  /* ------------------------------------------------------------------------ */
  /* Jordan panel helpers                                                     */
  /* ------------------------------------------------------------------------ */

  function clearIntroCues() {
    introCueTimers.current.forEach(clearTimeout)
    introCueTimers.current = []
    setIntroCue(null)
  }

  function scheduleIntroVisuals(character, introNumber) {
    clearIntroCues()

    const visualCues = INTRO_VISUAL_TIMELINE[character]?.[introNumber] || []

    visualCues.forEach(({ delay, duration, cue }) => {
      const showTimer = setTimeout(() => {
        setIntroCue({
          ...cue,
          character,
        })

        if (duration) {
          const fadeTimer = setTimeout(() => {
            setIntroCue((currentCue) =>
              currentCue ? { ...currentCue, isExiting: true } : null,
            )
          }, duration)

          const removeTimer = setTimeout(() => {
            setIntroCue(null)
          }, duration + 450)

          introCueTimers.current.push(fadeTimer, removeTimer)
        }
      }, delay)

      introCueTimers.current.push(showTimer)
    })
  }

  function clearJordanUI() {
    setJordanGuidance(null)
    setIsJordanGuidanceLoading(false)
    setIsJordanWorkspaceOpen(false)
  }

  async function updateJordanTurn({
    userQuestion,
    alexAnswer,
    history,
    currentModel,
  }) {
    const response = await fetch(`${BASE_URL}/jordan-turn-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_question: userQuestion,
        alex_answer: alexAnswer,
        history,
        current_model: currentModel,
        previous_guidance_types: previousJordanGuidanceTypes.current,
        previous_guidance_messages: previousJordanGuidanceMessages.current,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()

      throw new Error(
        `Jordan turn update failed: ${response.status} ${errorText}`,
      )
    }

    return response.json()
  }

  /* ------------------------------------------------------------------------ */
  /* Query support                                                            */
  /* ------------------------------------------------------------------------ */

  function handleInputChange(value) {
    setInput(value)
  }

  function handleOpenSource(source, location = 'alex_sources') {
    const sourceKey = getSourceKey(source)

    updateTranscript('resource_opened', 'Resource opened', {
      source_key: sourceKey,
      source_title: source.title || source.file || null,
      source_organization: source.source || null,
      source_url: source.url || null,
      source_file: source.file || null,
      source_page_number: source.page_number ?? null,
      source_chunk_id: source.chunk_id ?? null,
      opened_from: location,
    })

    incrementInteractionCount(participantId, 'source_open_count').catch(
      (error) => {
        console.error('Source open count update failed:', error)
      },
    )

    setActiveSourcePopout(source)
  }

  function handleSaveResource(source) {
    const sourceKey = getSourceKey(source)

    setSavedResources((previous) => {
      const alreadySaved = previous.some(
        (savedSource) => getSourceKey(savedSource) === sourceKey,
      )

      if (alreadySaved) return previous

      updateTranscript('resource_saved', 'Resource saved', {
        source_key: sourceKey,
        source_title: source.title || source.file || null,
        source_organization: source.source || null,
        source_url: source.url || null,
        source_file: source.file || null,
        source_page_number: source.page_number ?? null,
        source_chunk_id: source.chunk_id ?? null,
      })

      incrementInteractionCount(participantId, 'source_save_count').catch(
        (error) => {
          console.error('Source save count update failed:', error)
        },
      )

      return [
        ...previous,
        {
          ...source,
          savedAt: new Date().toISOString(),
        },
      ]
    })
  }

  async function handleJordanClick() {
    if (!jordanGuidance) return
    if (isAlexActive || isJordanActive || isForaging) return

    const shouldSpeak = !jordanGuidance.hasSpoken

    setIsJordanWorkspaceOpen(false)

    updateTranscript('jordan_workspace_action', 'opened Jordan workspace', {
      action: 'opened',
      guidance_id: jordanGuidance.id,
      guidance_type: jordanGuidance.guidance_type,
      spoke_guidance: shouldSpeak,
      theme_id: jordanGuidance.theme_id,
      theme_label: jordanGuidance.theme_label,
      detail_id: jordanGuidance.detail_id,
      earlier_detail_id: jordanGuidance.earlier_detail_id,
      earlier_question_reference: jordanGuidance.earlier_question_reference,
      connection_label: jordanGuidance.connection_label,
    })

    incrementInteractionCount(participantId, 'jordan_click_count').catch(
      (error) => {
        console.error('Jordan click count update failed:', error)
      },
    )

    // Jordan has already spoken, so just open the workspace.
    // Do not mark him active.
    if (!shouldSpeak) {
      setIsJordanWorkspaceOpen(true)
      return
    }

    playGesture('stopCompanionGesture')

    // Jordan is active only while his audio is playing.
    setIsJordanActive(true)

    setJordanGuidance((previous) =>
      previous
        ? {
            ...previous,
            hasSpoken: true,
          }
        : previous,
    )

    try {
      playGesture('alexLookAtJordan')

      await speakWithLipsync(
        jordanGuidance.jordan_message,
        'companion',
        null,
        () => {
          setMessages((previous) => [
            ...previous,
            {
              id: uid(),
              guidanceId: jordanGuidance.id,
              from: 'jordan',
              text: jordanGuidance.jordan_message,
              guidanceType: jordanGuidance.guidance_type,
              themeId: jordanGuidance.theme_id,
              themeLabel: jordanGuidance.theme_label,
              detailId: jordanGuidance.detail_id,
              earlierDetailId: jordanGuidance.earlier_detail_id,
              earlierQuestionReference:
                jordanGuidance.earlier_question_reference,
            },
          ])

          updateTranscript(
            'jordan_guidance_spoken',
            jordanGuidance.jordan_message,
            {
              guidance_id: jordanGuidance.id,
              guidance_type: jordanGuidance.guidance_type,
              theme_id: jordanGuidance.theme_id,
              theme_label: jordanGuidance.theme_label,
              detail_id: jordanGuidance.detail_id,
              earlier_detail_id: jordanGuidance.earlier_detail_id,
              earlier_question_reference:
                jordanGuidance.earlier_question_reference,
              connection_label: jordanGuidance.connection_label,
              connection_text: jordanGuidance.connection_text,
            },
          )
        },
        setJordanSubtitle,
      )
    } catch (error) {
      console.error('Jordan guidance speech failed:', error)
    } finally {
      setJordanSubtitle('')
      setIsJordanActive(false)
      setIsJordanWorkspaceOpen(true)
      playGesture('stopCompanionGesture')
      playGesture('stopAlexGesture')
    }
  }

  function dismissJordanGuidance() {
    if (jordanGuidance) {
      updateTranscript('jordan_workspace_action', 'closed Jordan workspace', {
        action: 'closed',
        guidance_id: jordanGuidance.id,
        guidance_type: jordanGuidance.guidance_type,
      })
    }

    setIsJordanWorkspaceOpen(false)
    setIsJordanActive(false)

    playGesture('stopAlexGesture')
  }

  /* ------------------------------------------------------------------------ */
  /* Message send flow                                                        */
  /* ------------------------------------------------------------------------ */

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter') return

    // Shift+Enter -> new line
    if (e.shiftKey) {
      return
    }

    // Enter -> send
    e.preventDefault()
    handleSend(e)
  }

  async function handleSend(e) {
    e.preventDefault()

    const trimmed = input.trim()
    if (!trimmed) return

    updateTranscript('user', trimmed)

    clearIntroCues()
    setIsAlexActive(true)
    playGesture('startSwiping')
    playGesture('jordanLookAtAlex')
    setShowCards(true)
    setAlexSources([])
    setAlexTalkingPoints([])
    clearJordanUI()

    setIsForaging(true)

    setMessages((prev) => [
      ...prev,
      {
        id: uid(),
        from: 'user',
        text: trimmed,
      },
    ])

    setInput('')

    const alexMsgId = uid()

    try {
      const history = messages
        .filter((m) => m.from === 'user' || m.from === 'alex')
        .map((m) => ({
          role: m.from === 'user' ? 'user' : 'assistant',
          content: m.text,
        }))
      const response = await fetch(`${BASE_URL}/rag-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmed,
          history,
        }),
      })

      const data = await response.json()
      console.log('DATA SOURCES ARE', data.sources)

      if (!data.answer) {
        throw new Error('Alex response did not include an answer.')
      }

      setIsJordanGuidanceLoading(true)

      const jordanModelSnapshot = jordanConversationModel

      const jordanTurnPromise = updateJordanTurn({
        userQuestion: trimmed,
        alexAnswer: data.answer,
        history,
        currentModel: jordanModelSnapshot,
      })
        .then((turnUpdate) => {
          console.log('*** JORDAN TURN UPDATE IS', turnUpdate)
          return turnUpdate
        })
        .catch((error) => {
          console.error('Jordan turn update failed:', error)
          return null
        })

      console.log('Sources', data.sources)

      await speakWithLipsync(
        data.answer,
        'doctor',
        null,
        () => {
          updateTranscript('alex_spoken', data.answer, {
            message_id: alexMsgId,
            sources: data.sources || [],
            talking_points: data.talking_points || [],
            confidence: data.confidence ?? null,
          })
          // This runs when the audio is ready and Alex is about to speak.
          setShowCards(false)
          playGesture('stopSwiping')
          setAlexTalkingPoints(data.talking_points || [])

          setIsForagingFading(true)

          setTimeout(() => {
            setIsForaging(false)
            setIsForagingFading(false)
          }, 450)

          setMessages((prev) => [
            ...prev,
            {
              id: alexMsgId,
              from: 'alex',
              text: data.answer,
              talkingPoints: data.talking_points || [],
              sources: data.sources || [],
              explanation: data.relevance_explanation,
              confidence: data.confidence,
            },
          ])
        },
        setAlexSubtitle,
      )

      setAlexSubtitle('')
      playGesture('stopAlexGesture')
      setAlexSources(data.sources || [])
      setIsAlexActive(false)

      const jordanTurnData = await jordanTurnPromise

      if (jordanTurnData) {
        const updatedThemes = Array.isArray(jordanTurnData.themes)
          ? jordanTurnData.themes
          : []

        const latestConnection = jordanTurnData.latest_connection ?? null

        /*
         * The backend returns the complete updated theme collection,
         * so replace the old model instead of appending to it.
         */
        setJordanConversationModel({
          themes: updatedThemes,
          latestConnection,
        })

        /*
         * Find the newest detail generated for this turn.
         * The backend fills its source_question with the current question.
         */
        const newestDetail = updatedThemes
          .flatMap((theme) =>
            (theme.details || []).map((detail) => ({
              ...detail,
              themeId: theme.id,
              themeLabel: theme.label,
            })),
          )
          .find((detail) => detail.source_question === trimmed)

        /*
         * Store the visible guidance separately. Jordan will speak it only
         * when the workspace button is clicked for the first time.
         */
        const guidanceWithId = {
          id: uid(),
          guidance_type: jordanTurnData.guidance_type,
          jordan_message: jordanTurnData.jordan_message,

          theme_id: latestConnection?.theme_id || newestDetail?.themeId || null,

          theme_label:
            updatedThemes.find(
              (theme) =>
                theme.id ===
                (latestConnection?.theme_id || newestDetail?.themeId),
            )?.label ||
            newestDetail?.themeLabel ||
            '',

          detail_id: newestDetail?.id || null,

          earlier_detail_id: latestConnection?.earlier_detail_id || null,

          earlier_question_reference:
            latestConnection?.earlier_question_reference || null,

          connection_label: latestConnection?.label || null,

          connection_text: latestConnection?.text || null,

          hasSpoken: false,
        }

        previousJordanGuidanceTypes.current = [
          ...previousJordanGuidanceTypes.current,
          jordanTurnData.guidance_type,
        ]

        previousJordanGuidanceMessages.current = [
          ...previousJordanGuidanceMessages.current,
          jordanTurnData.jordan_message,
        ]

        setJordanGuidance(guidanceWithId)
        setIsJordanWorkspaceOpen(false)

        updateTranscript('jordan_turn_updated', jordanTurnData.jordan_message, {
          guidance_id: guidanceWithId.id,
          guidance_type: jordanTurnData.guidance_type,

          user_question: trimmed,
          alex_answer: data.answer,
          for_message_id: alexMsgId,

          themes: updatedThemes,
          latest_connection: latestConnection,

          new_detail_id: newestDetail?.id || null,
          new_detail_text: newestDetail?.text || null,

          theme_id: guidanceWithId.theme_id,
          theme_label: guidanceWithId.theme_label,

          earlier_detail_id: latestConnection?.earlier_detail_id || null,
          earlier_question_reference:
            latestConnection?.earlier_question_reference || null,

          connection_label: latestConnection?.label || null,
          connection_text: latestConnection?.text || null,
        })

        playGesture('thinking')
      }

      setIsJordanGuidanceLoading(false)
    } catch (err) {
      console.error(err)

      setIsAlexActive(false)
      setIsJordanGuidanceLoading(false)
      setIsForaging(false)
      setIsForagingFading(false)
      playGesture('stopSwiping')
      playGesture('stopAlexGesture')

      setMessages((prev) => [
        ...prev,
        {
          id: alexMsgId,
          from: 'alex',
          text: 'Sorry, something went wrong.',
        },
      ])
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

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
            explore questions about clinical trial participation.
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
    <div className="mi-root">
      <div className="tool-header">
        <img src={logo} className="logo" alt="Study logo" />
        <h2>Clinical Trials Education</h2>
        <h1>Chat with Virtual Characters</h1>
      </div>
      <button className="history-btn" onClick={() => setShowHistory(true)}>
        <FontAwesomeIcon icon={faCommentDots} size="sm" />
        Chat history
      </button>

      {showFinishButton && (
        <button className="mi-continue-btn" onClick={handleContinue}>
          Finish
        </button>
      )}

      <main className="mi-main">
        <section className="mi-chat-card">
          <AlexHeader
            charactersReady={charactersReady}
            doctorRef={doctorRef}
            companionRef={companionRef}
            isAlexActive={isAlexActive}
            isJordanActive={isJordanActive}
            sources={alexSources}
            showCards={showCards}
            introCue={introCue}
            onOpenSource={(source) => handleOpenSource(source, 'alex_sources')}
            isForaging={isForaging}
            isForagingFading={isForagingFading}
            alexSubtitle={alexSubtitle}
            jordanSubtitle={jordanSubtitle}
            isIntroPlaying={isIntroPlaying}
            jordanGuidance={jordanGuidance}
            dismissJordanGuidance={dismissJordanGuidance}
            isJordanWorkspaceOpen={isJordanWorkspaceOpen}
            onJordanClick={handleJordanClick}
            talkingPoints={alexTalkingPoints}
            jordanConversationModel={jordanConversationModel}
          />

          <ChatInput
            input={input}
            textareaRef={textareaRef}
            onChange={handleInputChange}
            onSubmit={handleSend}
            disabled={isAlexActive || isJordanActive}
            onHandleKeyDown={handleKeyDown}
          />
        </section>
      </main>

      {activeSourcePopout && (
        <SourcePopout
          source={activeSourcePopout}
          onClose={() => setActiveSourcePopout(null)}
          onSaveResource={handleSaveResource}
          isSaved={savedResources.some(
            (savedSource) =>
              getSourceKey(savedSource) === getSourceKey(activeSourcePopout),
          )}
        />
      )}

      {showHistory && (
        <HistoryModal
          messages={messages}
          onClose={() => setShowHistory(false)}
          historyBodyRef={historyBodyRef}
        />
      )}

      {audioReady && !charactersSettled && (
        <div
          className={`character-loading-overlay ${
            hideCharacterLoader ? 'is-exiting' : ''
          }`}
          role="status"
          aria-live="polite"
          aria-label="Preparing the virtual characters"
        >
          <div className="character-loading-card">
            <img
              src={logo}
              className="character-loading-logo"
              alt=""
              aria-hidden="true"
            />

            <div className="character-loading-animation" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>

            <h2>Preparing Alex and Jordan</h2>
            <p>Getting the virtual characters ready...</p>
          </div>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Render helpers                                                             */
/* -------------------------------------------------------------------------- */

function JordanExplorationCard({ guidance, conversationModel, onDismiss }) {
  const themes = conversationModel?.themes || []
  const latestConnection = conversationModel?.latestConnection || null

  const [expandedThemeIds, setExpandedThemeIds] = useState(() => new Set())

  const currentThemeId =
    guidance?.theme_id ||
    latestConnection?.theme_id ||
    themes[themes.length - 1]?.id ||
    null

  useEffect(() => {
    if (!currentThemeId) return

    // Whenever a new turn arrives, collapse older themes and
    // automatically open only the theme relevant to this turn.
    setExpandedThemeIds(new Set([currentThemeId]))
  }, [currentThemeId, guidance?.detail_id])

  function toggleTheme(themeId) {
    setExpandedThemeIds((previous) => {
      const next = new Set(previous)

      if (next.has(themeId)) {
        next.delete(themeId)
      } else {
        next.add(themeId)
      }

      return next
    })
  }

  return (
    <div
      className="jordan-exploration-card"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="jordan-exploration-card-header">
        <div>
          <span className="jordan-exploration-card-kicker">
            Shared exploration space
          </span>

          <h3>Putting the pieces together</h3>
        </div>

        <button
          type="button"
          className="jordan-exploration-close"
          onClick={onDismiss}
          aria-label="Close Jordan's workspace"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>

      {/* {guidance?.jordan_message && (
        <div className="jordan-current-thought">
          <FontAwesomeIcon icon={faLightbulb} />

          <div>
            <span className="jordan-current-thought-label">
              Jordan’s thought
            </span>

            <p>{guidance.jordan_message}</p>
          </div>
        </div>
      )} */}

      {themes.length > 0 && (
        <div className="jordan-theme-map">
          {/* <span className="jordan-theme-map-label">Ideas we’re building</span> */}

          <div className="jordan-theme-list">
            {themes.map((theme) => {
              const isExpanded = expandedThemeIds.has(theme.id)
              const isCurrentTheme = theme.id === currentThemeId
              const orderedDetails = [...(theme.details || [])].sort((a, b) => {
                if (a.id === latestConnection?.earlier_detail_id) return -1
                if (b.id === latestConnection?.earlier_detail_id) return 1

                if (a.id === guidance?.detail_id) return 1
                if (b.id === guidance?.detail_id) return -1

                return 0
              })

              return (
                <section
                  className={[
                    'jordan-theme',
                    isExpanded ? 'is-expanded' : 'is-collapsed',
                    isCurrentTheme ? 'is-current-theme' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  key={theme.id}
                >
                  <button
                    type="button"
                    className="jordan-theme-header"
                    onClick={() => toggleTheme(theme.id)}
                    aria-expanded={isExpanded}
                  >
                    <div className="jordan-theme-header-text">
                      <strong>{theme.label}</strong>

                      {theme.summary && <p>{theme.summary}</p>}
                    </div>

                    <span
                      className={`jordan-theme-toggle ${
                        isExpanded ? 'is-expanded' : ''
                      }`}
                      aria-hidden="true"
                    >
                      ▾
                    </span>
                  </button>

                  {isExpanded && orderedDetails.length > 0 && (
                    <div className="jordan-theme-details">
                      {orderedDetails.map((detail) => {
                        const isEarlierConnectedDetail =
                          latestConnection?.earlier_detail_id === detail.id

                        const isNewestDetail = guidance?.detail_id === detail.id

                        const showConnectionBridge =
                          latestConnection &&
                          theme.id === latestConnection.theme_id &&
                          isNewestDetail &&
                          orderedDetails.some(
                            (item) =>
                              item.id === latestConnection.earlier_detail_id,
                          )

                        return (
                          <div key={detail.id}>
                            {showConnectionBridge && (
                              <div className="jordan-theme-connection-bridge">
                                <FontAwesomeIcon icon={faArrowRight} />
                                <span>
                                  {latestConnection.label || 'Builds on'}
                                </span>
                              </div>
                            )}

                            <div
                              className={[
                                'jordan-theme-detail',
                                isEarlierConnectedDetail
                                  ? 'is-connection-source'
                                  : '',
                                isNewestDetail ? 'is-newest-detail' : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                            >
                              <span>{detail.text}</span>

                              <div className="jordan-theme-detail-tags">
                                {isEarlierConnectedDetail && (
                                  <small>Earlier idea</small>
                                )}

                                {isNewestDetail && <small>Just added</small>}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function AlexHeader({
  charactersReady,
  doctorRef,
  companionRef,
  isAlexActive,
  isJordanActive,
  sources,
  showCards,
  introCue,
  onOpenSource,
  isForaging,
  isForagingFading,
  alexSubtitle,
  jordanSubtitle,
  isIntroPlaying,
  jordanGuidance,
  dismissJordanGuidance,
  isJordanWorkspaceOpen,
  onJordanClick,
  talkingPoints,
  jordanConversationModel,
}) {
  const uniqueSources = dedupeSources(sources)
  const introVisualClass = (extraClass = '') =>
    `alex-intro-visual-card ${extraClass} ${
      introCue?.isExiting ? 'alex-intro-visual-exiting' : ''
    }`
  return (
    <div
      className={`mi-chat-header mi-shared-character-stage
    ${charactersReady ? 'characters-ready' : 'characters-loading'}
    ${isAlexActive ? 'alex-speaking' : ''}
    ${isJordanActive ? 'jordan-speaking' : ''}
  `}
    >
      <div
        className="mi-shared-stage-background"
        style={{ backgroundImage: `url(${stageBackground})` }}
      />

      <div
        className={`mi-character-zone mi-character-zone-alex ${
          isAlexActive ? 'mi-character-zone-speaking' : ''
        } ${isJordanActive ? 'mi-character-zone-listening' : ''} ${
          isAlexActive &&
          (isIntroPlaying ||
            (sources.length > 0 && !isForaging && !isForagingFading))
            ? 'mi-character-label-pulsing'
            : ''
        }`}
      >
        <div className="mi-character-content">
          {showCards && <SwipingCards />}

          <div className="virtual-doctor" id="virtualdoctor" ref={doctorRef} />

          {alexSubtitle && (
            <div className="character-subtitle character-subtitle-alex">
              {alexSubtitle}
            </div>
          )}

          {isAlexActive && (isForaging || isForagingFading) && (
            <div
              className={`alex-foraging-layer ${
                isForagingFading ? 'is-fading-out' : ''
              }`}
            >
              <div className="alex-foraging-card alex-foraging-card-1">
                <FontAwesomeIcon icon={faMagnifyingGlass} />
                <span>Searching trusted sources</span>
              </div>

              <div className="alex-foraging-card alex-foraging-card-2">
                <FontAwesomeIcon icon={faObjectGroup} />
                <span>Comparing information</span>
              </div>

              <div className="alex-foraging-card alex-foraging-card-3">
                <FontAwesomeIcon icon={faListCheck} />
                <span>Preparing an answer</span>
              </div>
            </div>
          )}

          {introCue?.character === 'alex' && introCue?.type === 'ai' && (
            <div
              className={introVisualClass(
                'alex-intro-icon-group alex-intro-ai',
              )}
            >
              <FontAwesomeIcon
                className="alex-intro-icon alex-intro-icon-1"
                icon={faCode}
              />
              <FontAwesomeIcon
                className="alex-intro-icon alex-intro-icon-2"
                icon={faCommentNodes}
              />
            </div>
          )}

          {introCue?.character === 'alex' && introCue?.type === 'explore' && (
            <div
              className={introVisualClass(
                'alex-intro-icon-group alex-intro-explore',
              )}
            >
              <FontAwesomeIcon
                className="alex-intro-icon alex-intro-icon-single"
                icon={faLightbulb}
              />
            </div>
          )}

          {introCue?.character === 'alex' &&
            introCue?.type === 'search-documents' && (
              <div className={introVisualClass('alex-intro-search-documents')}>
                <FontAwesomeIcon
                  className="alex-intro-search-main"
                  icon={faMagnifyingGlass}
                />
                <div className="alex-intro-document-row">
                  <FontAwesomeIcon
                    className="alex-intro-document alex-intro-document-1"
                    icon={faFileLines}
                  />
                  <FontAwesomeIcon
                    className="alex-intro-document alex-intro-document-2"
                    icon={faFileLines}
                  />
                  <FontAwesomeIcon
                    className="alex-intro-document alex-intro-document-3"
                    icon={faFileLines}
                  />
                </div>
              </div>
            )}

          {introCue?.character === 'alex' &&
            introCue?.type === 'verified-document' && (
              <div className={introVisualClass('alex-intro-verified-document')}>
                <div className="alex-intro-verified-file">
                  <FontAwesomeIcon icon={faFileLines} />
                  <span className="alex-intro-verified-badge">
                    <FontAwesomeIcon icon={faCheck} />
                  </span>
                </div>
              </div>
            )}

          {introCue?.character === 'alex' &&
            introCue?.type === 'topic-checklist' && (
              <div className={introVisualClass('alex-intro-topic-checklist')}>
                {[0, 1, 2, 3].map((item) => (
                  <div
                    className={`alex-intro-check-row alex-intro-check-row-${item + 1}`}
                    key={item}
                  >
                    <span className="alex-intro-check-box">
                      <FontAwesomeIcon icon={faCheck} />
                    </span>
                    <span className="alex-intro-check-line" />
                  </div>
                ))}
              </div>
            )}

          {introCue?.character === 'alex' &&
            introCue?.type === 'no-specific-trials' && (
              <div
                className={introVisualClass('alex-intro-no-specific-trials')}
              >
                <div className="alex-intro-restricted-icons">
                  <FontAwesomeIcon
                    className="alex-intro-restricted-clipboard"
                    icon={faClipboardList}
                  />
                  <FontAwesomeIcon
                    className="alex-intro-restricted-search"
                    icon={faMagnifyingGlass}
                  />
                  <span className="alex-intro-restricted-ban">
                    <FontAwesomeIcon icon={faBan} />
                  </span>
                </div>
              </div>
            )}

          {talkingPoints?.length > 0 && (
            <div className="alex-talking-points">
              {talkingPoints.slice(0, 3).map((point, index) => (
                <div key={`${point}-${index}`} className="alex-talking-point">
                  <span className="alex-talking-point-number">{index + 1}</span>

                  <span>{point}</span>
                </div>
              ))}
            </div>
          )}

          {uniqueSources.length > 0 && (
            <div className="alex-source-panel">
              <div className="alex-source-panel-header">
                <span className="alex-source-label">Sources</span>
              </div>

              <div className="alex-source-card-row">
                {uniqueSources.slice(0, 3).map((source, index) => (
                  <button
                    key={getSourceKey(source)}
                    type="button"
                    className="alex-source-card"
                    onClick={() => onOpenSource(source)}
                  >
                    <div className="alex-source-card-top">
                      <div className="alex-source-card-title-area">
                        <span className="alex-source-card-badge">
                          {source.source === 'ClinicalTrials.gov'
                            ? 'CT.gov'
                            : source.source || 'Source'}
                        </span>
                        <div className="alex-source-card-title">
                          {source.title || source.file || 'Trusted resource'}
                        </div>
                      </div>

                      <span className="alex-source-card-page">
                        <FontAwesomeIcon icon={faFileLines} size="2x" />
                      </span>
                    </div>

                    {/* <div className="alex-source-card-excerpt">
                      {(source.excerpt || source.content || '').slice(0, 145)}
                      {(source.excerpt || source.content || '').length > 145
                        ? '…'
                        : ''}
                    </div> */}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="mi-character-label mi-character-label-alex">
          <span>Information Guide</span>
          <strong>Alex</strong>
        </div>
      </div>

      <div
        className={`mi-character-zone mi-character-zone-jordan
    ${isJordanActive ? 'mi-character-zone-speaking' : ''}
    ${isAlexActive ? 'mi-character-zone-listening' : ''}
    ${isJordanWorkspaceOpen ? 'mi-character-zone-workspace-open' : ''}
  `}
      >
        <div className="mi-character-content">
          <div
            className="virtual-companion"
            id="virtualcompanion"
            ref={companionRef}
          />

          {jordanSubtitle && (
            <div className="character-subtitle character-subtitle-jordan">
              {jordanSubtitle}
            </div>
          )}

          {jordanGuidance && !isJordanWorkspaceOpen && !isJordanActive && (
            <button
              type="button"
              className="jordan-workspace-trigger"
              onClick={(event) => {
                event.stopPropagation()
                onJordanClick?.()
              }}
            >
              <FontAwesomeIcon icon={faLightbulb} />
              <span>Let's think about Alex's response</span>
            </button>
          )}

          {introCue?.character === 'jordan' &&
            introCue?.type === 'jordan-guidance' && (
              <div
                className={introVisualClass(
                  'jordan-intro-icon-group jordan-intro-visual jordan-intro-guidance',
                )}
              >
                <FontAwesomeIcon
                  className="jordan-intro-icon jordan-intro-icon-main jordan-intro-item"
                  icon={faRoute}
                  size="2x"
                />

                <FontAwesomeIcon
                  className="jordan-intro-icon jordan-intro-icon-secondary jordan-intro-item"
                  icon={faMagnifyingGlass}
                  size="2x"
                />
              </div>
            )}

          {introCue?.character === 'jordan' &&
            introCue?.type === 'jordan-build-question' && (
              <div
                className={introVisualClass(
                  'jordan-intro-icon-group jordan-intro-visual jordan-intro-build-question',
                )}
              >
                <FontAwesomeIcon
                  className="jordan-intro-icon jordan-intro-item"
                  icon={faCircleQuestion}
                  size="2x"
                />

                <FontAwesomeIcon
                  className="jordan-intro-icon jordan-intro-item"
                  icon={faCubesStacked}
                  size="2x"
                />

                <FontAwesomeIcon
                  className="jordan-intro-icon jordan-intro-item"
                  icon={faArrowRight}
                  size="2x"
                />

                <FontAwesomeIcon
                  className="jordan-intro-icon jordan-intro-item"
                  icon={faLightbulb}
                  size="2x"
                />
              </div>
            )}

          {introCue?.character === 'jordan' &&
            introCue?.type === 'jordan-specific' && (
              <div
                className={introVisualClass(
                  'jordan-intro-icon-group jordan-intro-visual jordan-intro-perspectives',
                )}
              >
                <FontAwesomeIcon
                  className="jordan-intro-icon jordan-intro-item"
                  icon={faFilter}
                  size="2x"
                />
              </div>
            )}

          {introCue?.character === 'jordan' &&
            introCue?.type === 'jordan-perspectives' && (
              <div
                className={introVisualClass(
                  'jordan-intro-icon-group jordan-intro-visual jordan-intro-perspectives',
                )}
              >
                <FontAwesomeIcon
                  className="jordan-intro-icon jordan-intro-item"
                  icon={faShapes}
                  size="2x"
                />
              </div>
            )}

          {introCue?.character === 'jordan' &&
            introCue?.type === 'jordan-related' && (
              <div
                className={introVisualClass(
                  'jordan-intro-icon-group jordan-intro-visual jordan-intro-perspectives',
                )}
              >
                <FontAwesomeIcon
                  className="jordan-intro-icon jordan-intro-item"
                  icon={faDiagramProject}
                  size="2x"
                />
              </div>
            )}

          {introCue?.character === 'jordan' &&
            introCue?.type === 'jordan-user-control' && (
              <div
                className={introVisualClass(
                  'jordan-intro-icon-group jordan-intro-visual jordan-intro-user-control',
                )}
              >
                <FontAwesomeIcon
                  className="jordan-intro-control-main jordan-intro-item"
                  icon={faHandHoldingHeart}
                  size="2x"
                />
              </div>
            )}

          {jordanGuidance && isJordanWorkspaceOpen && (
            <JordanExplorationCard
              guidance={jordanGuidance}
              conversationModel={jordanConversationModel}
              onDismiss={dismissJordanGuidance}
            />
          )}
        </div>

        <div className="mi-character-label mi-character-label-jordan">
          <span>Exploration Guide</span>
          <strong>Jordan</strong>
        </div>
      </div>
    </div>
  )
}

function ChatInput({
  input,
  textareaRef,
  onChange,
  onSubmit,
  disabled = false,
  onHandleKeyDown,
}) {
  return (
    <div className="full-input-area">
      <form
        className="mi-input-row"
        onSubmit={(e) => {
          if (disabled) {
            e.preventDefault()
            return
          }
          onSubmit(e)
        }}
      >
        <div className="mi-input-stack">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => onChange(e.target.value)}
            placeholder={
              disabled
                ? 'Please wait for the character to finish speaking...'
                : 'Type your message to Alex here...'
            }
            rows={3}
            disabled={disabled}
            onKeyDown={onHandleKeyDown}
          />
        </div>

        <button type="submit" className="send-button" disabled={disabled}>
          <FontAwesomeIcon icon={faPaperPlane} />
          <span>Send</span>
        </button>
      </form>
      <p>Press enter to send, or Shift + Enter for newline</p>
    </div>
  )
}

function SourcePopout({
  source,
  onClose,
  onSaveResource = null,
  isSaved = false,
}) {
  if (!source) return null

  const pdfSrc = source.file
    ? `/resources/${encodeURIComponent(source.file)}#page=${source.page_number || 1}`
    : null

  return (
    <div className="source-popout-overlay" onClick={onClose}>
      <div
        className="source-popout source-popout-large"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="source-popout-header">
          <div>
            <div className="source-popout-actions">
              <button
                type="button"
                className={`source-bookmark-btn ${isSaved ? 'is-saved' : ''}`}
                onClick={() => onSaveResource?.(source)}
                disabled={isSaved}
                aria-label={isSaved ? 'Resource saved' : 'Save resource'}
              >
                <span className="source-bookmark-icon">
                  <FontAwesomeIcon
                    icon={isSaved ? faBookmarkSolid : faBookmarkRegular}
                  />
                </span>

                <span>{isSaved ? 'Saved' : 'Save resource'}</span>
              </button>
            </div>
            <div className="source-popout-section">
              <h3>Source Organization</h3>
              <div className="source-popout-eyebrow">
                {source.source || 'Source'}
              </div>
            </div>

            <div className="source-popout-section">
              <h3>Source Title</h3>
              <p>{source.title || source.file || 'Source preview'}</p>
            </div>

            <div className="source-popout-section">
              <h3>Source Excerpt</h3>
              <div className="alex-source-card-excerpt">
                "...
                {(source.excerpt || source.content || '').slice(0, 145)}
                ..."
              </div>
            </div>

            <div className="source-popout-section">
              <h3>Source Preview</h3>
              {source.page_number && (
                <p className="source-page-note">
                  Alex found this around page {source.page_number} in the
                  document below.
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            className="source-popout-close"
            onClick={onClose}
            aria-label="Close source preview"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {pdfSrc ? (
          <iframe
            title={source.title || source.file}
            className="source-popout-iframe"
            src={pdfSrc}
          />
        ) : (
          <div className="source-preview-card">
            <div className="source-preview-site">
              <p>
                <span>{source.source || 'Source'}</span>
                {source.title || source.file || 'Trusted resource'}
              </p>
            </div>

            <div className="source-preview-highlight">
              {source.excerpt || source.content || 'No preview available.'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function HistoryModal({ messages, onClose, historyBodyRef }) {
  return (
    <div className="history-overlay" onClick={onClose}>
      <div className="history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="history-modal-header">
          <span>Conversation history</span>
          <button className="history-close-btn" onClick={onClose}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div ref={historyBodyRef} className="history-modal-body">
          {messages.length === 0 && (
            <div className="history-empty">No messages yet.</div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`history-msg history-msg-${
                message.from === 'jordan-nudge' ? 'jordan' : message.from
              }`}
            >
              <span className="history-msg-sender">
                {message.from === 'alex'
                  ? 'Alex'
                  : message.from === 'jordan' || message.from === 'jordan-nudge'
                    ? 'Jordan'
                    : 'You'}
              </span>

              <div className="history-msg-bubble">
                {message.text}
                {message.resolved && (
                  <span className="history-msg-resolution">
                    {' '}
                    — {message.resolution}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
