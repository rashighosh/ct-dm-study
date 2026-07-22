import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import logo from '../assets/logo-transparent.png'
import alex from '../assets/alex.png'
import jordan from '../assets/jordan.png'
import '../css/MainInteraction1.css'
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
  faHandPointer,
  faPlus,
  faTrash,
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
const ALEX_INTRO_1_FORAGING_COMBINED =
  "Hi there, I'm Alex! I am an AI powered virtual character here to help you explore and understand clinical trial participation."
const ALEX_INTRO_2 =
  "I'll explain my role first. I'm a virtual assistant that can quickly search information across several trusted health resources to answer questions about clinical trial participation. I pull from reputable sources like the National Cancer Institute."
const ALEX_INTRO_3 =
  'These sources cover information such as the purpose and importance of clinical trials, and topics such as safety and costs. As I answer your questions, I will also share the sources I use that you can save to read later if you want.'
const ALEX_INTRO_4 =
  "One important thing to note is that I don't have information on specific clinical trials, so I can't help you find a trial to join or answer questions about a particular study."
const ALEX_INTRO_4_1_FORAGING =
  "As you explore, I'll also keep track of the information you discover and try to connect related ideas. I'll also suggest directions to explore to continue building your understanding."
const ALEX_INTRO_4_2_FORAGING =
  "In between me answering your questions, you can click on me to hear my thoughts and revisit what you've learned so far."
const ALEX_INTRO_5 = "Now, I'll hand it over to Jordan."
const ALEX_INTRO_5_FORAGING_COMBINED =
  "Alright, whenever you're ready, ask me anything you'd like to know about clinical trials!"

const JORDAN_INTRO_1 =
  "Thanks, Alex! As Alex mentioned, I'm Jordan. I'm a virtual companion here to provide useful guidance during your search process."
const JORDAN_INTRO_2 =
  "As you explore, I'll keep track of the information you discover and try to connect related ideas. I'll also suggest directions to explore to continue building your understanding."
const JORDAN_INTRO_3 =
  "In between Alex answering your questions, you can click on me to hear my thoughts and revisit what you've learned so far."
const JORDAN_INTRO_4 =
  "Whenever you're ready, ask Alex anything you'd like to know about clinical trials!"
const JORDAN_INTRO_2_V2 =
  "As you explore, I'll keep track of the information you discover and try to connect related ideas on this white board behind me."
const JORDAN_INTRO_3_V2 =
  'In between Alex answering your questions, you can open the board to edit any notes I take.'

const ALEX_INSTRUCTION_FORAGING =
  "Here are the sources I used. Remember, you can save any of them to read later, and I'll keep sharing my sources throughout our conversation."

const JORDAN_INSTRUCTION =
  "This is where I'll keep track of important ideas and how they fit together as you chat with Alex. Remember, you can click on me at any time to take a look!"

const ALEX_INSTRUCTION_SENSEMAKING =
  "This is where I'll keep track of important ideas and how they fit together as you chat with Alex. Remember, you can click on me at any time to take a look!"

const ALEX_INTROS_DISTRIBUTED = [
  {
    key: 'ALEX_INTRO_1',
    text: ALEX_INTRO_1,
  },
  {
    key: 'ALEX_INTRO_2',
    text: ALEX_INTRO_2,
  },
  {
    key: 'ALEX_INTRO_3',
    text: ALEX_INTRO_3,
  },
  {
    key: 'ALEX_INTRO_4',
    text: ALEX_INTRO_4,
  },
  {
    key: 'ALEX_INTRO_5',
    text: ALEX_INTRO_5,
  },
]

const ALEX_INTROS_FORAGING_ONLY = [
  {
    key: 'ALEX_INTRO_1_FORAGING_COMBINED',
    text: ALEX_INTRO_1_FORAGING_COMBINED,
  },
  {
    key: 'ALEX_INTRO_2',
    text: ALEX_INTRO_2,
  },
  {
    key: 'ALEX_INTRO_3',
    text: ALEX_INTRO_3,
  },
  {
    key: 'ALEX_INTRO_4',
    text: ALEX_INTRO_4,
  },
  {
    key: 'ALEX_INTRO_5_FORAGING_COMBINED',
    text: ALEX_INTRO_5_FORAGING_COMBINED,
  },
]

const ALEX_INTROS_COMBINED = [
  {
    key: 'ALEX_INTRO_1_FORAGING_COMBINED',
    text: ALEX_INTRO_1_FORAGING_COMBINED,
  },
  {
    key: 'ALEX_INTRO_2',
    text: ALEX_INTRO_2,
  },
  {
    key: 'ALEX_INTRO_3',
    text: ALEX_INTRO_3,
  },
  {
    key: 'ALEX_INTRO_4',
    text: ALEX_INTRO_4,
  },
  {
    key: 'ALEX_INTRO_4_1_FORAGING',
    text: ALEX_INTRO_4_1_FORAGING,
  },
  {
    key: 'ALEX_INTRO_4_2_FORAGING',
    text: ALEX_INTRO_4_2_FORAGING,
  },
  {
    key: 'ALEX_INTRO_5_FORAGING_COMBINED',
    text: ALEX_INTRO_5_FORAGING_COMBINED,
  },
]

