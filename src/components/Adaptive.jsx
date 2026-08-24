import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import logo from '../assets/logo-transparent.png'
import alex from '../assets/alex.png'
import jordan from '../assets/jordan.png'
import '../css/Adaptive.css'
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
  faHandPointer,
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
  logFinishButtonAppeared,
  incrementConversationTurns,
  logIntroFinished,
  logIntroPart,
} from '../api/logging.js'

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */
const ALEX_INTRO_1 =
  "Hi there, I'm Alex, and this is Jordan! We are AI powered virtual characters here to help you explore and understand clinical trial participation."
const ALEX_INTRO_2 =
  "I'll explain my role first. I'm a virtual assistant that can quickly search information across several trusted health resources to answer questions about clinical trial participation. I pull from reputable sources like the National Cancer Institute."
const ALEX_INTRO_3 =
  'These sources cover information such as the purpose and importance of clinical trials, and topics such as safety and costs. As I answer your questions, I will also share the sources I use that you can save to read later if you want.'
const ALEX_INTRO_4 =
  "One important thing to note is that I don't have information on specific clinical trials, so I can't help you find a trial to join or answer questions about a particular study."
const ALEX_INTRO_5 = "Now, I'll hand it over to Jordan."

const JORDAN_INTRO_1 =
  "Thanks! As Alex mentioned, I'm Jordan. I'm a virtual companion here to help make sure the information Alex gives you is communicated in a way that works for you."
const JORDAN_INTRO_2 =
  "If I notice you sharing something with Alex that might be useful to keep in mind when answering your questions, I'll ask you about it after Alex answers."
const JORDAN_INTRO_3 =
  "You can also talk with me anytime about yourself or how you like information explained, and I'll help Alex keep that in mind."
const JORDAN_INTRO_4 =
  "I can't answer questions about clinical trials myself. My role is to talk with you about what Alex should keep in mind when answering your questions."
const JORDAN_INTRO_5 =
  "Whenever you're ready, ask Alex anything you'd like to know about clinical trials!"

const ALEX_INTROS_DISTRIBUTED = [
  { key: 'ALEX_INTRO_1', text: ALEX_INTRO_1 },
  { key: 'ALEX_INTRO_2', text: ALEX_INTRO_2 },
  { key: 'ALEX_INTRO_3', text: ALEX_INTRO_3 },
  { key: 'ALEX_INTRO_4', text: ALEX_INTRO_4 },
  { key: 'ALEX_INTRO_5', text: ALEX_INTRO_5 },
]

const JORDAN_INTROS = [
  { key: 'JORDAN_INTRO_1', text: JORDAN_INTRO_1 },
  { key: 'JORDAN_INTRO_2', text: JORDAN_INTRO_2 },
  { key: 'JORDAN_INTRO_3', text: JORDAN_INTRO_3 },
  { key: 'JORDAN_INTRO_4', text: JORDAN_INTRO_4 },
  { key: 'JORDAN_INTRO_5', text: JORDAN_INTRO_5 },
]

