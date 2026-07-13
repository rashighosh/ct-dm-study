import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
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
} from '@fortawesome/free-solid-svg-icons'
import { faLightbulb } from '@fortawesome/free-regular-svg-icons'
import {
  initCompanionCharacter,
  initDoctorCharacter,
  playGesture,
  speakWithLipsync,
  speakWithLipsyncStatic,
} from '../character.js'
import SwipingCards from './SwipingCards'
import { logMainInteraction } from '../api/logging.js'

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
  const BASE_URL = 'http://127.0.0.1:8000'
  // const BASE_URL =
  //   'https://brcco3c42yqwcnqmvj4h2k2igu0fysxd.lambda-url.us-east-1.on.aws'

  const location = useLocation()

  // Load goals from session storage
  const initialGoals =
    location.state ||
    JSON.parse(sessionStorage.getItem('mainInteractionGoals') || '{}')

  const goals = initialGoals

  useEffect(() => {
    const image = new Image()
    image.src = stageBackground

    if (image.decode) {
      image.decode().catch(() => {
        // The browser can still display it even if decode() rejects.
      })
    }
  }, [])

  useEffect(() => {
    if (location.state) {
      sessionStorage.setItem(
        'mainInteractionGoals',
        JSON.stringify(location.state),
      )
    }
  }, [location.state])

  const selectedGoalObjects = goals.selectedGoalObjects || []

  const goalObjects = [
    ...selectedGoalObjects,
    ...(goals.customGoals || []).map((goal) => ({
      id: goal.id,
      title: goal.label,
      description: null,
      custom: true,
    })),
  ]

  const doctorRef = useRef(null)
  const companionRef = useRef(null)
  const textareaRef = useRef(null)
  const previousJordanSuggestions = useRef(new Set())
  const introCueTimers = useRef([])
  const historyBodyRef = useRef(null)

  const participantId = goals?.participantId || 'test-participant'

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

  const restoredInteractionRef = useRef(
    !!savedSession?.alexIntroDone || (savedSession?.messages?.length ?? 0) > 0,
  )
  const [isIntroPlaying, setIsIntroPlaying] = useState(false)
  const [hideCharacterLoader, setHideCharacterLoader] = useState(false)
  const [charactersReady, setCharactersReady] = useState(false)
  const [charactersSettled, setCharactersSettled] = useState(false)
  const [alexSubtitle, setAlexSubtitle] = useState('')
  const [jordanSubtitle, setJordanSubtitle] = useState('')
  const introStartedRef = useRef(false)
  const [showCollabQuestionPrompt, setShowCollabQuestionPrompt] =
    useState(false)
  const [collabQuestionPromptText, setCollabQuestionPromptText] = useState(null)
  const [activeSourcePopout, setActiveSourcePopout] = useState(null)
  const [introCue, setIntroCue] = useState(null)
  const [audioReady, setAudioReady] = useState(
    savedSession?.audioReady ?? false,
  )
  const [pendingGoalNotes, setPendingGoalNotes] = useState({})
  const [showCards, setShowCards] = useState(false)
  const [alexIntroDone, setAlexIntroDone] = useState(
    savedSession?.alexIntroDone ?? false,
  )
  const [collabSuggestion, setCollabSuggestion] = useState(null)
  const [goalNotes, setGoalNotes] = useState(savedSession?.goalNotes ?? {})
  const [alexSources, setAlexSources] = useState([])
  const [isAlexActive, setIsAlexActive] = useState(false)
  const [isJordanActive, setIsJordanActive] = useState(false)
  const [proactivity] = useState(goals?.proactivity || 'passive')
  const [showHistory, setShowHistory] = useState(false)
  const [input, setInput] = useState(savedSession?.input ?? '')
  const [coveredGoals, setCoveredGoals] = useState(
    () => new Set(savedSession?.coveredGoals ?? []),
  )
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
      goalNotes,
      input,
      coveredGoals: Array.from(coveredGoals),
      messages,
      transcript,
      jordanGuidance,
      previousJordanGuidanceTypes: previousJordanGuidanceTypes.current,
      previousJordanGuidanceMessages: previousJordanGuidanceMessages.current,
    }

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  }, [
    SESSION_KEY,
    audioReady,
    alexIntroDone,
    goalNotes,
    input,
    coveredGoals,
    messages,
    transcript,
    jordanGuidance,
  ])

  const hasSentFirstMessage = messages.some((m) => m.from === 'user')

  const goalLabels = goalObjects.map((goal) => goal.title)

  const allGoalsCovered =
    goalObjects.length > 0 &&
    goalObjects.every((goal) => coveredGoals.has(goal.id))

  const completedAlexResponses = messages.filter(
    (m) => m.from === 'alex',
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
        playGesture('lookleft')
        playGesture('lookrightalex')

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

        playGesture('lookleft')
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
        playGesture('lookrightalex')

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

  useEffect(() => {
    if (proactivity !== 'passive') return
    if (!alexIntroDone) return

    const timer = setTimeout(async () => {
      let suggestion = 'What should I know first about clinical trials?'

      try {
        suggestion = await generateJordanOpeningSuggestion()
      } catch (err) {
        console.log('Opening Jordan suggestion failed:', err)
      }

      const openingSuggestion = {
        id: uid(),
        type: 'query',
        isOpeningSuggestion: true,
        text: "Here's a question you could ask to get started.",
        suggestion,
        source: 'passive_opening_suggestion',
      }

      logJordanSuggestion(openingSuggestion)

      setCollabSuggestion((prev) => {
        if (prev?.isOpeningSuggestion) return prev
        return openingSuggestion
      })
    }, 900)

    return () => clearTimeout(timer)
  }, [proactivity, alexIntroDone])

  /* ------------------------------------------------------------------------ */
  /* Navigation                                               */
  /* ------------------------------------------------------------------------ */

  const navigate = useNavigate()

  function handleContinue() {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem('mainInteractionGoals')
    navigate('/notes-review', {
      state: {
        participantId,
        condition: goals?.condition,
        goalObjects,
        goalLabels,
        goalNotes,
        coveredGoals: Array.from(coveredGoals),
        proactivity,
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
      condition: proactivity,
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
    setCollabSuggestion(null)
    setJordanGuidance(null)
    setIsJordanGuidanceLoading(false)
  }

  async function generateJordanExplorationGuidance({
    userQuestion,
    alexAnswer,
    history,
  }) {
    const response = await fetch(`${BASE_URL}/jordan-exploration-guidance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_question: userQuestion,
        alex_answer: alexAnswer,
        history,
        previous_guidance_types: previousJordanGuidanceTypes.current,
        previous_guidance_messages: previousJordanGuidanceMessages.current,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()

      throw new Error(`Jordan guidance failed: ${response.status} ${errorText}`)
    }

    return response.json()
  }

  async function generateJordanOpeningSuggestion() {
    let suggestion = 'What should I know first about clinical trials?'

    try {
      const firstJordanPrompt = `
      You are Jordan, a helpful virtual companion helping a patient start a conversation with Doctor Alex about clinical trial participation concepts.

      The user's goals are:
      Goals: 
      ${JSON.stringify(goalObjects, null, 2)}
      Already covered goals:
      ${JSON.stringify(
        goalObjects.filter((goal) => coveredGoals.has(goal.id)),
        null,
        2,
      )}

            Previous Jordan suggestions:
      ${JSON.stringify(Array.from(previousJordanSuggestions.current), null, 2)}

      Write ONE short question the user could ask Doctor Alex.
      Rules:
      - Make it specific to one of the user's goals.
      - Write at a 4th–5th grade reading level.
      - Use short, everyday words.
      - Use the user's voice.
      - Use first-person wording when natural, like "Can I...", "Will I...", "How do I...", or "What happens if I..."
      - Ask about a real detail, worry, choice, or next step.
      - Do not just turn the goal title into a question.
      - Do not imply the user is already in a trial, choosing a trial, eligible for a trial, or getting trial care.
      - Avoid: "this trial", "the trial", "my trial", "this study", "for me", "would I qualify", and "what if treatment doesn't work for me".
      - Do not repeat or closely copy a previous Jordan suggestion or the user's latest question.
      - Return only the question, with no quotes.
    `

      const response = await fetch(`${BASE_URL}/simple-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: firstJordanPrompt }),
      })

      const data = await response.json()
      suggestion = data.reply || suggestion
    } catch (err) {
      console.log('Jordan suggestion failed:', err)
    }

    return suggestion
  }

  /* ------------------------------------------------------------------------ */
  /* Query support                                                            */
  /* ------------------------------------------------------------------------ */

  async function handleCollabQueryHelp() {
    if (isAlexActive) return

    setShowCollabQuestionPrompt(false)
    setCollabQuestionPromptText(null)
    setCollabSuggestion({
      id: uid(),
      type: 'query',
      text: 'Want help thinking of a question to ask Alex?',
      suggestion: null,
      loading: true,
      source: 'collab_manual_query_help',
    })

    const suggestion = await generateJordanOpeningSuggestion()

    const manualSuggestion = {
      id: uid(),
      type: 'query',
      text: 'Here is a question I would ask based on your goals.',
      suggestion,
      source: 'collab_manual_query_help',
    }

    logJordanSuggestion(manualSuggestion)
    setCollabSuggestion(manualSuggestion)
  }

  function handleInputChange(value) {
    setInput(value)
  }

  function handleJordanLensSelect(lens) {
    if (!jordanGuidance) return

    const starter = jordanGuidance.sentence_starter?.trim() || ''

    const nextInput = starter ? `${starter} ${lens}` : lens

    setInput(nextInput)
    textareaRef.current?.focus()

    updateTranscript('jordan_guidance_action', 'selected lens', {
      action: 'lens_selected',
      guidance_id: jordanGuidance.id,
      guidance_type: jordanGuidance.guidance_type,
      selected_lens: lens,
    })
  }

  function dismissJordanGuidance() {
    if (jordanGuidance) {
      updateTranscript('jordan_guidance_action', 'dismissed guidance', {
        action: 'dismissed',
        guidance_id: jordanGuidance.id,
        guidance_type: jordanGuidance.guidance_type,
      })
    }

    setJordanGuidance(null)
  }

  function acceptCollabSuggestion() {
    if (!collabSuggestion?.suggestion) return

    updateTranscript('jordan_suggestion_action', 'used suggestion', {
      action: 'used',
      suggestion_id: collabSuggestion.id,
      suggested_question: collabSuggestion.suggestion,
      suggestion_type: collabSuggestion.type,
    })

    setInput(collabSuggestion.suggestion)
    textareaRef.current?.focus()

    setCollabSuggestion((prev) =>
      prev
        ? {
            ...prev,
            resolved: true,
            resolution: 'used',
          }
        : prev,
    )
  }

  function dismissCollabSuggestion() {
    if (collabSuggestion) {
      updateTranscript('jordan_suggestion_action', 'dismissed suggestion', {
        action: 'dismissed',
        suggestion_id: collabSuggestion.id,
        suggested_question: collabSuggestion.suggestion || null,
      })
    }

    setCollabSuggestion(null)
  }

  /* ------------------------------------------------------------------------ */
  /* Evaluation/check-in support                                              */
  /* ------------------------------------------------------------------------ */

  function addGoalNote(goalId, noteText, sources = [], markCovered = true) {
    if (!noteText) return

    const savedSources = dedupeSources(sources)
      .slice(0, 2)
      .map((source) => ({
        id: source.id || uid(),
        title: source.title || source.source || source.file || 'Trusted source',
        url: source.url || null,
        file: source.file || null,
        source: source.source || null,
        content: source.content || null,
        relevance_explanation: source.relevance_explanation || null,
      }))

    setGoalNotes((prev) => ({
      ...prev,
      [goalId]: [
        ...(prev[goalId] || []),
        {
          id: uid(),
          text: noteText,
          sources: savedSources,
        },
      ],
    }))

    if (markCovered) {
      setCoveredGoals((prev) => new Set(prev).add(goalId))
    }
  }

  function markGoalCovered(goalId) {
    setCoveredGoals((prev) => {
      const next = new Set(prev)
      next.add(goalId)
      return next
    })
  }

  function toggleGoalCovered(goalId) {
    setCoveredGoals((prev) => {
      const next = new Set(prev)
      if (next.has(goalId)) {
        next.delete(goalId)
      } else {
        next.add(goalId)
      }
      return next
    })
  }

  function acceptCollabGoal(goalId) {
    markGoalCovered(goalId)

    updateTranscript('goal_marked', 'Goal marked complete', {
      goal_id: goalId,
      suggestion_id: collabSuggestion?.id || null,
    })
  }

  function dismissCollabGoal(goalId) {
    updateTranscript('goal_dismissed', 'Goal not marked complete', {
      goal_id: goalId,
      suggestion_id: collabSuggestion?.id || null,
    })
  }

  function saveCollabNote(goalId, noteText, sources) {
    addGoalNote(goalId, noteText, sources, false)

    updateTranscript('note_marked', 'Note saved', {
      goal_id: goalId,
      note_text: noteText,
      suggestion_id: collabSuggestion?.id || null,
      sources: sources || [],
    })
  }

  function dismissCollabNote(goalId, noteText) {
    updateTranscript('note_dismissed', 'Note dismissed', {
      goal_id: goalId,
      note_text: noteText,
      suggestion_id: collabSuggestion?.id || null,
    })
  }

  function logCollabExtraSuggestion(suggestion) {
    if (proactivity !== 'collaborative') return
    logJordanSuggestion({
      ...suggestion,
      type: 'query',
      text: "Here's another question you could ask:",
    })
  }

  function logJordanSuggestion(suggestion, shownAs = proactivity) {
    if (suggestion.suggestion) {
      previousJordanSuggestions.current.add(suggestion.suggestion.trim())
    }

    updateTranscript('jordan_suggestion_shown', suggestion.text, {
      suggestion_id: suggestion.id,
      suggestion_type: suggestion.type,
      suggested_question: suggestion.suggestion || null,
      goal_id: suggestion.goalId || null,
      note_to_add: suggestion.noteToAdd || null,
      shown_as: shownAs,
    })
  }

  function showJordanSuggestion(suggestion) {
    if (proactivity === 'active') {
      return
    }

    if (proactivity === 'passive') {
      logJordanSuggestion(suggestion)
    }

    setCollabSuggestion(suggestion)
  }

  function handleGoalEvalResult(evalData, alexMsgId, sourcesForTurn = []) {
    const matches = evalData.matches || []

    if (proactivity === 'collaborative' && allGoalsCovered) {
      setCollabSuggestion(null)
      setCollabQuestionPromptText(
        evalData.all_goals_covered_message ||
          'Looks like we covered your goals, but we can keep exploring!',
      )
      setShowCollabQuestionPrompt(true)
      return
    }

    if (matches.length === 0) {
      if (proactivity === 'collaborative') {
        setCollabSuggestion(null)
        setCollabQuestionPromptText("That didn't seem connected to your goals.")
        setShowCollabQuestionPrompt(true)
        return
      }

      if (proactivity === 'passive') {
        showJordanSuggestion({
          id: uid(),
          type: 'query',
          text:
            evalData.all_goals_covered_message ||
            evalData.no_match_jordan_message ||
            "That didn't seem connected to your goals yet. You could ask:",
          suggestion:
            evalData.suggested_goal_question ||
            'What else should I ask about clinical trials?',
          forMessageId: alexMsgId,
        })
      }

      return
    }

    const goodMatches = matches.filter(
      (match) => match.user_question_relevant && match.alex_answered_question,
    )

    if (goodMatches.length === 0) {
      if (proactivity === 'collaborative') {
        setCollabSuggestion(null)
        setCollabQuestionPromptText("I'm not sure Alex fully answered that.")
        setShowCollabQuestionPrompt(true)
        return
      }

      if (proactivity === 'passive') {
        showJordanSuggestion({
          id: uid(),
          type: 'query',
          text:
            evalData.next_step_message ||
            evalData.no_match_jordan_message ||
            matches[0]?.jordan_message ||
            "I'm not sure Alex fully answered that yet. You could try asking:",
          suggestion:
            evalData.suggested_goal_question ||
            matches[0]?.suggested_goal_question ||
            'What should I ask next about my clinical trial goals?',
          forMessageId: alexMsgId,
        })
      }

      return
    }

    const match = goodMatches[0]

    const coveredAfterThisTurn = new Set(coveredGoals)
    goodMatches.forEach((m) => coveredAfterThisTurn.add(m.goal_id))

    const allGoalsCoveredNow =
      goalObjects.length > 0 &&
      goalObjects.every((goal) => coveredAfterThisTurn.has(goal.id))

    if (proactivity === 'active') {
      // Active condition: user decides whether goals were addressed and writes notes manually.
      return
    } else if (proactivity === 'collaborative') {
      const goalTitle =
        goalObjects.find((goal) => goal.id === match.goal_id)?.title ||
        match.goal_id

      showJordanSuggestion({
        id: uid(),
        type: 'goal_note',
        text:
          evalData.next_step_message ||
          match.jordan_message ||
          `I think Alex <b>may have addressed your goal</b> about ${goalTitle}. Should we mark it as complete?`,
        goalId: match.goal_id,
        goalTitle,
        noteToAdd: match.note_to_add || '',
        sources: dedupeSources(sourcesForTurn),
        suggestion:
          evalData.suggested_goal_question ||
          (allGoalsCoveredNow
            ? 'What should I ask my doctor before deciding about a clinical trial?'
            : 'What else should I know about clinical trials?'),
        forMessageId: alexMsgId,
      })
      return
    } else if (proactivity === 'passive') {
      if (match.note_to_add) {
        addGoalNote(match.goal_id, match.note_to_add, sourcesForTurn)
      } else {
        markGoalCovered(match.goal_id)
      }

      const goalTitle =
        goalObjects.find((goal) => goal.id === match.goal_id)?.title ||
        match.goal_id

      showJordanSuggestion({
        id: uid(),
        type: 'goal_note',
        text:
          evalData.next_step_message ||
          match.jordan_message ||
          `I think Alex <b>may have addressed your goal</b> about ${goalTitle}. Should we mark it as complete?`,
        goalId: match.goal_id,
        goalTitle,
        noteToAdd: match.note_to_add || '',
        sources: dedupeSources(sourcesForTurn),
        suggestion:
          evalData.suggested_goal_question ||
          (allGoalsCoveredNow
            ? 'What should I ask my doctor before deciding about a clinical trial?'
            : 'What else should I know about clinical trials?'),
        forMessageId: alexMsgId,
      })
      return
    } else if (match.note_to_add) {
      addGoalNote(match.goal_id, match.note_to_add, sourcesForTurn)
    }

    if (allGoalsCoveredNow) {
      showJordanSuggestion({
        id: uid(),
        type: 'query',
        text:
          evalData.all_goals_covered_message ||
          "Looks like we've covered all your goals—feel free to keep exploring any other questions!",
        suggestion:
          evalData.suggested_goal_question ||
          'What should I ask my doctor before deciding about a clinical trial?',
        goalId: match.goal_id,
        noteToAdd: match.note_to_add,
        forMessageId: alexMsgId,
      })
      return
    }

    const nudgeText = evalData.next_step_message || match.jordan_message

    const jordanSuggestion = {
      id: uid(),
      type: evalData.suggested_goal_question ? 'query' : 'eval',
      text: nudgeText,
      suggestion: evalData.suggested_goal_question,
      goalId: match.goal_id,
      noteToAdd: match.note_to_add,
      forMessageId: alexMsgId,
    }

    showJordanSuggestion(jordanSuggestion)
  }

  function handleCollabEvalResponse(answer) {
    setCollabSuggestion(null)

    if (answer === 'no') {
      setInput('Can you say more about ')
      textareaRef.current?.focus()
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Goal/nudge updates                                                       */
  /* ------------------------------------------------------------------------ */

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
    playGesture('lookleft')
    setShowCards(true)
    setAlexSources([])
    clearJordanUI()
    setShowCollabQuestionPrompt(false)
    setCollabQuestionPromptText(null)
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

      let guidanceData = null

      try {
        guidanceData = await generateJordanExplorationGuidance({
          userQuestion: trimmed,
          alexAnswer: data.answer,
          history,
        })

        console.log('***JORDAN GUIDANCE IS', guidanceData)
      } catch (guidanceError) {
        console.error('Jordan exploration guidance failed:', guidanceError)
      } finally {
        setIsJordanGuidanceLoading(false)
      }

      console.log('Sources', data.sources)

      updateTranscript('alex', data.answer, {
        sources: data.sources || [],
      })

      setIsForagingFading(true)

      setTimeout(() => {
        setIsForaging(false)
        setIsForagingFading(false)
      }, 450)

      await speakWithLipsync(
        data.answer,
        'doctor',
        null,
        () => {
          setShowCards(false)
          playGesture('stopSwiping')
          setMessages((prev) => [
            ...prev,
            {
              id: alexMsgId,
              from: 'alex',
              text: data.answer,
              sources: data.sources || [],
              explanation: data.relevance_explanation,
              confidence: data.confidence,
            },
          ])
        },
        setAlexSubtitle,
      )

      setAlexSubtitle('')
      playGesture('stopSwiping')
      playGesture('stopAlexGesture')
      setAlexSources(data.sources || [])
      setIsAlexActive(false)

      if (guidanceData) {
        const guidanceWithId = {
          id: uid(),
          ...guidanceData,
        }

        previousJordanGuidanceTypes.current = [
          ...previousJordanGuidanceTypes.current,
          guidanceData.guidance_type,
        ]

        previousJordanGuidanceMessages.current = [
          ...previousJordanGuidanceMessages.current,
          guidanceData.jordan_message,
        ]

        setJordanGuidance(guidanceWithId)

        updateTranscript(
          'jordan_exploration_guidance',
          guidanceData.jordan_message,
          {
            guidance_id: guidanceWithId.id,
            guidance_type: guidanceData.guidance_type,
            guidance_prompt: guidanceData.guidance_prompt,
            lenses: guidanceData.lenses || [],
            sentence_starter: guidanceData.sentence_starter || null,
            action_label: guidanceData.action_label,
            for_message_id: alexMsgId,
          },
        )

        setIsJordanActive(true)
        playGesture('lookrightalex')

        await speakWithLipsync(
          guidanceData.jordan_message,
          'companion',
          null,
          () => {
            setMessages((prev) => [
              ...prev,
              {
                id: guidanceWithId.id,
                from: 'jordan',
                text: guidanceData.jordan_message,
                guidance: guidanceWithId,
              },
            ])
          },
          setJordanSubtitle,
        )

        setJordanSubtitle('')
        playGesture('stopCompanionGesture')
        playGesture('stopAlexGesture')
        setIsJordanActive(false)
      }
    } catch (err) {
      console.error(err)

      setMessages((prev) => [
        ...prev,
        {
          id: alexMsgId,
          from: 'alex',
          text: 'Sorry, something went wrong.',
        },
      ])
    } finally {
      playGesture('stopSwiping')
      setShowCards(false)
      setIsAlexActive(false)
    }
  }

  function savePendingGoalNote(goalId) {
    const pendingNote = pendingGoalNotes[goalId]
    if (!pendingNote) return

    addGoalNote(goalId, pendingNote.text, pendingNote.sources || [])

    setPendingGoalNotes((prev) => {
      const next = { ...prev }
      delete next[goalId]
      return next
    })
  }

  function dismissPendingGoalNote(goalId) {
    setPendingGoalNotes((prev) => {
      const next = { ...prev }
      delete next[goalId]
      return next
    })
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
    <div className={`mi-root mi-root-${proactivity}`}>
      <div className="tool-header">
        <img src={logo} className="logo" alt="Study logo" />
        <h2>Clinical Trials Education</h2>
        <h1>Chat with Virtual Characters</h1>
      </div>
      <button className="history-btn" onClick={() => setShowHistory(true)}>
        <FontAwesomeIcon icon={faCommentDots} size="sm" />
        Chat history
      </button>

      {(allGoalsCovered || showFinishButton) && (
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
            proactivity={proactivity}
            onOpenSource={setActiveSourcePopout}
            isForaging={isForaging}
            isForagingFading={isForagingFading}
            alexSubtitle={alexSubtitle}
            jordanSubtitle={jordanSubtitle}
            alexIntroDone={alexIntroDone}
            isIntroPlaying={isIntroPlaying}
            jordanGuidance={jordanGuidance}
            handleJordanLensSelect={handleJordanLensSelect}
            dismissJordanGuidance={dismissJordanGuidance}
          />

          <ChatInput
            input={input}
            textareaRef={textareaRef}
            onChange={handleInputChange}
            onSubmit={handleSend}
            disabled={isAlexActive || isJordanActive || isJordanGuidanceLoading}
            onHandleKeyDown={handleKeyDown}
          />
        </section>
      </main>

      {activeSourcePopout && (
        <SourcePopout
          source={activeSourcePopout}
          onClose={() => setActiveSourcePopout(null)}
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

function GoalsSection({
  proactivity,
  goalObjects,
  coveredGoals,
  goalNotes,
  pendingGoalNotes,
  onToggleGoalCovered,
  onSavePendingGoalNote,
  onDismissPendingGoalNote,
  onAddManualNote,
  availableSources,
  onOpenSource,
  isAlexActive = false,
}) {
  const isActive = proactivity === 'active'
  const isPassive = proactivity === 'passive'

  return (
    <div className="goals-area">
      <div className="sticky-note">
        {isActive
          ? 'Use this space to track your own goals and save notes you want to remember.'
          : isPassive
            ? "I'll mark goals complete and save notes with sources as you talk with Alex."
            : "I'll keep track of your goals below and suggest notes based on your conversation with Alex."}
      </div>

      <div className="mi-goals-header">
        <FontAwesomeIcon icon={faBullseye} />
        <span>Your goals</span>
      </div>

      {goalObjects.length === 0 ? (
        <p className="mi-goals-empty">No goals selected yet.</p>
      ) : (
        <div
          className={`mi-goals-list ${
            isActive && isAlexActive ? 'mi-goals-list-disabled' : ''
          }`}
        >
          {goalObjects.map((goal) => (
            <GoalChip
              key={goal.id}
              goalId={goal.id}
              label={goal.title}
              proactivity={proactivity}
              covered={coveredGoals.has(goal.id)}
              notes={goalNotes[goal.id] || []}
              pendingNote={pendingGoalNotes[goal.id]}
              onToggleGoalCovered={() => onToggleGoalCovered?.(goal.id)}
              onSavePendingNote={() => onSavePendingGoalNote(goal.id)}
              onDismissPendingNote={() => onDismissPendingGoalNote(goal.id)}
              onAddManualNote={(noteText, sources) =>
                onAddManualNote?.(goal.id, noteText, sources)
              }
              availableSources={availableSources}
              onOpenSource={onOpenSource}
              disabled={isActive && isAlexActive}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function GoalChip({
  goalId,
  label,
  proactivity,
  covered,
  notes,
  pendingNote,
  onToggleGoalCovered,
  onSavePendingNote,
  onDismissPendingNote,
  onAddManualNote,
  availableSources = [],
  onOpenSource,
  disabled = false,
}) {
  const isActive = proactivity === 'active'

  return (
    <div className={`mi-goal-chip${covered ? ' mi-goal-chip-covered' : ''}`}>
      <div className="mi-goal-chip-main">
        <span>{label}</span>

        {covered && (
          <FontAwesomeIcon icon={faCheck} className="mi-goal-chip-check" />
        )}
      </div>

      {isActive && (
        <button
          type="button"
          className={`mi-active-goal-toggle ${covered ? 'is-covered' : ''}`}
          onClick={onToggleGoalCovered}
          disabled={disabled}
        >
          {covered ? 'Reopen' : 'Mark complete'}
        </button>
      )}

      {pendingNote && !isActive && (
        <div className="mi-goal-pending-note">
          <div>{pendingNote.text}</div>

          <div className="mi-goal-pending-note-actions">
            <button type="button" onClick={onSavePendingNote}>
              <FontAwesomeIcon icon={faCheck} />
              &nbsp; Save
            </button>

            <button
              className="dismiss"
              type="button"
              onClick={onDismissPendingNote}
            >
              <FontAwesomeIcon icon={faXmark} />
              &nbsp; Dismiss
            </button>
          </div>
        </div>
      )}

      {isActive && (
        <ActiveNoteComposer
          availableSources={availableSources}
          onAddManualNote={onAddManualNote}
          onOpenSource={onOpenSource}
          disabled={disabled}
        />
      )}

      {notes?.length > 0 && (
        <div className="mi-goal-notes">
          {notes.map((note) => (
            <div key={note.id} className="mi-goal-note">
              <div>{note.text}</div>

              {note.sources?.length > 0 && (
                <div
                  className="mi-note-citations"
                  aria-label="Sources for this note"
                >
                  {note.sources.map((source, index) => (
                    <button
                      key={source.id}
                      type="button"
                      className="mi-note-citation"
                      onClick={() => onOpenSource?.(source)}
                      title={source.title || source.source || source.file}
                    >
                      [{index + 1}] {source.source || 'Source'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ActiveNoteComposer({
  availableSources = [],
  onAddManualNote,
  onOpenSource,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [selectedSourceKeys, setSelectedSourceKeys] = useState(new Set())
  const sources = dedupeSources(availableSources).slice(0, 3)

  function toggleSource(source) {
    const key = getSourceKey(source)
    setSelectedSourceKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  function handleSave() {
    if (disabled) return
    const selectedSources = sources.filter((source) =>
      selectedSourceKeys.has(getSourceKey(source)),
    )

    if (!noteText.trim() && selectedSources.length === 0) return

    const textToSave = noteText.trim() || 'Saved Alex resource.'
    onAddManualNote?.(textToSave, selectedSources)
    setNoteText('')
    setSelectedSourceKeys(new Set())
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        className="mi-active-add-note-btn"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
      >
        Add my own note
      </button>
    )
  }

  return (
    <div className="mi-active-note-composer">
      <textarea
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
        placeholder="Write a note for yourself..."
        rows={3}
        disabled={disabled}
      />

      {sources.length > 0 && (
        <div className="mi-active-source-picker">
          <span>Attach resources from Alex's last answer:</span>
          {sources.map((source, index) => {
            const key = getSourceKey(source)
            const selected = selectedSourceKeys.has(key)

            return (
              <div key={key} className="mi-active-source-row">
                <label>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleSource(source)}
                    disabled={disabled}
                  />
                  [{index + 1}] {source.source || 'Source'}
                </label>

                <button
                  type="button"
                  className="mi-active-source-preview"
                  onClick={() => onOpenSource?.(source)}
                  disabled={disabled}
                >
                  Preview
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="mi-active-note-actions">
        <button
          type="button"
          className="mi-nudge-btn mi-nudge-btn-primary"
          onClick={handleSave}
          disabled={disabled}
        >
          Save note
        </button>

        <button
          type="button"
          className="mi-nudge-btn"
          disabled={disabled}
          onClick={() => {
            setNoteText('')
            setSelectedSourceKeys(new Set())
            setIsOpen(false)
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function CollaborativeSuggestionCard({
  suggestion,
  onAcceptQuery,
  onDismiss,
  onEvalResponse,
  onAcceptGoal,
  onSaveNote,
  onDismissGoal,
  onDismissNote,
  onOpenSource,
  proactivity,
  onRequestExtraSuggestion,
}) {
  const [requestedExtraSuggestion, setRequestedExtraSuggestion] =
    useState(false)
  const isPassive = proactivity === 'passive'
  const [isExiting, setIsExiting] = useState(false)
  const [noteDraft, setNoteDraft] = useState(suggestion.noteToAdd || '')
  const [goalDecision, setGoalDecision] = useState(null)
  const [noteDecision, setNoteDecision] = useState(null)
  const isQuery = suggestion.type === 'query'
  const isGoalNote = suggestion.type === 'goal_note'
  const isPassiveUpdate = suggestion.type === 'passive_update'
  const sources = dedupeSources(suggestion.sources || []).slice(0, 2)
  const isResolved = !!suggestion.resolved
  const wasUsed = suggestion.resolution === 'used'

  function closeWithAnimation(action) {
    setIsExiting(true)
    setTimeout(action, 220)
  }

  function handleAcceptGoal() {
    if (!suggestion.goalId) {
      console.warn('Missing goalId on suggestion:', suggestion)
      return
    }

    onAcceptGoal?.(suggestion.goalId)
    setGoalDecision('marked')
  }

  function handleSaveNote() {
    if (!suggestion.goalId || !noteDraft.trim()) return
    onSaveNote?.(suggestion.goalId, noteDraft.trim(), suggestion.sources || [])
    setNoteDecision('saved')
  }

  function handleDismissGoal() {
    if (!suggestion.goalId) return
    onDismissGoal?.(suggestion.goalId)
    setGoalDecision('open')
  }

  function handleDismissNote() {
    if (!suggestion.goalId) return
    onDismissNote?.(suggestion.goalId, noteDraft.trim())
    setNoteDecision('dismissed')
  }

  return (
    <div
      className={`mi-collab-suggestion-card ${
        isExiting ? 'mi-collab-suggestion-card-exiting' : ''
      }`}
    >
      {isQuery && (
        <>
          {isPassive && suggestion.text && (
            <div className="mi-collab-suggestion-card-suggestion">
              <FontAwesomeIcon icon={faLightbulb} />
              <p>{suggestion.text}</p>
            </div>
          )}
          <div className="mi-collab-suggestion-quote">
            {suggestion.loading ? (
              <em>One moment...</em>
            ) : (
              suggestion.suggestion
            )}
          </div>

          {!suggestion.loading && (
            <>
              {!isResolved ? (
                <div className="mi-collab-suggestion-actions">
                  <button
                    type="button"
                    className="mi-nudge-btn mi-nudge-btn-primary"
                    onClick={onAcceptQuery}
                  >
                    Use this
                  </button>

                  <button
                    type="button"
                    className="mi-nudge-btn"
                    onClick={onDismiss}
                  >
                    Not now
                  </button>
                </div>
              ) : (
                <div
                  className={`mi-suggestion-status ${
                    wasUsed ? 'used' : 'dismissed'
                  }`}
                >
                  <FontAwesomeIcon icon={wasUsed ? faCheck : faBan} />
                  {wasUsed ? 'Question added to your message' : 'Dismissed'}
                </div>
              )}
            </>
          )}
        </>
      )}

      {isPassiveUpdate && (
        <div className="mi-collab-review mi-passive-review">
          <div className="mi-passive-auto-status">
            <div className="mi-passive-auto-info">
              <FontAwesomeIcon icon={faCheck} />
              <span>
                I marked "{suggestion.goalTitle || 'this goal'}" complete
                {suggestion.noteToAdd ? ' and saved the following note:' : '.'}
              </span>
            </div>
            <div className="mi-passive-saved-note">
              {suggestion.noteToAdd}
              {sources.length > 0 && (
                <div
                  className="mi-note-citations"
                  aria-label="Sources for this note"
                >
                  {sources.map((source, index) => (
                    <button
                      key={source.id || getSourceKey(source)}
                      type="button"
                      className="mi-note-citation"
                      onClick={() => onOpenSource?.(source)}
                      title={source.title || source.source || source.file}
                    >
                      [{index + 1}] {source.source || 'Source'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {suggestion.suggestion && (
            <div className="mi-collab-suggestion-next-suggestion">
              <div className="mi-collab-suggestion-card-suggestion">
                <FontAwesomeIcon icon={faCheck} />
                <p>Here's what I suggest asking next:</p>
              </div>

              <div className="mi-collab-suggestion-quote">
                {suggestion.suggestion}
              </div>

              {!isResolved ? (
                <div className="mi-collab-suggestion-actions">
                  <button
                    type="button"
                    className="mi-nudge-btn mi-nudge-btn-primary"
                    onClick={onAcceptQuery}
                  >
                    Use this
                  </button>

                  <button
                    type="button"
                    className="mi-nudge-btn"
                    onClick={onDismiss}
                  >
                    Not now
                  </button>
                </div>
              ) : (
                <div
                  className={`mi-suggestion-status ${
                    wasUsed ? 'used' : 'dismissed'
                  }`}
                >
                  <FontAwesomeIcon icon={wasUsed ? faCheck : faBan} />
                  {wasUsed ? 'Question added to your message' : 'Dismissed'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isGoalNote && isPassive && (
        <div className="mi-collab-suggestion-next-suggestion">
          <div className="mi-collab-suggestion-card-suggestion">
            <FontAwesomeIcon icon={faLightbulb} />
            <p>{suggestion.text || "Here's another question you could ask:"}</p>
          </div>

          <div className="mi-collab-suggestion-quote">
            {suggestion.suggestion ||
              'What else should I know about clinical trials?'}
          </div>

          {!isResolved ? (
            <div className="mi-collab-suggestion-actions">
              <button
                type="button"
                className="mi-nudge-btn mi-nudge-btn-primary"
                onClick={onAcceptQuery}
              >
                Use this
              </button>

              <button
                type="button"
                className="mi-nudge-btn"
                onClick={onDismiss}
              >
                Not now
              </button>
            </div>
          ) : (
            <div
              className={`mi-suggestion-status ${wasUsed ? 'used' : 'dismissed'}`}
            >
              <FontAwesomeIcon icon={wasUsed ? faCheck : faBan} />
              {wasUsed ? 'Question added to your message' : 'Dismissed'}
            </div>
          )}
        </div>
      )}

      {isGoalNote && !isPassive && (
        <div className="mi-collab-review">
          <div className="mi-collab-review-section">
            {goalDecision ? (
              <div className="mi-collab-collapsed-status">
                <FontAwesomeIcon
                  icon={goalDecision === 'marked' ? faCheck : faBan}
                />
                <span>
                  {goalDecision === 'marked'
                    ? 'Goal marked complete below.'
                    : 'Goal left open for now.'}
                </span>
              </div>
            ) : (
              <>
                <p>
                  <FontAwesomeIcon icon={faBullseye} />
                  <span>
                    I think Alex <b>may have addressed your goal</b>
                    {suggestion.goalTitle ? `: ${suggestion.goalTitle}` : ''}.
                    Should we mark it as complete?
                  </span>
                </p>

                {!isPassive && (
                  <div className="mi-collab-suggestion-actions">
                    <button
                      type="button"
                      className="mi-nudge-btn mi-nudge-btn-primary"
                      onClick={handleAcceptGoal}
                    >
                      Mark complete
                    </button>

                    <button
                      type="button"
                      className="mi-nudge-btn"
                      onClick={handleDismissGoal}
                    >
                      Not yet
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {suggestion.noteToAdd && (
            <div className="mi-collab-review-section">
              {noteDecision ? (
                <div className="mi-collab-collapsed-status">
                  <FontAwesomeIcon
                    icon={noteDecision === 'saved' ? faCheck : faBan}
                  />
                  <span>
                    {noteDecision === 'saved'
                      ? 'Note saved below.'
                      : 'Note not added.'}
                  </span>
                </div>
              ) : (
                <>
                  <p>
                    <FontAwesomeIcon icon={faPenToSquare} />
                    <span>
                      Also, <b>this might be a good note</b> to add along with
                      the source. Feel free to edit, save, or ignore it!
                    </span>
                  </p>

                  <textarea
                    className="mi-collab-note-editor"
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    rows={4}
                    readOnly={isPassive}
                  />

                  {sources.length > 0 && (
                    <div
                      className="mi-note-citations"
                      aria-label="Sources for this note"
                    >
                      {sources.map((source, index) => (
                        <button
                          key={source.id || getSourceKey(source)}
                          type="button"
                          className="mi-note-citation"
                          onClick={() => onOpenSource?.(source)}
                          title={source.title || source.source || source.file}
                        >
                          [{index + 1}] {source.source || 'Source'}
                        </button>
                      ))}
                    </div>
                  )}

                  {!isPassive && (
                    <div className="mi-collab-suggestion-actions">
                      <button
                        type="button"
                        className="mi-nudge-btn mi-nudge-btn-primary"
                        onClick={handleSaveNote}
                      >
                        Save note
                      </button>

                      <button
                        type="button"
                        className="mi-nudge-btn"
                        onClick={handleDismissNote}
                      >
                        Dismiss note
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {requestedExtraSuggestion || isPassive ? (
            <div className="mi-collab-suggestion-next-suggestion">
              <div className="mi-collab-suggestion-card-suggestion">
                <FontAwesomeIcon icon={faLightbulb} />
                <p>Here's another question you could ask:</p>
              </div>

              <div className="mi-collab-suggestion-quote">
                {suggestion.suggestion ||
                  'What else should I know about clinical trials?'}
              </div>

              {!isPassive &&
                (!isResolved ? (
                  <div className="mi-collab-suggestion-actions">
                    <button
                      type="button"
                      className="mi-nudge-btn mi-nudge-btn-primary"
                      onClick={onAcceptQuery}
                    >
                      Use this
                    </button>

                    <button
                      type="button"
                      className="mi-nudge-btn"
                      onClick={() => setRequestedExtraSuggestion(false)}
                    >
                      Not now
                    </button>
                  </div>
                ) : (
                  <div
                    className={`mi-suggestion-status ${
                      wasUsed ? 'used' : 'dismissed'
                    }`}
                  >
                    <FontAwesomeIcon icon={wasUsed ? faCheck : faBan} />
                    {wasUsed ? 'Question added to your message' : 'Dismissed'}
                  </div>
                ))}
            </div>
          ) : (
            <div className="mi-collab-review-section">
              <p>
                <FontAwesomeIcon icon={faLightbulb} />
                <span>
                  Finally, I can suggest another question if you'd like!
                </span>
              </p>

              <button
                type="button"
                className="mi-nudge-btn mi-nudge-btn-primary mi-nudge-btn-suggestion"
                onClick={() => {
                  onRequestExtraSuggestion?.(suggestion)
                  setRequestedExtraSuggestion(true)
                }}
              >
                Suggest another question
              </button>
            </div>
          )}
        </div>
      )}

      {!isQuery && !isGoalNote && !isPassiveUpdate && (
        <div className="mi-collab-suggestion-actions">
          <button
            type="button"
            className="mi-nudge-btn mi-nudge-btn-primary"
            onClick={() => closeWithAnimation(() => onEvalResponse('yes'))}
          >
            Yes
          </button>

          <button
            type="button"
            className="mi-nudge-btn"
            onClick={() => closeWithAnimation(() => onEvalResponse('no'))}
          >
            Not quite
          </button>
        </div>
      )}
    </div>
  )
}

function JordanExplorationCard({ guidance, onSelectLens, onDismiss }) {
  const lenses = guidance.lenses || []

  return (
    <div
      className={`jordan-exploration-card jordan-exploration-card-${guidance.guidance_type}`}
    >
      <div className="jordan-exploration-card-header">
        <div>
          <span className="jordan-exploration-card-kicker">
            Jordan’s exploration guidance
          </span>

          <h3>{guidance.action_label}</h3>
        </div>

        <button
          type="button"
          className="jordan-exploration-close"
          onClick={onDismiss}
          aria-label="Dismiss Jordan's guidance"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>

      <div className="jordan-exploration-prompt">
        <FontAwesomeIcon icon={faLightbulb} />

        <span>{guidance.guidance_prompt}</span>
      </div>

      {lenses.length > 0 && (
        <div className="jordan-exploration-lenses">
          {lenses.map((lens) => (
            <button
              type="button"
              className="jordan-exploration-lens"
              key={lens}
              onClick={() => onSelectLens(lens)}
            >
              {lens}
            </button>
          ))}
        </div>
      )}

      {guidance.sentence_starter && (
        <div className="jordan-exploration-starter">
          <span>Try starting with</span>

          <strong>{guidance.sentence_starter}</strong>
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
  proactivity,
  onOpenSource,
  isForaging,
  isForagingFading,
  alexSubtitle,
  jordanSubtitle,
  alexIntroDone,
  isIntroPlaying,
  jordanGuidance,
  handleJordanLensSelect,
  dismissJordanGuidance,
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

          {uniqueSources.length > 0 && (
            <div className="alex-source-panel">
              <div className="alex-source-panel-header">
                <span className="alex-source-label">Resources I found</span>
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
                          {source.source || 'Source'}
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

                    <div className="alex-source-card-action">Explore →</div>
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
        className={`mi-character-zone mi-character-zone-jordan ${
          isJordanActive ? 'mi-character-zone-speaking' : ''
        } ${isAlexActive ? 'mi-character-zone-listening' : ''}`}
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

          {jordanGuidance && (
            <JordanExplorationCard
              guidance={jordanGuidance}
              onSelectLens={handleJordanLensSelect}
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
                ? 'Please wait while Alex is speaking...'
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
                className={`mi-nudge-btn ${isSaved ? '' : 'mi-nudge-btn-primary'}`}
                onClick={() => onSaveResource?.(source)}
                disabled={isSaved}
              >
                {isSaved ? 'Saved ✓' : 'Save resource'}
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

          <button type="button" onClick={onClose}>
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
                  : message.from === 'jordan-nudge'
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