const JORDAN_INTROS = [
  {
    key: 'JORDAN_INTRO_1',
    text: JORDAN_INTRO_1,
  },
  {
    key: 'JORDAN_INTRO_2',
    text: JORDAN_INTRO_2,
  },
  {
    key: 'JORDAN_INTRO_3',
    text: JORDAN_INTRO_3,
  },
  {
    key: 'JORDAN_INTRO_4',
    text: JORDAN_INTRO_4,
  },
]

const JORDAN_INTROS_WORKSPACE = [
  {
    key: 'JORDAN_INTRO_1',
    text: JORDAN_INTRO_1,
  },
  {
    key: 'JORDAN_INTRO_2_V2',
    text: JORDAN_INTRO_2_V2,
  },
  {
    key: 'JORDAN_INTRO_3_V2',
    text: JORDAN_INTRO_3_V2,
  },
  {
    key: 'JORDAN_INTRO_4',
    text: JORDAN_INTRO_4,
  },
]

const INTRO_VISUAL_TIMELINE = {
  alex: {
    ALEX_INTRO_1: [
      { delay: 2500, duration: 2000, cue: { type: 'ai' } },
      { delay: 5000, duration: 2200, cue: { type: 'explore' } },
    ],
    ALEX_INTRO_1_FORAGING_COMBINED: [
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
    ALEX_INTRO_4_1_FORAGING: [
      {
        delay: 1800,
        duration: 6200,
        cue: { type: 'jordan-build-question' },
      },
    ],

    ALEX_INTRO_4_2_FORAGING: [
      {
        delay: 1800,
        duration: 3000,
        cue: { type: 'jordan-help' },
      },
    ],
    ALEX_INTRO_5: [],
    ALEX_INTRO_5_FORAGING_COMBINED: [],
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
  }

  const validConditions = Object.values(CONDITION)

  const condition = validConditions.includes(requestedCondition)
    ? requestedCondition
    : CONDITION.DISTRIBUTED_WORKSPACE

  const isForagingOnlyCondition = condition === CONDITION.FORAGING_ONLY

  const isCombinedCondition = condition === CONDITION.COMBINED

  const isDistributedCondition =
    condition === CONDITION.DISTRIBUTED ||
    condition === CONDITION.DISTRIBUTED_WORKSPACE

  const isDistributedWorkspaceCondition =
    condition === CONDITION.DISTRIBUTED_WORKSPACE

  // Capabilities
  const hasSensemaking = !isForagingOnlyCondition
  const hasSeparateSensemakingCharacter = isDistributedCondition
  const alexHandlesSensemaking = isCombinedCondition
  const hasJordanWorkspace = isDistributedWorkspaceCondition

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
  const [isSensemakingActive, setIsSensemakingActive] = useState(false)
  const [jordanConversationModel, setJordanConversationModel] = useState(() => {
    const savedModel = savedSession?.jordanConversationModel

    if (Array.isArray(savedModel?.themes)) {
      const cleanedThemes = savedModel.themes.map((theme) => ({
        ...theme,
        details: (theme.details || []).map((detail) => ({
          ...detail,
          source_question: detail.source_question ?? '',
          source_answer: detail.source_answer ?? '',
        })),
      }))

      return {
        themes: cleanedThemes,
        latestConnection: savedModel.latestConnection ?? null,
      }
    }

    return {
      themes: [],
      latestConnection: null,
    }
  })
  const [isJordanWorkspaceOpen, setIsJordanWorkspaceOpen] = useState(false)
  const [showJordanWhiteboard, setShowJordanWhiteboard] = useState(
    savedSession?.showJordanWhiteboard ?? false,
  )
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
  const [introTranscript, setIntroTranscript] = useState(
    savedSession?.introTranscript ?? [],
  )
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

  const [alexInstructionSpoken, setAlexInstructionSpoken] = useState(
    savedSession?.alexInstructionSpoken ?? false,
  )

  const [jordanInstructionSpoken, setJordanInstructionSpoken] = useState(
    savedSession?.jordanInstructionSpoken ?? false,
  )

  const [
    alexSensemakingInstructionSpoken,
    setAlexSensemakingInstructionSpoken,
  ] = useState(savedSession?.alexSensemakingInstructionSpoken ?? false)

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
      jordanGuidance,
      showJordanWhiteboard,
      savedResources,
      previousJordanGuidanceTypes: previousJordanGuidanceTypes.current,
      previousJordanGuidanceMessages: previousJordanGuidanceMessages.current,
      jordanConversationModel,
      alexSensemakingInstructionSpoken,
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
    jordanGuidance,
    savedResources,
    jordanConversationModel,
    alexSensemakingInstructionSpoken,
    showJordanWhiteboard,
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

        const alexIntros = hasSeparateSensemakingCharacter
          ? ALEX_INTROS_DISTRIBUTED
          : alexHandlesSensemaking
            ? ALEX_INTROS_COMBINED
            : ALEX_INTROS_FORAGING_ONLY

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

          await speakWithLipsyncStatic(
            `/intro-voices/doctor-audio-${introFileName}.mp3`,
            `/intro-voices/doctor-timestamps-${introFileName}.json`,
            'doctor',
            true,
            setAlexSubtitle,
          )

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

          const jordanIntros = hasJordanWorkspace
            ? JORDAN_INTROS_WORKSPACE
            : JORDAN_INTROS

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

            if (hasJordanWorkspace && introFileName === 'JORDAN_INTRO_2_V2') {
              whiteboardRevealTimer = setTimeout(() => {
                setShowJordanWhiteboard(true)
              }, 5600)
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
        jordanConversationModel,
      },
    })

    sessionStorage.removeItem(SESSION_KEY)
  }

  /* ------------------------------------------------------------------------ */
  /* Logging helpers                                                    */
  /* ------------------------------------------------------------------------ */

  function logWorkspaceAction(action) {
    const fieldByAction = {
      add: 'workspace_add_click_count',
      edit: 'workspace_edit_click_count',
      delete: 'workspace_delete_click_count',
    }

    const field = fieldByAction[action]

    if (!field) {
      console.error('Unknown workspace action:', action)
      return
    }

    incrementInteractionCount(participantId, field).catch((error) => {
      console.error(`Workspace ${action} count update failed:`, error)
    })

    updateTranscript(
      'sensemaking_workspace_edit_action',
      `${action} action used in sensemaking workspace`,
      {
        action,
        interaction_type: 'workspace_edit',
        interaction_source: 'workspace',
        sensemaking_actor: alexHandlesSensemaking ? 'alex' : 'jordan',
      },
    )
  }

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

  function clearSensemakingUI() {
    setJordanGuidance(null)
    setIsJordanGuidanceLoading(false)
    setIsJordanWorkspaceOpen(false)
    setIsSensemakingActive(false)

    if (hasSeparateSensemakingCharacter) {
      playGesture('stopCompanionGesture')
    }
  }

  async function updateJordanTurn({
    userQuestion,
    alexAnswer,
    alexAnswerScope,
    history,
    currentModel,
  }) {
    const response = await fetch(`${BASE_URL}/jordan-turn-update-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_question: userQuestion,
        alex_answer: alexAnswer,
        alex_answer_scope: alexAnswerScope || 'general_answer',
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

  async function handleSensemakingClick() {
    if (isAlexActive || isJordanActive || isForaging) return

    /*
     * Condition 3:
     * On the very first Jordan click, open the whiteboard and explain it.
     * Do this before requiring jordanGuidance.
     */
    if (
      hasSeparateSensemakingCharacter &&
      hasJordanWorkspace &&
      !jordanInstructionSpoken
    ) {
      setIsSensemakingActive(true)

      setIsJordanActive(true)

      playGesture('stopCompanionGesture')
      playGesture('alexLookAtJordan')

      setMessages((previous) => [
        ...previous,
        {
          id: uid(),
          from: 'jordan',
          text: JORDAN_INSTRUCTION,
          isInstruction: true,
        },
      ])

      updateTranscript(
        'sensemaking_workspace_action',
        'opened jordan sensemaking workspace',
        {
          action: 'opened',
          interaction_type: 'workspace',
          interaction_source: 'thought_bubble',
          sensemaking_actor: 'jordan',
          guidance_id: jordanGuidance?.id ?? null,
          guidance_type: jordanGuidance?.guidance_type ?? null,
          first_workspace_click: true,
        },
      )

      updateTranscript('jordan_instruction_spoken', JORDAN_INSTRUCTION)

      incrementInteractionCount(participantId, 'sensemaking_click_count').catch(
        (error) => {
          console.error('Sensemaking click count update failed:', error)
        },
      )

      try {
        await new Promise((resolve) => setTimeout(resolve, 500))

        await speakWithLipsyncStatic(
          '/intro-voices/companion-audio-JORDAN_INSTRUCTION.mp3',
          '/intro-voices/companion-timestamps-JORDAN_INSTRUCTION.json',
          'companion',
          true,
          setJordanSubtitle,
        )
        setJordanInstructionSpoken(true)
      } catch (error) {
        console.error('Jordan instruction speech failed:', error)
      } finally {
        setJordanSubtitle('')
        setIsJordanActive(false)
        setIsJordanWorkspaceOpen(true)
        playGesture('stopCompanionGesture')
        playGesture('stopAlexGesture')
        setIsSensemakingActive(true)
      }

      return
    }

    /*
     * Normal Jordan guidance requires guidance to be available.
     */
    if (!jordanGuidance) return

    const sensemakingActor = alexHandlesSensemaking ? 'alex' : 'jordan'
    const shouldSpeak = !jordanGuidance.hasSpoken

    setIsSensemakingActive(true)
    setIsJordanWorkspaceOpen(false)

    if (hasSeparateSensemakingCharacter) {
      playGesture('stopCompanionGesture')
    } else {
      playGesture('stopAlexGesture')
    }

    const interactionType =
      hasJordanWorkspace || alexHandlesSensemaking ? 'workspace' : 'guidance'

    updateTranscript(
      interactionType === 'workspace'
        ? 'sensemaking_workspace_action'
        : 'sensemaking_guidance_action',
      interactionType === 'workspace'
        ? `opened ${sensemakingActor} sensemaking workspace`
        : `requested ${sensemakingActor} sensemaking guidance`,
      {
        action: interactionType === 'workspace' ? 'opened' : 'requested',
        interaction_type: interactionType,
        interaction_source: 'thought_bubble',
        sensemaking_actor: sensemakingActor,
        guidance_id: jordanGuidance.id,
        guidance_type: jordanGuidance.guidance_type,
        spoke_guidance: shouldSpeak,
        theme_id: jordanGuidance.theme_id,
        theme_label: jordanGuidance.theme_label,
        detail_id: jordanGuidance.detail_id,
        earlier_detail_id: jordanGuidance.earlier_detail_id,
        earlier_question_reference: jordanGuidance.earlier_question_reference,
        connection_label: jordanGuidance.connection_label,
      },
    )

    incrementInteractionCount(participantId, 'sensemaking_click_count').catch(
      (error) => {
        console.error('Sensemaking click count update failed:', error)
      },
    )

    /*
     * Guidance was already spoken.
     * Reopen the appropriate workspace without speaking again.
     */
    if (!shouldSpeak) {
      if (hasJordanWorkspace || alexHandlesSensemaking) {
        setIsJordanWorkspaceOpen(true)

        if (hasSeparateSensemakingCharacter) {
          playGesture('stopCompanionGesture')
          playGesture('stopAlexGesture')
          setIsJordanActive(true)
        } else {
          setIsAlexActive(true)
        }
      }

      return
    }

    if (hasSeparateSensemakingCharacter) {
      playGesture('stopCompanionGesture')
      playGesture('alexLookAtJordan')
      setIsJordanActive(true)
    } else {
      playGesture('stopAlexGesture')
      setIsAlexActive(true)
    }

    setJordanGuidance((previous) =>
      previous
        ? {
            ...previous,
            hasSpoken: true,
          }
        : previous,
    )

    try {
      await speakWithLipsync(
        jordanGuidance.jordan_message,
        alexHandlesSensemaking ? 'doctor' : 'companion',
        null,
        () => {
          setMessages((previous) => [
            ...previous,
            {
              id: uid(),
              guidanceId: jordanGuidance.id,
              from: sensemakingActor,
              isSensemaking: true,
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
            'sensemaking_guidance_spoken',
            jordanGuidance.jordan_message,
            {
              sensemaking_actor: sensemakingActor,
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
        alexHandlesSensemaking ? setAlexSubtitle : setJordanSubtitle,
      )

      /*
       * Condition 1:
       * Alex explains the sensemaking workspace after the first guidance.
       */
      if (alexHandlesSensemaking && !alexSensemakingInstructionSpoken) {
        setAlexSensemakingInstructionSpoken(true)

        setMessages((previous) => [
          ...previous,
          {
            id: uid(),
            from: 'alex',
            text: ALEX_INSTRUCTION_SENSEMAKING,
            isInstruction: true,
          },
        ])

        await new Promise((resolve) => setTimeout(resolve, 500))

        updateTranscript(
          'alex_sensemaking_instruction_spoken',
          ALEX_INSTRUCTION_SENSEMAKING,
        )

        setIsJordanWorkspaceOpen(true)
        playGesture('stopCompanionGesture')
        playGesture('stopAlexGesture')

        try {
          await speakWithLipsyncStatic(
            '/intro-voices/doctor-audio-ALEX_INSTRUCTION_SENSEMAKING.mp3',
            '/intro-voices/doctor-timestamps-ALEX_INSTRUCTION_SENSEMAKING.json',
            'doctor',
            true,
            setAlexSubtitle,
          )
        } catch (error) {
          console.error('Alex sensemaking instruction speech failed:', error)
        }

        setAlexSubtitle('')
      }
    } catch (error) {
      console.error('Jordan guidance speech failed:', error)
    } finally {
      setJordanSubtitle('')
      setAlexSubtitle('')

      if (hasSeparateSensemakingCharacter) {
        playGesture('stopCompanionGesture')
        playGesture('stopAlexGesture')

        if (hasJordanWorkspace) {
          playGesture('lookright')
        }
      } else {
        playGesture('stopAlexGesture')
        playGesture('alexLookAtJordan')
      }

      if (hasJordanWorkspace || alexHandlesSensemaking) {
        setIsJordanWorkspaceOpen(true)
      } else {
        setIsJordanWorkspaceOpen(false)
        setIsJordanActive(false)
        setIsSensemakingActive(false)
      }
    }
  }

  async function handleWorkspaceToggle() {
    if (!isJordanWorkspaceOpen && !jordanInstructionSpoken) {
      await handleSensemakingClick()
      return
    }

    setIsJordanWorkspaceOpen((current) => {
      const willOpen = !current

      updateTranscript(
        'sensemaking_workspace_action',
        `${willOpen ? 'opened' : 'closed'} jordan sensemaking workspace`,
        {
          action: willOpen ? 'opened' : 'closed',
          interaction_type: 'workspace',
          interaction_source: 'workspace_button',
          sensemaking_actor: 'jordan',
          guidance_id: jordanGuidance?.id ?? null,
          guidance_type: jordanGuidance?.guidance_type ?? null,
        },
      )

      if (willOpen) {
        setIsSensemakingActive(true)

        playGesture('stopCompanionGesture')
        setIsJordanActive(false)

        incrementInteractionCount(
          participantId,
          'sensemaking_click_count',
        ).catch((error) => {
          console.error('Sensemaking click count update failed:', error)
        })
      } else {
        setIsSensemakingActive(false)

        playGesture('stopCompanionGesture')
        setIsJordanActive(false)
        setIsAlexActive(false)
      }

      return willOpen
    })
  }

  function dismissJordanGuidance() {
    if (jordanGuidance) {
      const sensemakingActor = alexHandlesSensemaking ? 'alex' : 'jordan'

      updateTranscript(
        'sensemaking_workspace_action',
        `closed ${sensemakingActor} sensemaking workspace`,
        {
          action: 'closed',
          sensemaking_actor: sensemakingActor,
          guidance_id: jordanGuidance.id,
          guidance_type: jordanGuidance.guidance_type,
        },
      )
    }

    setIsSensemakingActive(false)
    setIsJordanWorkspaceOpen(false)
    setIsAlexActive(false)

    if (hasSeparateSensemakingCharacter) {
      playGesture('stopCompanionGesture')
      setIsJordanActive(false)
    }

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

    if (
      isAlexActive ||
      isJordanActive ||
      isJordanGuidanceLoading ||
      isJordanWorkspaceOpen
    ) {
      return
    }

    const trimmed = input.trim()
    if (!trimmed) return

    updateTranscript('user', trimmed)

    incrementConversationTurns(participantId).catch((error) => {
      console.error('Conversation turn count update failed:', error)
    })

    clearIntroCues()
    setIsAlexActive(true)
    playGesture('startSwiping')
    setShowCards(true)
    setAlexSources([])
    setAlexTalkingPoints([])

    if (hasSensemaking) {
      clearSensemakingUI()
    }

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
            (message.from === 'user' || message.from === 'alex'),
        )
        .map((message) => ({
          role: message.from === 'user' ? 'user' : 'assistant',
          content: message.text,
        }))
      const response = await fetch(`${BASE_URL}/rag-chat-v2`, {
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

      setIsSensemakingActive(false)

      let jordanTurnPromise = Promise.resolve(null)

      /*
       * Preserve the exact workspace model sent to Jordan.
       * We use this later to identify the newly returned detail.
       */
      const jordanModelSnapshot = jordanConversationModel

      if (hasSensemaking) {
        setIsJordanGuidanceLoading(true)

        console.log('*** ALEX ANSWER SCOPE:', data.answer_scope)

        jordanTurnPromise = updateJordanTurn({
          userQuestion: trimmed,
          alexAnswer: data.answer,
          alexAnswerScope: data.answer_scope,
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
          .finally(() => {
            setIsJordanGuidanceLoading(false)
          })
      }

      console.log('Sources', data.sources)

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
          // This runs when the audio is ready and Alex is about to speak.

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
      setAlexSources(nextSources)
      setAlexSubtitle('')
      playGesture('stopAlexGesture')
      setIsAlexActive(false)

      if (hasSeparateSensemakingCharacter) {
        if (condition === CONDITION.DISTRIBUTED) {
          playGesture('thinking')
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

        if (
          hasSeparateSensemakingCharacter &&
          condition === CONDITION.DISTRIBUTED_WORKSPACE
        ) {
          playGesture('thinkingTurn')
        }

        /*
         * Find the detail that exists in the updated model but did not exist
         * in the model sent to Jordan.
         *
         * Do not use source_question here because the backend intentionally
         * leaves source_question empty.
         */
        const previousDetailIds = new Set(
          (jordanModelSnapshot?.themes || []).flatMap((theme) =>
            (theme.details || []).map((detail) => detail.id),
          ),
        )

        const allUpdatedDetails = updatedThemes.flatMap((theme) =>
          (theme.details || []).map((detail) => ({
            ...detail,
            themeId: theme.id,
            themeLabel: theme.label,
          })),
        )

        const newestDetail =
          allUpdatedDetails.find(
            (detail) => !previousDetailIds.has(detail.id),
          ) || null

        console.log('[Jordan newest board detail]', {
          expectedNewDetail: newestDetail,
          previousDetailIds: [...previousDetailIds],
          returnedDetails: allUpdatedDetails,
        })

        if (!newestDetail) {
          const previousDetailCount = (
            jordanModelSnapshot?.themes || []
          ).reduce((count, theme) => count + (theme.details?.length || 0), 0)

          const updatedDetailCount = updatedThemes.reduce(
            (count, theme) => count + (theme.details?.length || 0),
            0,
          )

          console.warn('[Jordan returned no detectable new detail]', {
            question: trimmed,
            previousDetailCount,
            updatedDetailCount,
            previousThemes: jordanModelSnapshot?.themes || [],
            returnedThemes: updatedThemes,
            jordanTurnData,
          })
        }

        /*
         * Store the visible guidance separately.
         * The sensemaking character will present it when clicked.
         */
        const guidanceWithId = {
          id: uid(),
          guidance_type: jordanTurnData.guidance_type,
          jordan_message: jordanTurnData.jordan_message,
          alex_answer_scope: data.answer_scope || 'general_answer',

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

        const sensemakingActor = alexHandlesSensemaking ? 'alex' : 'jordan'

        updateTranscript(
          'sensemaking_turn_updated',
          jordanTurnData.jordan_message,
          {
            sensemaking_actor: sensemakingActor,
            guidance_id: guidanceWithId.id,
            guidance_type: jordanTurnData.guidance_type,
            alex_answer_scope: data.answer_scope || 'general_answer',

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
          },
        )
      }
    } catch (err) {
      console.error(err)

      setIsAlexActive(false)
      if (hasSensemaking) {
        setIsJordanGuidanceLoading(false)
      }
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
    <div className="mi-root">
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
            hasJordanWorkspace={hasJordanWorkspace}
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
            jordanGuidance={jordanGuidance}
            dismissJordanGuidance={dismissJordanGuidance}
            isJordanWorkspaceOpen={isJordanWorkspaceOpen}
            onSensemakingClick={handleSensemakingClick}
            onToggleWorkspaceEditing={handleWorkspaceToggle}
            talkingPoints={alexTalkingPoints}
            jordanConversationModel={jordanConversationModel}
            onUpdateJordanConversationModel={setJordanConversationModel}
            savedResources={savedResources}
            onToggleSavedResource={handleToggleSavedResource}
            isSensemakingActive={isSensemakingActive}
            onWorkspaceAction={logWorkspaceAction}
            showJordanWhiteboard={showJordanWhiteboard}
          />

          <ChatInput
            input={input}
            textareaRef={textareaRef}
            isJordanWorkspaceOpen={isJordanWorkspaceOpen}
            onChange={handleInputChange}
            onSubmit={handleSend}
            disabled={
              isAlexActive ||
              isJordanActive ||
              isJordanGuidanceLoading ||
              isJordanWorkspaceOpen
            }
            onHandleKeyDown={handleKeyDown}
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

function LiveJordanWorkspace({
  conversationModel,
  guidance,
  isOpen = false,
  onToggleEditing,
  onUpdateConversationModel,
  onWorkspaceAction,
}) {
  const themes = conversationModel?.themes || []
  const latestConnection = conversationModel?.latestConnection || null
  const [editingKey, setEditingKey] = useState(null)
  const themeNoteRefs = useRef({})

  function updateThemes(updater) {
    onUpdateConversationModel?.((currentModel) => ({
      ...(currentModel || {}),
      themes: updater(currentModel?.themes || []),
    }))
  }

  function updateTheme(themeId, patch) {
    updateThemes((currentThemes) =>
      currentThemes.map((theme) =>
        theme.id === themeId ? { ...theme, ...patch } : theme,
      ),
    )
  }

  function updateDetail(themeId, detailId, text) {
    updateThemes((currentThemes) =>
      currentThemes.map((theme) =>
        theme.id === themeId
          ? {
              ...theme,
              details: (theme.details || []).map((detail) =>
                detail.id === detailId ? { ...detail, text } : detail,
              ),
            }
          : theme,
      ),
    )
  }

  function deleteDetail(themeId, detailId) {
    updateThemes((currentThemes) =>
      currentThemes.map((theme) =>
        theme.id === themeId
          ? {
              ...theme,
              details: (theme.details || []).filter(
                (detail) => detail.id !== detailId,
              ),
            }
          : theme,
      ),
    )

    onWorkspaceAction?.('delete')
  }

  function addPersonalNote(themeId) {
    const detailId = uid()

    updateThemes((currentThemes) =>
      currentThemes.map((theme) =>
        theme.id === themeId
          ? {
              ...theme,
              details: [
                ...(theme.details || []),
                {
                  id: detailId,
                  text: 'Add your own note',
                  source_question: null,
                  source_answer: null,
                  is_user_note: true,
                },
              ],
            }
          : theme,
      ),
    )

    onWorkspaceAction?.('add')
    setEditingKey(`detail:${detailId}`)
  }

  function toggleEditing() {
    setEditingKey(null)
    onToggleEditing?.()
  }

  useEffect(() => {
    const newDetailId = guidance?.detail_id

    if (!newDetailId) return

    const updatedTheme = themes.find((theme) =>
      (theme.details || []).some((detail) => detail.id === newDetailId),
    )

    if (!updatedTheme) return

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const note = themeNoteRefs.current[updatedTheme.id]

        note?.scrollTo({
          top: note.scrollHeight,
          behavior: 'smooth',
        })
      })
    })
  }, [guidance?.detail_id, themes])

  return (
    <aside
      className={`jordan-live-workspace jordan-whiteboard-reveal ${
        isOpen ? 'is-open is-editing' : ''
      }`}
      aria-label="Jordan's live workspace"
    >
      <div className="jordan-live-workspace-header">
        <div>
          <strong>Live Workspace Notes</strong>
          <span>
            I'll take notes here as you explore information with Alex!
          </span>
        </div>

        <button
          type="button"
          className="jordan-live-workspace-edit-btn"
          onClick={(event) => {
            event.stopPropagation()
            toggleEditing()
          }}
          aria-pressed={isOpen}
        >
          <FontAwesomeIcon icon={isOpen ? faCheck : faExpand} />
          <span>{isOpen ? 'Done' : 'Open'}</span>
        </button>
      </div>

      {themes.length > 0 && (
        <div className="jordan-live-theme-list">
          {themes.slice(0, 3).map((theme) => {
            const details = theme.details || []
            const labelKey = `label:${theme.id}`

            return (
              <div className="jordan-live-theme-row" key={theme.id}>
                <section
                  className="jordan-live-theme"
                  ref={(element) => {
                    if (element) {
                      themeNoteRefs.current[theme.id] = element
                    } else {
                      delete themeNoteRefs.current[theme.id]
                    }
                  }}
                >
                  <div className="jordan-live-detail-list">
                    {details.map((detail) => {
                      const detailKey = `detail:${detail.id}`
                      const isEditingDetail = isOpen && editingKey === detailKey

                      return (
                        <div
                          className={`jordan-live-detail ${
                            guidance?.detail_id === detail.id ? 'is-new' : ''
                          } ${isEditingDetail ? 'is-being-edited' : ''}`}
                          key={detail.id}
                        >
                          {isEditingDetail ? (
                            <div className="jordan-live-detail-editor">
                              <textarea
                                autoFocus
                                data-workspace-detail-id={detail.id}
                                value={detail.text || ''}
                                onChange={(event) =>
                                  updateDetail(
                                    theme.id,
                                    detail.id,
                                    event.target.value,
                                  )
                                }
                                onBlur={(event) => {
                                  if (
                                    event.relatedTarget?.closest(
                                      '.jordan-live-detail-delete',
                                    )
                                  ) {
                                    return
                                  }

                                  setEditingKey(null)
                                }}
                                rows={3}
                                aria-label="Edit idea"
                              />

                              <button
                                type="button"
                                className="jordan-live-detail-delete"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() =>
                                  deleteDetail(theme.id, detail.id)
                                }
                                aria-label="Remove idea"
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="jordan-live-detail-editable"
                              disabled={!isOpen}
                              onClick={() => {
                                setEditingKey(detailKey)
                                onWorkspaceAction?.('edit')
                              }}
                            >
                              <span>{detail.text || 'Add your note'}</span>

                              {detail.savedResources?.length > 0 && (
                                <div className="jordan-live-detail-resources">
                                  {detail.savedResources.map((resource) => (
                                    <div
                                      className="jordan-live-detail-resource"
                                      key={getSourceKey(resource)}
                                    >
                                      <FontAwesomeIcon icon={faBookmarkSolid} />

                                      <span>
                                        {resource.title ||
                                          resource.file ||
                                          resource.source ||
                                          'Saved resource'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {isOpen && (
                                <div className="edit-icon-area">
                                  <FontAwesomeIcon icon={faPenToSquare} />
                                  <span>Edit</span>
                                </div>
                              )}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {isOpen && (
                    <button
                      type="button"
                      className="jordan-live-add-note"
                      onClick={() => addPersonalNote(theme.id)}
                    >
                      <FontAwesomeIcon icon={faPlus} />
                      <span>Add note</span>
                    </button>
                  )}
                </section>

                <div className="jordan-live-theme-title">
                  {isOpen && editingKey === labelKey ? (
                    <input
                      className="jordan-live-theme-input"
                      autoFocus
                      value={theme.label || ''}
                      onChange={(event) =>
                        updateTheme(theme.id, {
                          label: event.target.value,
                        })
                      }
                      onBlur={() => setEditingKey(null)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.currentTarget.blur()
                        }
                      }}
                      aria-label="Edit theme name"
                    />
                  ) : (
                    <button
                      type="button"
                      className="jordan-live-theme-editable"
                      disabled={!isOpen}
                      onClick={() => {
                        setEditingKey(labelKey)
                        onWorkspaceAction?.('edit')
                      }}
                    >
                      <strong>{theme.label || 'New theme'}</strong>

                      {isOpen && (
                        <div className="edit-icon-area">
                          <FontAwesomeIcon icon={faPenToSquare} />
                          <span>Edit</span>
                        </div>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {latestConnection?.text && (
        <div className="jordan-live-connection">
          <FontAwesomeIcon icon={faDiagramProject} />
          <div>
            <span>Connection Found</span>
            <p>{latestConnection.text}</p>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="jordan-live-edit-hint">
          Select any theme or note to edit it.
        </div>
      )}
    </aside>
  )
}

function SensemakingExplorationCard({
  guidance,
  conversationModel,
  onUpdateConversationModel,
  onDismiss,
}) {
  const themes = conversationModel?.themes || []
  const latestConnection = conversationModel?.latestConnection || null
  const [editingKey, setEditingKey] = useState(null)

  function updateThemes(updater) {
    onUpdateConversationModel?.((currentModel) => ({
      ...(currentModel || {}),
      themes: updater(currentModel?.themes || []),
    }))
  }

  function updateTheme(themeId, patch) {
    updateThemes((currentThemes) =>
      currentThemes.map((theme) =>
        theme.id === themeId ? { ...theme, ...patch } : theme,
      ),
    )
  }

  function updateDetail(themeId, detailId, text) {
    updateThemes((currentThemes) =>
      currentThemes.map((theme) =>
        theme.id === themeId
          ? {
              ...theme,
              details: (theme.details || []).map((detail) =>
                detail.id === detailId ? { ...detail, text } : detail,
              ),
            }
          : theme,
      ),
    )
  }

  function deleteDetail(themeId, detailId) {
    updateThemes((currentThemes) =>
      currentThemes.map((theme) =>
        theme.id === themeId
          ? {
              ...theme,
              details: (theme.details || []).filter(
                (detail) => detail.id !== detailId,
              ),
            }
          : theme,
      ),
    )
  }

  function addPersonalNote(themeId) {
    const detailId = uid()

    updateThemes((currentThemes) =>
      currentThemes.map((theme) =>
        theme.id === themeId
          ? {
              ...theme,
              details: [
                ...(theme.details || []),
                {
                  id: detailId,
                  text: 'Add your own note',
                  source_question: null,
                  source_answer: null,
                  is_user_note: true,
                },
              ],
            }
          : theme,
      ),
    )

    setEditingKey(`detail:${detailId}`)
  }

  return (
    <div
      className="jordan-exploration-card jordan-workspace-drawer"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="jordan-workspace-drawer-header">
        <div>
          <span>Shared workspace</span>
          <h3>Edit what Jordan organized</h3>
        </div>
        <button type="button" onClick={onDismiss} aria-label="Close workspace">
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>

      {latestConnection?.text && (
        <div className="jordan-workspace-drawer-connection">
          <FontAwesomeIcon icon={faDiagramProject} />
          <p>{latestConnection.text}</p>
        </div>
      )}

      <div className="jordan-workspace-drawer-body">
        {themes.length === 0 ? (
          <div className="jordan-workspace-drawer-empty">
            Ask Alex a question and Jordan will begin organizing the answer.
          </div>
        ) : (
          themes.map((theme) => {
            const labelKey = `label:${theme.id}`

            return (
              <section className="jordan-workspace-drawer-theme" key={theme.id}>
                {editingKey === labelKey ? (
                  <input
                    autoFocus
                    value={theme.label || ''}
                    onChange={(event) =>
                      updateTheme(theme.id, { label: event.target.value })
                    }
                    onBlur={() => setEditingKey(null)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') event.currentTarget.blur()
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="jordan-workspace-drawer-theme-title"
                    onClick={() => setEditingKey(labelKey)}
                  >
                    <strong>{theme.label || 'Untitled theme'}</strong>
                    <FontAwesomeIcon icon={faPenToSquare} />
                  </button>
                )}

                <div className="jordan-workspace-drawer-notes">
                  {(theme.details || []).map((detail) => {
                    const detailKey = `detail:${detail.id}`

                    return (
                      <div
                        className="jordan-workspace-drawer-note"
                        key={detail.id}
                      >
                        {editingKey === detailKey ? (
                          <textarea
                            autoFocus
                            value={detail.text || ''}
                            onChange={(event) =>
                              updateDetail(
                                theme.id,
                                detail.id,
                                event.target.value,
                              )
                            }
                            onBlur={() => setEditingKey(null)}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingKey(detailKey)}
                          >
                            {detail.text}
                          </button>
                        )}

                        <button
                          type="button"
                          className="jordan-workspace-drawer-delete"
                          onClick={() => deleteDetail(theme.id, detail.id)}
                          aria-label="Remove idea"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    )
                  })}
                </div>

                <button
                  type="button"
                  className="jordan-workspace-drawer-add"
                  onClick={() => addPersonalNote(theme.id)}
                >
                  <FontAwesomeIcon icon={faPlus} />
                  Add note
                </button>
              </section>
            )
          })
        )}
      </div>
    </div>
  )
}

function AlexHeader({
  alexHandlesSensemaking,
  hasSeparateSensemakingCharacter,
  hasJordanWorkspace,
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
  jordanGuidance,
  dismissJordanGuidance,
  isJordanWorkspaceOpen,
  onSensemakingClick,
  onToggleWorkspaceEditing,
  talkingPoints,
  jordanConversationModel,
  onUpdateJordanConversationModel,
  savedResources,
  onToggleSavedResource,
  isSensemakingActive,
  onWorkspaceAction,
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
  const isJordanFocused =
    hasSeparateSensemakingCharacter &&
    !isAlexActive &&
    (isJordanActive || isJordanWorkspaceOpen)

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
    ${isAlexActive ? 'mi-character-zone-speaking' : ''}
    ${isJordanFocused ? 'mi-character-zone-listening' : ''}
    ${
      alexHandlesSensemaking && isJordanWorkspaceOpen
        ? 'mi-character-zone-workspace-open'
        : ''
    }
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

          {alexHandlesSensemaking &&
            jordanGuidance &&
            !isJordanWorkspaceOpen &&
            !isAlexActive && (
              <button
                type="button"
                className="jordan-workspace-trigger alex-workspace-trigger"
                onClick={(event) => {
                  event.stopPropagation()
                  onSensemakingClick?.()
                }}
              >
                <FontAwesomeIcon icon={faLightbulb} />
                <span>How this information fits</span>
              </button>
            )}

          {alexHandlesSensemaking &&
            jordanGuidance &&
            isJordanWorkspaceOpen && (
              <SensemakingExplorationCard
                guidance={jordanGuidance}
                conversationModel={jordanConversationModel}
                onUpdateConversationModel={onUpdateJordanConversationModel}
                onDismiss={dismissJordanGuidance}
              />
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
              className={`alex-talking-points ${
                isSensemakingActive ? 'is-hidden' : ''
              }`}
            >
              {talkingPoints.slice(0, 3).map((point, index) => (
                <div key={`${point}-${index}`} className="alex-talking-point">
                  <span className="alex-talking-point-number">{index + 1}</span>
                  <span>{point}</span>
                </div>
              ))}
            </div>
          )}

          {!isSensemakingActive && sources?.length > 0 && (
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
    ${isAlexActive ? 'mi-character-zone-listening' : ''}
    ${
      hasJordanWorkspace && isJordanWorkspaceOpen
        ? 'mi-character-zone-workspace-open'
        : ''
    }
  `}
          onClick={(event) => {
            /*
             * Do not treat clicks inside the whiteboard as clicks on Jordan.
             */
            if (event.target.closest('.jordan-live-workspace')) return

            onSensemakingClick?.()
          }}
        >
          <div className="mi-character-content">
            {hasJordanWorkspace && showJordanWhiteboard && (
              <LiveJordanWorkspace
                conversationModel={jordanConversationModel}
                guidance={jordanGuidance}
                isOpen={isJordanWorkspaceOpen}
                onToggleEditing={onToggleWorkspaceEditing}
                onUpdateConversationModel={onUpdateJordanConversationModel}
                onWorkspaceAction={onWorkspaceAction}
              />
            )}

            <div
              className="virtual-companion virtual-companion-clickable"
              id="virtualcompanion"
              ref={companionRef}
              role="button"
              tabIndex={0}
              aria-label="Hear Jordan's thoughts"
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSensemakingClick?.()
                }
              }}
            />

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
  isJordanWorkspaceOpen,
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
              isJordanWorkspaceOpen
                ? 'Close the workspace to continue chatting with Alex.'
                : disabled
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