const INTRO_VISUAL_TIMELINE = {
  alex: {
    ALEX_INTRO_1: [
      { delay: 2500, duration: 2000, cue: { type: 'ai' } },
      { delay: 5000, duration: 2200, cue: { type: 'explore' } },
    ],
    ALEX_INTRO_2: [
      { delay: 3500, duration: 5500, cue: { type: 'search-documents' } },
      { delay: 9500, duration: 3000, cue: { type: 'verified-document' } },
    ],
    ALEX_INTRO_3: [
      { delay: 500, duration: 5000, cue: { type: 'topic-checklist' } },
      { delay: 8000, duration: 4000, cue: { type: 'save-sources' } },
    ],
    ALEX_INTRO_4: [
      { delay: 1800, duration: 5000, cue: { type: 'no-specific-trials' } },
    ],
    ALEX_INTRO_5: [],
  },
  jordan: {
    JORDAN_INTRO_1: [
      {
        delay: 1800,
        duration: 3500,
        cue: { type: 'jordan-guidance' },
      },
    ],

    JORDAN_INTRO_2: [
      {
        delay: 1800,
        duration: 6200,
        cue: { type: 'jordan-build-question' },
      },
    ],

    JORDAN_INTRO_3: [
      {
        delay: 1800,
        duration: 3000,
        cue: { type: 'jordan-help' },
      },
    ],

    JORDAN_INTRO_4: [
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
  const BASE_URL = 'http://127.0.0.1:8000'
  // const BASE_URL =
  //   'https://brcco3c42yqwcnqmvj4h2k2igu0fysxd.lambda-url.us-east-1.on.aws'

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

  // ---------------------------------------------------------------------
  // BEGIN HANDLING/DETERMINING OF CONDITIONS
  // ---------------------------------------------------------------------

  const requestedCondition = Number(searchParams.get('c') ?? 3)

  /*
   * Study conditions
   *
   * 0: Alex performs information foraging only
   * 1: Alex performs both information foraging and sensemaking
   * 2: Alex performs information foraging; Jordan performs sensemaking
   * 3: Alex performs information foraging; Jordan performs sensemaking
   *    with the new workspace
   */
  const CONDITION = {
    FORAGING_ONLY: 0,
    COMBINED: 1,
    DISTRIBUTED: 2,
    DISTRIBUTED_WORKSPACE: 3,
    COMBINED_WORKSPACE: 4,
  }

  const validConditions = Object.values(CONDITION)

  const condition = validConditions.includes(requestedCondition)
    ? requestedCondition
    : CONDITION.DISTRIBUTED_WORKSPACE

  const isForagingOnlyCondition = condition === CONDITION.FORAGING_ONLY

  const isCombinedCondition = condition === CONDITION.COMBINED

  const isDistributedCondition = condition === CONDITION.DISTRIBUTED

  const isDistributedWorkspaceCondition =
    condition === CONDITION.DISTRIBUTED_WORKSPACE

  const isCombinedWorkspaceCondition =
    condition === CONDITION.COMBINED_WORKSPACE

  const [activeRecipient, setActiveRecipient] = useState(null)

  // ---------------------------------------------------------------------
  // Capabilities
  // ---------------------------------------------------------------------

  const hasSensemaking = !isForagingOnlyCondition

  // Jordan exists only in conditions 2 and 3.
  const hasSeparateSensemakingCharacter =
    isDistributedCondition || isDistributedWorkspaceCondition

  // Alex performs sensemaking in conditions 1 and 4.
  const alexHandlesSensemaking =
    isCombinedCondition || isCombinedWorkspaceCondition

  // ---------------------------------------------------------------------
  // END HANDLING/DETERMINING OF CONDITIONS
  // ---------------------------------------------------------------------

  const doctorRef = useRef(null)
  const companionRef = useRef(null)
  const textareaRef = useRef(null)
  const introCueTimers = useRef([])
  const historyBodyRef = useRef(null)
  const sessionLoggedRef = useRef(false)
  const finishButtonLoggedRef = useRef(false)

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
  const SESSION_KEY = `mainInteractionSession-${participantId}-condition-${condition}`

  function getSavedSession() {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  }

  const savedSession = getSavedSession()
  const restoredInteractionRef = useRef(
    !!savedSession?.alexIntroDone || (savedSession?.messages?.length ?? 0) > 0,
  )
  const [savedResources, setSavedResources] = useState(
    savedSession?.savedResources ?? [],
  )
  const [adaptationProfile, setAdaptationProfile] = useState(
    savedSession?.adaptationProfile ?? { user_information: [] },
  )
  const [isIntroPlaying, setIsIntroPlaying] = useState(false)
  const [hideCharacterLoader, setHideCharacterLoader] = useState(false)
  const [charactersReady, setCharactersReady] = useState(false)
  const [charactersSettled, setCharactersSettled] = useState(false)
  const [alexSubtitle, setAlexSubtitle] = useState('')
  const [jordanSubtitle, setJordanSubtitle] = useState('')
  const [jordanCheckIn, setJordanCheckIn] = useState('')
  const introStartedRef = useRef(false)
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
  const [isAlexSpeaking, setIsAlexSpeaking] = useState(false)
  const [isJordanActive, setIsJordanActive] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [input, setInput] = useState(savedSession?.input ?? '')
  const [messages, setMessages] = useState(savedSession?.messages ?? [])
  const [transcript, setTranscript] = useState(savedSession?.transcript ?? [])
  const [introTranscript, setIntroTranscript] = useState(
    savedSession?.introTranscript ?? [],
  )
  const [isForaging, setIsForaging] = useState(false)
  const [isForagingFading, setIsForagingFading] = useState(false)
  const [startChecks, setStartChecks] = useState({
    volume: false,
    browser: false,
  })

  const [alexInstructionSpoken, setAlexInstructionSpoken] = useState(true)

  const [jordanInstructionSpoken, setJordanInstructionSpoken] = useState(
    savedSession?.jordanInstructionSpoken ?? false,
  )

  const hasJordanWorkspace =
    isDistributedWorkspaceCondition || isCombinedWorkspaceCondition

  const [showJordanWhiteboard, setShowJordanWhiteboard] = useState(false)

  const canStart = Object.values(startChecks).every(Boolean)

  useEffect(() => {
    const session = {
      audioReady,
      alexIntroDone,
      alexInstructionSpoken,
      jordanInstructionSpoken,
      input,
      messages,
      transcript,
      introTranscript,
      savedResources,
      adaptationProfile,
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  }, [
    SESSION_KEY,
    audioReady,
    alexIntroDone,
    alexInstructionSpoken,
    jordanInstructionSpoken,
    input,
    messages,
    transcript,
    introTranscript,
    savedResources,
    adaptationProfile,
  ])

  const completedAlexResponses = messages.filter(
    (message) =>
      message.from === 'alex' &&
      !message.isIntro &&
      !message.isInstruction &&
      !message.isSensemaking,
  ).length

  const showFinishButton = completedAlexResponses >= 1

  useEffect(() => {
    console.log('[Finish button check]', {
      completedAlexResponses,
      showFinishButton,
      alreadyLogged: finishButtonLoggedRef.current,
    })

    if (!showFinishButton) return
    if (finishButtonLoggedRef.current) return
    if (!participantId) return

    finishButtonLoggedRef.current = true

    logFinishButtonAppeared(participantId)
      .then((result) => {
        console.log('[Finish button appearance logged]', result)
      })
      .catch((error) => {
        console.error('Failed to log finish button appearance:', error)

        // Allow another render to retry if the request failed.
        finishButtonLoggedRef.current = false
      })
  }, [showFinishButton, completedAlexResponses, participantId])

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

        /*
         * Initialize & render characters
         *
         * Always initiate & render Alex
         * if hasSeparateSensemakingCharacter (Distributed condition)
         * then also init & render Jordan
         */
        await Promise.all([
          initDoctorCharacter(doctorRef.current),
          ...(hasSeparateSensemakingCharacter
            ? [initCompanionCharacter(companionRef.current)]
            : []),
        ])

        /* Wait until the initialized character canvases have rendered */
        await Promise.all([
          waitForCharacterRender(doctorRef.current),
          ...(hasSeparateSensemakingCharacter
            ? [waitForCharacterRender(companionRef.current)]
            : []),
        ])

        /* Reveal the character canvases behind the loading overlay */
        setCharactersReady(true)

        /* Let React paint the rendered avatars */
        await new Promise((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(resolve)
          })
        })

        /* Turn the characters toward each other when Jordan is present */
        if (hasSeparateSensemakingCharacter) {
          playGesture('jordanLookAtAlex')
          playGesture('alexLookAtJordan')
        }

        /* Give the turning gestures time to settle */
        await new Promise((resolve) => setTimeout(resolve, 1200))

        if (hasSeparateSensemakingCharacter) {
          playGesture('stopCompanionGesture')
        }
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

        if (hasSeparateSensemakingCharacter) {
          playGesture('jordanLookAtAlex')
        }

        const alexIntros = ALEX_INTROS_DISTRIBUTED

        for (const [index, intro] of alexIntros.entries()) {
          const introNumber = index + 1
          const { key: introFileName, text } = intro

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

          updateIntroTranscript('alex', text, {
            intro_part: introNumber,
            intro_key: introFileName,
            intro_character: 'alex',
          })

          scheduleIntroVisuals('alex', introFileName)

          let whiteboardRevealTimer = null

          if (
            isCombinedWorkspaceCondition &&
            introFileName === 'ALEX_INTRO_4_1_FORAGING_V2'
          ) {
            whiteboardRevealTimer = setTimeout(() => {
              setShowJordanWhiteboard(true)
            }, 3000)
          }

          await speakWithLipsyncStatic(
            `/intro-voices/doctor-audio-${introFileName}.mp3`,
            `/intro-voices/doctor-timestamps-${introFileName}.json`,
            'doctor',
            true,
            setAlexSubtitle,
          )

          if (whiteboardRevealTimer) {
            clearTimeout(whiteboardRevealTimer)
            setShowJordanWhiteboard(true)
          }

          clearIntroCues()
        }

        /* ---------------------------------------------------------------------- */
        /* Complete Alex intro or continue to Jordan                              */
        /* ---------------------------------------------------------------------- */

        setAlexSubtitle('')
        setIsAlexActive(false)

        if (hasSeparateSensemakingCharacter) {
          setIsJordanActive(true)

          playGesture('alexLookAtJordan')

          /* -------------------------------------------------------------------- */
          /* Jordan introduction                                                  */
          /* -------------------------------------------------------------------- */

          const jordanIntros = JORDAN_INTROS

          for (const [index, intro] of jordanIntros.entries()) {
            const introNumber = index + 1
            const { key: introFileName, text } = intro

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

            updateIntroTranscript('jordan', text, {
              intro_part: introNumber,
              intro_key: introFileName,
              intro_character: 'jordan',
            })

            scheduleIntroVisuals('jordan', introFileName)

            let whiteboardRevealTimer = null

            if (introFileName === 'JORDAN_INTRO_3') {
              whiteboardRevealTimer = setTimeout(() => {
                setShowJordanWhiteboard(true)
              }, 1800)
            }

            await speakWithLipsyncStatic(
              `/intro-voices/companion-audio-${introFileName}.mp3`,
              `/intro-voices/companion-timestamps-${introFileName}.json`,
              'companion',
              true,
              setJordanSubtitle,
            )

            if (whiteboardRevealTimer) {
              clearTimeout(whiteboardRevealTimer)
              setShowJordanWhiteboard(true)
            }

            clearIntroCues()
          }

          setJordanSubtitle('')
          setIsJordanActive(false)
          playGesture('stopCompanionGesture')
        } else {
          setIsJordanActive(false)
        }

        setIsIntroPlaying(false)
        setAlexIntroDone(true)

        logIntroFinished(participantId).catch((error) => {
          console.error('Failed to log intro completion:', error)
        })

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
    navigate('/notes-review', {
      state: {
        participantId,
        condition,
        savedResources,
      },
    })

    sessionStorage.removeItem(SESSION_KEY)
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

  /* ------------------------------------------------------------------------ */
  /* Jordan panel helpers                                                     */
  /* ------------------------------------------------------------------------ */

  function clearIntroCues() {
    introCueTimers.current.forEach(clearTimeout)
    introCueTimers.current = []
    setIntroCue(null)
  }

  function scheduleIntroVisuals(character, introKey) {
    clearIntroCues()

    const visualCues = INTRO_VISUAL_TIMELINE[character]?.[introKey] || []

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

  /* ------------------------------------------------------------------------ */
  /* Query support                                                            */
  /* ------------------------------------------------------------------------ */

  function handleInputChange(value) {
    setInput(value)
  }

  function handleToggleSavedResource(source) {
    const sourceKey = getSourceKey(source)

    setSavedResources((previous) => {
      const alreadySaved = previous.some(
        (savedSource) => getSourceKey(savedSource) === sourceKey,
      )

      if (alreadySaved) {
        updateTranscript('resource_unsaved', 'Resource unsaved', {
          source_key: sourceKey,
          source_title: source.title || source.file || null,
          source_organization: source.source || null,
          source_url: source.url || null,
          source_file: source.file || null,
          source_page_number: source.page_number ?? null,
          source_chunk_id: source.chunk_id ?? null,
        })

        incrementInteractionCount(participantId, 'source_save_count', -1).catch(
          (error) => {
            console.error('Source save count decrement failed:', error)
          },
        )

        return previous.filter(
          (savedSource) => getSourceKey(savedSource) !== sourceKey,
        )
      }

      updateTranscript('resource_saved', 'Resource saved', {
        source_key: sourceKey,
        source_title: source.title || source.file || null,
        source_organization: source.source || null,
        source_url: source.url || null,
        source_file: source.file || null,
        source_page_number: source.page_number ?? null,
        source_chunk_id: source.chunk_id ?? null,
      })

      incrementInteractionCount(participantId, 'source_save_count', 1).catch(
        (error) => {
          console.error('Source save count increment failed:', error)
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

  async function handleJordanSend(trimmed) {
    setInput('')
    setIsJordanActive(true)
    playGesture('alexLookAtJordan')
    playGesture('thinking')

    setMessages((prev) => [
      ...prev,
      {
        id: uid(),
        from: 'user',
        text: trimmed,
        recipient: 'jordan',
      },
    ])

    updateTranscript('user_to_jordan', trimmed)

    const recentAlexAnswer = [...messages]
      .reverse()
      .find(
        (message) =>
          message.from === 'alex' &&
          !message.isIntro &&
          !message.isInstruction &&
          !message.isSensemaking,
      )

    const recentUserQuestion = [...messages]
      .reverse()
      .find(
        (message) => message.from === 'user' && message.recipient !== 'jordan',
      )

    const jordanHistory = messages
      .filter(
        (message) =>
          (message.recipient === 'jordan' && message.from === 'user') ||
          (message.from === 'jordan' && message.isAdaptation),
      )
      .slice(-6)
      .map((message) => ({
        role: message.from === 'user' ? 'user' : 'assistant',
        content: message.text,
      }))

    try {
      const response = await fetch(`${BASE_URL}/jordan/adaptation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_feedback: trimmed,
          jordan_invitation: jordanCheckIn,
          user_question: recentUserQuestion?.text ?? null,
          alex_answer: recentAlexAnswer?.text ?? null,
          current_profile: adaptationProfile,
          jordan_history: jordanHistory,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          `Jordan request failed: ${response.status} ${JSON.stringify(data)}`,
        )
      }

      console.log('[JORDAN ADAPTATION RESPONSE]', data)

      setAdaptationProfile(data.updated_profile)

      if (data.side_conversation_done) {
        setActiveRecipient(null)
      }

      const jordanMsgId = uid()

      setMessages((prev) => [
        ...prev,
        {
          id: jordanMsgId,
          from: 'jordan',
          text: data.reply,
          isAdaptation: true,
        },
      ])

      updateTranscript('jordan_adaptation', data.reply, {
        user_feedback: trimmed,
        profile_changed: data.profile_changed,
        needs_followup: data.needs_followup,
        side_conversation_done: data.side_conversation_done,
        adaptation_profile: data.updated_profile,
      })

      await speakWithLipsync(
        data.reply,
        'companion',
        null,
        null,
        setJordanSubtitle,
      )
    } catch (error) {
      console.error('Jordan adaptation failed:', error)

      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          from: 'jordan',
          text: 'Sorry, I had trouble responding just now.',
          isAdaptation: true,
        },
      ])
    } finally {
      setJordanSubtitle('')
      setIsJordanActive(false)
      playGesture('stopCompanionGesture')
      playGesture('stopAlexGesture')
    }
  }

  async function generateJordanCheckIn(userQuestion, alexAnswer, answerScope) {
    try {
      console.log('[JORDAN CHECK-IN REQUEST]', {
        userQuestion,
        alexAnswer,
        answerScope,
        adaptationProfile,
      })

      const response = await fetch(`${BASE_URL}/jordan/invitation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_question: userQuestion,
          alex_answer: alexAnswer,
          alex_answer_scope: answerScope || 'general_answer',
          current_profile: adaptationProfile,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          `Jordan check-in failed: ${response.status} ${JSON.stringify(data)}`,
        )
      }

      console.log('[JORDAN INVITATION RESPONSE]', data)

      updateTranscript(
        'jordan_observation',
        data.potential_adaptation_signal
          ? 'Possible adaptation signal detected'
          : 'No adaptation signal detected',
        {
          potential_adaptation_signal: data.potential_adaptation_signal,
          signal: data.signal,
        },
      )

      setJordanCheckIn(data.question || '')
    } catch (error) {
      console.error('Jordan check-in failed:', error)
      setJordanCheckIn('')
    }
  }

  async function handleSend(e) {
    e.preventDefault()

    if (isAlexActive || isJordanActive) {
      return
    }

    const trimmed = input.trim()
    if (!trimmed) return

    if (activeRecipient === 'jordan') {
      await handleJordanSend(trimmed)
      return
    }

    updateTranscript('user', trimmed)

    incrementConversationTurns(participantId).catch((error) => {
      console.error('Conversation turn count update failed:', error)
    })

    clearIntroCues()
    setIsAlexActive(true)
    playGesture('startSwiping')
    setJordanCheckIn('')
    setShowCards(true)
    setAlexSources([])
    setAlexTalkingPoints([])

    if (hasSeparateSensemakingCharacter) {
      playGesture('jordanLookAtAlex')
    }

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
        .filter(
          (message) =>
            !message.isIntro &&
            !message.isInstruction &&
            !message.isSensemaking &&
            !message.isAdaptation &&
            message.recipient !== 'jordan' &&
            (message.from === 'user' || message.from === 'alex'),
        )
        .map((message) => ({
          role: message.from === 'user' ? 'user' : 'assistant',
          content: message.text,
        }))
      const response = await fetch(`${BASE_URL}/rag-chat-v3`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmed,
          history,
          adaptation_profile: adaptationProfile,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          `Alex request failed: ${response.status} ${JSON.stringify(data)}`,
        )
      }

      if (!data.answer) {
        throw new Error('Alex response did not include an answer.')
      }

      const nextSources = Array.isArray(data.sources) ? data.sources : []

      const nextTalkingPoints = Array.isArray(data.talking_points)
        ? data.talking_points
        : []

      console.log('[RAG CHAT V2 RESPONSE]', {
        status: response.status,
        answer: data.answer,
        answerScope: data.answer_scope,
        sourceCount: nextSources.length,
        talkingPointCount: nextTalkingPoints.length,
        sources: nextSources,
        talkingPoints: nextTalkingPoints,
      })

      setIsAlexSpeaking(true)

      try {
        await speakWithLipsync(
          data.answer,
          'doctor',
          null,
          () => {
            updateTranscript('alex_spoken', data.answer, {
              message_id: alexMsgId,
              sources: nextSources,
              talking_points: nextTalkingPoints,
              confidence: data.confidence ?? null,
              answer_scope: data.answer_scope || 'general_answer',
            })

            setAlexTalkingPoints(nextTalkingPoints)
            setShowCards(false)
            playGesture('stopSwiping')

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
                talkingPoints: nextTalkingPoints,
                sources: nextSources,
                explanation: data.relevance_explanation,
                confidence: data.confidence,
                answer_scope: data.answer_scope || 'general_answer',
              },
            ])
          },
          setAlexSubtitle,
        )
      } finally {
        setIsAlexSpeaking(false)
      }
      setAlexSources(nextSources)
      setAlexSubtitle('')
      playGesture('stopAlexGesture')
      playGesture('stopCompanionGesture')
      setIsAlexActive(false)

      // Alex is done speaking, so visually deselect him immediately.
      setActiveRecipient(null)

      if (hasSeparateSensemakingCharacter) {
        await generateJordanCheckIn(trimmed, data.answer, data.answer_scope)
      }

      if (hasSeparateSensemakingCharacter) {
        if (condition === CONDITION.DISTRIBUTED) {
          playGesture('stopCompanionGesture')
        }
      }

      // After alex's first answer explain the sources stuff
      if (!alexInstructionSpoken) {
        setAlexInstructionSpoken(true)

        setMessages((previous) => [
          ...previous,
          {
            id: uid(),
            from: 'alex',
            text: ALEX_INSTRUCTION_FORAGING,
            sources: [],
            isInstruction: true,
          },
        ])

        updateTranscript('alex_instruction_spoken', ALEX_INSTRUCTION_FORAGING)

        try {
          await new Promise((resolve) => setTimeout(resolve, 500))
          await speakWithLipsyncStatic(
            '/intro-voices/doctor-audio-ALEX_INSTRUCTION_FORAGING.mp3',
            '/intro-voices/doctor-timestamps-ALEX_INSTRUCTION_FORAGING.json',
            'doctor',
            true,
            setAlexSubtitle,
          )
        } catch (error) {
          console.error('Alex instruction speech failed:', error)
        }

        setAlexSubtitle('')
      }
    } catch (err) {
      console.error(err)

      setIsAlexActive(false)
      if (hasSeparateSensemakingCharacter) {
        playGesture('stopCompanionGesture')
      }
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
          <h1>
            {hasSeparateSensemakingCharacter
              ? 'Chat with Virtual Characters'
              : 'Chat with a Virtual Character'}
          </h1>

          <div className="mi-start-information">
            In this activity, you'll learn about clinical trials with the help
            of{' '}
            <strong>
              {hasSeparateSensemakingCharacter
                ? 'two virtual characters: Alex and Jordan'
                : 'a virtual character: Alex'}
            </strong>
            .
            <div className="character-images-row">
              <div>
                <img
                  src={alex}
                  className="character-preview"
                  alt="Alex character"
                />
                <p>Alex</p>
              </div>
              {hasSeparateSensemakingCharacter && (
                <div>
                  <img
                    src={jordan}
                    className="character-preview"
                    alt="Jordan character"
                  />
                  <p>Jordan</p>
                </div>
              )}
            </div>
            {hasSeparateSensemakingCharacter ? 'They' : 'Alex'} will provide{' '}
            <strong>general information</strong> and help you explore questions
            about clinical trial participation. <br /> <br />
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
    <div className="mi-root main-interaction1">
      <div className="tool-header">
        <img src={logo} className="logo" alt="Study logo" />
        <h2>Clinical Trials Education</h2>
        <h1>
          {hasSeparateSensemakingCharacter
            ? 'Chat with Virtual Characters'
            : 'Chat with a Virtual Character'}
        </h1>
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
            alexHandlesSensemaking={alexHandlesSensemaking}
            hasSeparateSensemakingCharacter={hasSeparateSensemakingCharacter}
            charactersReady={charactersReady}
            doctorRef={doctorRef}
            companionRef={companionRef}
            isAlexActive={isAlexActive}
            isJordanActive={isJordanActive}
            sources={alexSources}
            showCards={showCards}
            introCue={introCue}
            isForaging={isForaging}
            isForagingFading={isForagingFading}
            alexSubtitle={alexSubtitle}
            jordanSubtitle={jordanSubtitle}
            isIntroPlaying={isIntroPlaying}
            talkingPoints={alexTalkingPoints}
            savedResources={savedResources}
            onToggleSavedResource={handleToggleSavedResource}
            isAlexSpeaking={isAlexSpeaking}
            activeRecipient={activeRecipient}
            showJordanFeedbackBubble={
              hasSeparateSensemakingCharacter && completedAlexResponses > 0
            }
            jordanCheckIn={jordanCheckIn}
            adaptationProfile={adaptationProfile}
            showJordanWhiteboard={showJordanWhiteboard}
          />

          <ChatInput
            input={input}
            textareaRef={textareaRef}
            onChange={handleInputChange}
            onSubmit={handleSend}
            disabled={isAlexActive || isJordanActive}
            onHandleKeyDown={handleKeyDown}
            activeRecipient={activeRecipient}
            setActiveRecipient={setActiveRecipient}
          />
        </section>
      </main>

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
          aria-label={
            hasSeparateSensemakingCharacter
              ? 'Preparing the virtual characters'
              : 'Preparing the virtual character'
          }
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

            <h2>
              {hasSeparateSensemakingCharacter
                ? 'Preparing Alex and Jordan'
                : 'Preparing Alex'}
            </h2>
            <p>
              {hasSeparateSensemakingCharacter
                ? 'Getting the virtual characters ready...'
                : 'Getting the virtual character ready...'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Render helpers                                                             */
/* -------------------------------------------------------------------------- */

function AlexHeader({
  alexHandlesSensemaking,
  hasSeparateSensemakingCharacter,
  charactersReady,
  doctorRef,
  companionRef,
  isAlexActive,
  isJordanActive,
  sources,
  showCards,
  introCue,
  isForaging,
  isForagingFading,
  alexSubtitle,
  jordanSubtitle,
  isIntroPlaying,
  talkingPoints,
  savedResources,
  onToggleSavedResource,
  isAlexSpeaking,
  activeRecipient,
  showJordanFeedbackBubble,
  jordanCheckIn,
  adaptationProfile,
  showJordanWhiteboard,
}) {
  const uniqueSources = dedupeSources(sources)
  const introVisualClass = (extraClass = '') =>
    `alex-intro-visual-card ${extraClass} ${
      introCue?.isExiting ? 'alex-intro-visual-exiting' : ''
    }`

  /*
   * Keep Jordan visually centered while speaking OR while the workspace is open.
   * Alex speaking takes priority so the two focus states do not compete.
   */
  const isAlexFocused =
    isAlexActive || (!isJordanActive && activeRecipient === 'alex')

  const isJordanFocused =
    hasSeparateSensemakingCharacter &&
    !isAlexActive &&
    (isJordanActive || activeRecipient === 'jordan')

  return (
    <div
      className={`mi-chat-header mi-shared-character-stage
    ${hasSeparateSensemakingCharacter ? '' : 'mi-shared-character-stage-solo'}
    ${charactersReady ? 'characters-ready' : 'characters-loading'}
    ${isAlexActive ? 'alex-speaking' : ''}
    ${isJordanFocused ? 'jordan-speaking' : ''}
  `}
    >
      <div
        className="mi-shared-stage-background"
        style={{ backgroundImage: `url(${stageBackground})` }}
      />

      <div
        className={`mi-character-zone mi-character-zone-alex
            ${!hasSeparateSensemakingCharacter ? 'mi-character-zone-alex-solo' : ''}
            ${isAlexFocused ? 'mi-character-zone-speaking' : ''}
            ${isJordanFocused ? 'mi-character-zone-listening' : ''}
        `}
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

              <div
                className={`alex-foraging-card alex-foraging-card-2 ${
                  hasSeparateSensemakingCharacter
                    ? ''
                    : 'alex-solo-foraging-card'
                }`}
              >
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
            introCue?.type === 'save-sources' && (
              <div
                className={introVisualClass(
                  'alex-intro-icon-group alex-intro-ai',
                )}
              >
                <FontAwesomeIcon
                  className="alex-intro-icon alex-intro-icon-1"
                  icon={faBookmarkSolid}
                />
                <FontAwesomeIcon
                  className="alex-intro-icon alex-intro-icon-2"
                  icon={faCheck}
                />
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

          {introCue?.character === 'alex' &&
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

          {introCue?.character === 'alex' &&
            introCue?.type === 'jordan-help' && (
              <div
                className={introVisualClass(
                  'jordan-intro-icon-group jordan-intro-visual jordan-intro-perspectives',
                )}
              >
                <FontAwesomeIcon
                  className="jordan-intro-icon jordan-intro-item"
                  icon={faHandPointer}
                  size="2x"
                />

                <FontAwesomeIcon
                  className="jordan-intro-icon jordan-intro-item"
                  icon={faClipboardList}
                  size="2x"
                />
              </div>
            )}

          {talkingPoints?.length > 0 && (
            <div
              className={`alex-talking-points ${isAlexActive ? 'lower' : ''}`}
            >
              {talkingPoints.slice(0, 3).map((point, index) => (
                <div key={`${point}-${index}`} className="alex-talking-point">
                  <span className="alex-talking-point-number">{index + 1}</span>
                  <span>{point}</span>
                </div>
              ))}
            </div>
          )}

          {sources?.length > 0 && (
            <div className="alex-source-panel">
              <div className="alex-source-panel-header">
                <span className="alex-source-label">Sources</span>
              </div>

              <div className="alex-source-card-row">
                {uniqueSources.slice(0, 3).map((source) => {
                  const isSaved = savedResources.some(
                    (savedSource) =>
                      getSourceKey(savedSource) === getSourceKey(source),
                  )

                  return (
                    <div
                      key={getSourceKey(source)}
                      className={`alex-source-card ${isSaved ? 'is-saved' : ''}`}
                    >
                      <div className="alex-source-card-content">
                        <span className="alex-source-card-badge">
                          {source.source === 'ClinicalTrials.gov'
                            ? 'ClinicalTrials.gov'
                            : source.source || 'Source'}
                        </span>

                        <span className="alex-source-card-title">
                          {source.title || source.file || 'Trusted resource'}
                        </span>
                      </div>

                      <button
                        type="button"
                        className={`alex-source-save-btn ${
                          isSaved ? 'is-saved' : ''
                        }`}
                        onClick={() => onToggleSavedResource?.(source)}
                        aria-pressed={isSaved}
                        aria-label={
                          isSaved ? 'Remove saved resource' : 'Save resource'
                        }
                      >
                        <FontAwesomeIcon
                          icon={isSaved ? faBookmarkSolid : faBookmarkRegular}
                        />

                        <span>{isSaved ? 'Saved' : 'Read Later'}</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        <div className="mi-character-label mi-character-label-alex">
          <span>Information Guide</span>
          <strong>Alex</strong>
        </div>
      </div>

      {hasSeparateSensemakingCharacter && (
        <div
          className={`mi-character-zone mi-character-zone-jordan
            ${isJordanFocused ? 'mi-character-zone-speaking' : ''}
            ${isAlexFocused ? 'mi-character-zone-listening' : ''}
        `}
        >
          {showJordanWhiteboard && (
            <div className="jordan-user-info-board">
              <div className="jordan-user-info-board-header">
                What Jordan is keeping in mind
              </div>

              {adaptationProfile?.user_information?.length > 0 ? (
                <div className="jordan-user-info-list">
                  {adaptationProfile.user_information.map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="jordan-user-info-item"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="jordan-user-info-empty">
                  Nothing yet — Jordan will learn what matters to you as you
                  talk.
                </div>
              )}
            </div>
          )}
          <div className="mi-character-content">
            <div
              className="virtual-companion"
              id="virtualcompanion"
              ref={companionRef}
            />

            {showJordanFeedbackBubble &&
              jordanCheckIn &&
              !isAlexActive &&
              !isIntroPlaying && (
                <div className="jordan-feedback-bubble">{jordanCheckIn}</div>
              )}

            {jordanSubtitle && (
              <div className="character-subtitle character-subtitle-jordan">
                {jordanSubtitle}
              </div>
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
              introCue?.type === 'jordan-help' && (
                <div
                  className={introVisualClass(
                    'jordan-intro-icon-group jordan-intro-visual jordan-intro-perspectives',
                  )}
                >
                  <FontAwesomeIcon
                    className="jordan-intro-icon jordan-intro-item"
                    icon={faHandPointer}
                    size="2x"
                  />
                  <FontAwesomeIcon
                    className="jordan-intro-icon jordan-intro-item"
                    icon={faClipboardList}
                    size="2x"
                  />
                </div>
              )}
          </div>

          <div className="mi-character-label mi-character-label-jordan">
            <span>Exploration Guide</span>
            <strong>Jordan</strong>
          </div>
        </div>
      )}
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
  activeRecipient,
  setActiveRecipient,
}) {
  return (
    <div className="full-input-area">
      <div className="recipient-area">
        <p>You are talking to:</p>
        <button
          type="button"
          className={`talk-to-alex ${
            activeRecipient === 'alex' ? 'selected' : ''
          }`}
          onClick={() => setActiveRecipient('alex')}
        >
          Alex
        </button>
        <button
          type="button"
          className={`talk-to-jordan ${
            activeRecipient === 'jordan' ? 'selected' : ''
          }`}
          onClick={() => setActiveRecipient('jordan')}
        >
          Jordan
        </button>
      </div>
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
                ? 'Please wait for the virtual character to finish speaking...'
                : activeRecipient === 'alex'
                  ? 'Ask Alex a question...'
                  : activeRecipient === 'jordan'
                    ? 'Discuss with Jordan...'
                    : 'Choose who you would like to talk to above to start typing.'
            }
            rows={3}
            disabled={disabled || activeRecipient === null}
            onKeyDown={onHandleKeyDown}
          />
        </div>

        <button
          type="submit"
          className="send-button"
          disabled={disabled || activeRecipient === null || !input.trim()}
        >
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
                aria-pressed={isSaved}
                aria-label={isSaved ? 'Remove saved resource' : 'Save resource'}
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
