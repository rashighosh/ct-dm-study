import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import logo from '../assets/logo-transparent.png'
import '../css/MainInteraction.css'
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
  faObjectGroup,
  faListCheck,
  faArrowRight,
  faPenToSquare,
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

const TUTORIAL_IMAGES = {
  passive: [
    '/tutorials/passive1.png',
    '/tutorials/passive2.png',
    '/tutorials/passive3.png',
    '/tutorials/passive4.png',
    '/tutorials/passive5.png',
  ],
  collaborative: [
    '/tutorials/collaborative1.png',
    '/tutorials/collaborative2.png',
    '/tutorials/collaborative3.png',
    '/tutorials/collaborative4.png',
  ],
  active: [
    '/tutorials/active1.png',
    '/tutorials/active2.png',
    '/tutorials/active3.png',
    '/tutorials/active4.png',
    '/tutorials/active5.png',
    '/tutorials/active6.png',
  ],
}

const uid = () => crypto.randomUUID()

const getSourceKey = (source) =>
  source.url || source.title || source.file || source.source || source.id

const dedupeSources = (sources = []) =>
  Array.from(
    new Map(sources.map((source) => [getSourceKey(source), source])).values(),
  )

/* -------------------------------------------------------------------------- */
/* Main component                                                             */
/* -------------------------------------------------------------------------- */

export default function MainInteraction() {
  // const BASE_URL = 'http://127.0.0.1:8000'
  const BASE_URL =
    'https://brcco3c42yqwcnqmvj4h2k2igu0fysxd.lambda-url.us-east-1.on.aws'
  const location = useLocation()
  const goals = location.state ?? {}

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
  const chatEndRef = useRef(null)
  const textareaRef = useRef(null)
  const suppressNextActivePopout = useRef(false)
  const previousJordanSuggestions = useRef(new Set())
  const introCueTimers = useRef([])

  const [showCollabQuestionPrompt, setShowCollabQuestionPrompt] =
    useState(false)
  const [collabQuestionPromptText, setCollabQuestionPromptText] = useState(null)
  const [activeSourcePopout, setActiveSourcePopout] = useState(null)
  const [tutorialIndex, setTutorialIndex] = useState(0)
  const [showTalkingPoints, setShowTalkingPoints] = useState(false)
  const [alexIntroCue, setAlexIntroCue] = useState(null)
  const [audioReady, setAudioReady] = useState(false)
  const [alexTalkingPoints, setAlexTalkingPoints] = useState([])
  const [pendingGoalNotes, setPendingGoalNotes] = useState({})
  const [activeJordanSuggestion, setActiveJordanSuggestion] = useState(null)
  const [activeQuerySuggestion, setActiveQuerySuggestion] = useState('')
  const [activeQueryLoading, setActiveQueryLoading] = useState(false)
  const [showCards, setShowCards] = useState(false)
  // Active condition only:
  // null | "notes" | "query" | "eval"
  const [openJordanPanel, setOpenJordanPanel] = useState(null)
  const [alexIntroDone, setAlexIntroDone] = useState(false)
  // Collaborative condition only:
  // null | { type: "query" | "eval", ... }
  const [collabSuggestion, setCollabSuggestion] = useState(null)
  const [goalNotes, setGoalNotes] = useState({})
  const [alexSources, setAlexSources] = useState([])
  const [isAlexActive, setIsAlexActive] = useState(false)
  const [proactivity] = useState(goals?.proactivity || 'collaborative')
  const [showHistory, setShowHistory] = useState(false)
  const [input, setInput] = useState('')
  const [coveredGoals, setCoveredGoals] = useState(new Set())
  const [messages, setMessages] = useState([])
  const [transcript, setTranscript] = useState([])

  const hasSentFirstMessage = messages.some((m) => m.from === 'user')

  const participantId = goals?.participantId || 'test-participant'

  const goalLabels = goalObjects.map((goal) => goal.title)

  const allGoalsCovered =
    goalObjects.length > 0 &&
    goalObjects.every((goal) => coveredGoals.has(goal.id))

  const jordanPopupOpen = proactivity === 'active' && openJordanPanel !== null

  const tutorialImages = TUTORIAL_IMAGES[proactivity] || []
  const currentTutorialImage = tutorialImages[tutorialIndex]
  const isLastTutorial = tutorialIndex === tutorialImages.length - 1

  /* ------------------------------------------------------------------------ */
  /* Character setup + scroll behavior                                        */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!audioReady) return
    async function initCharacters() {
      try {
        await initDoctorCharacter(doctorRef.current)
        if (companionRef.current) {
          await initCompanionCharacter(companionRef.current)
        }

        console.log('GOALS ARE', goals)

        const STATIC_ALEX_INTRO1 = `Hello, I am Doctor Alex, your virtual assistant for learning about clinical trials. I will not suggest specific trials or decide if one is right for you, since those choices are best discussed with your loved ones and health care provider, but I will help you find, summarize, and organize information from trusted sources.`

        const STATIC_ALEX_INTRO2 = `Now, let me take a quick look at the goals that you set earlier with Jordan.`

        const personalizedAlexPrompt = `
        You are Doctor Alex, a warm and approachable virtual health assistant helping cancer patients learn about clinical trials as a treatment option.

        The user's information-seeking goals are:
        Selected goals:
        ${goalObjects.map((goal) => goal.title).join(', ') || 'None'}

        Custom goals:
        ${(goals?.customGoals || []).join(', ') || 'None'}

        Write exactly 2 sentences and keep the full response under 40 words:
        1. Say that you reviewed the user's goals. Mention 2–3 examples from their goals, but frame them as examples rather than a complete list.
        2. Ask one question about where the user would like to begin.

        Do not use bullet points.
        Do not list all of the user's goals.
        Do not repeat the goals word-for-word.
        Be conversational, supportive, concise, and easy to understand.
      `

        const personalizedPromise = fetch(`${BASE_URL}/simple-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: personalizedAlexPrompt,
          }),
        }).then((res) => res.json())

        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            from: 'alex',
            text: STATIC_ALEX_INTRO1,
            sources: [],
            explanation: null,
            confidence: null,
          },
        ])

        updateTranscript('alex', STATIC_ALEX_INTRO1, {
          sources: [],
          intro: true,
          intro_part: 'static',
        })

        setIsAlexActive(true)
        playAlexIntroCues()
        playGesture('lookleft')

        await speakWithLipsyncStatic(
          '/intro-voices/doctor-alexIntro1-intro.mp3',
          '/intro-voices/doctor-alexIntro1-intro-timestamps.json',
          'doctor',
        )

        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            from: 'alex',
            text: STATIC_ALEX_INTRO2,
            sources: [],
            explanation: null,
            confidence: null,
          },
        ])

        updateTranscript('alex', STATIC_ALEX_INTRO2, {
          sources: [],
          intro: true,
          intro_part: 'static',
        })

        clearAlexIntroCues()
        setAlexIntroCue({
          type: 'goals-review',
        })

        await speakWithLipsyncStatic(
          '/intro-voices/doctor-alexIntro2-intro.mp3',
          '/intro-voices/doctor-alexIntro2-intro-timestamps.json',
          'doctor',
        )

        playGesture('thinkingDoctor')

        const data = await personalizedPromise

        const personalizedIntro = data.reply

        updateTranscript('alex', personalizedIntro, {
          sources: [],
          intro: true,
          intro_part: 'personalized',
        })

        await speakWithLipsync(
          personalizedIntro,
          'doctor',
          null,
          () => setAlexIntroCue(null),
          setMessages((prev) => [
            ...prev,
            {
              id: uid(),
              from: 'alex',
              text: personalizedIntro,
              sources: [],
              explanation: null,
              confidence: null,
            },
          ]),
        )

        playGesture('stopCompanionGesture')
        setIsAlexActive(false)
        setAlexIntroDone(true)
      } catch (err) {
        console.log(err)
      }
    }
    initCharacters()
  }, [audioReady])

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

  useEffect(() => {
    const timer = setTimeout(() => {
      chatEndRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      })
    }, 50)

    return () => clearTimeout(timer)
  }, [messages, isAlexActive, showCards])

  /* ------------------------------------------------------------------------ */
  /* Navigation                                               */
  /* ------------------------------------------------------------------------ */

  const navigate = useNavigate()

  function handleContinue() {
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

  function clearAlexIntroCues() {
    introCueTimers.current.forEach(clearTimeout)
    introCueTimers.current = []
    setAlexIntroCue(null)
  }

  function toggleJordanPanel(panel) {
    setOpenJordanPanel((prev) => (prev === panel ? null : panel))
  }

  function closeJordanPopup() {
    setOpenJordanPanel(null)
  }

  function clearJordanUI() {
    closeJordanPopup()
    setCollabSuggestion(null)
  }

  function getQuerySuggestion() {
    return input.trim()
      ? `Could you tell me more about ${input.trim().replace(/\?$/, '')}?`
      : 'What would you like to ask Alex about first?'
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

  async function handleManualQueryHelp() {
    setActiveQueryLoading(true)
    const isAlreadyOpen = openJordanPanel === 'query'

    if (isAlreadyOpen) {
      setOpenJordanPanel(null)
      setActiveQueryLoading(false)
      return
    }

    setOpenJordanPanel('query')

    const suggestion = await generateJordanOpeningSuggestion()

    const manualSuggestion = {
      id: uid(),
      type: 'query',
      text: 'Want help wording that question?',
      suggestion,
      source: 'manual_query_help',
    }

    logJordanSuggestion(manualSuggestion)
    setActiveJordanSuggestion(manualSuggestion)
    setActiveQuerySuggestion(suggestion)
    setActiveQueryLoading(false)
  }

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

  function acceptQuerySuggestion(message) {
    if (!message) return
    updateTranscript('jordan_suggestion_action', 'used suggestion', {
      action: 'used',
      suggestion_id: message.id,
      suggestion_text: message.text,
      suggested_question: message.suggestion,
      suggestion_type: message.type || message.nudgeType,
    })

    suppressNextActivePopout.current = proactivity === 'active'
    setInput(message.suggestion)
    textareaRef.current?.focus()
    closeJordanPopup()
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

    logJordanSuggestion(suggestion)

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
      goodMatches.forEach((goodMatch) => {
        if (goodMatch.note_to_add) {
          addGoalNote(goodMatch.goal_id, goodMatch.note_to_add, sourcesForTurn)
        } else {
          markGoalCovered(goodMatch.goal_id)
        }
      })

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

  function handleActiveSaveNote() {
    if (!activeJordanSuggestion?.goalId || !activeJordanSuggestion?.noteToAdd)
      return

    const pendingNote = pendingGoalNotes[activeJordanSuggestion.goalId]

    addGoalNote(
      activeJordanSuggestion.goalId,
      activeJordanSuggestion.noteToAdd,
      pendingNote?.sources || [],
    )

    setActiveJordanSuggestion((prev) =>
      prev ? { ...prev, noteSaved: true } : prev,
    )
  }

  function handleInlineEvalResponse(nudgeId, answer) {
    resolveNudge(
      nudgeId,
      answer === 'yes' ? 'Yes, that answered it' : 'Not quite',
    )

    if (answer === 'no') {
      setInput('Can you say more about ')
      textareaRef.current?.focus()
    }
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

  function resolveNudge(id, resolution) {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id
          ? { ...message, resolved: true, resolution }
          : message,
      ),
    )
  }

  /* ------------------------------------------------------------------------ */
  /* Message send flow                                                        */
  /* ------------------------------------------------------------------------ */

  function playAlexIntroCues() {
    introCueTimers.current.forEach(clearTimeout)
    introCueTimers.current = []

    const cues = [
      {
        delay: 5840, // fix later
        cue: {
          type: 'boundary',
          title: 'What I will not do',
          text: 'I will not suggest specific trials or decide if one is right for you.',
        },
      },
      {
        delay: 15100, // fix later
        cue: {
          type: 'sources',
          title: 'How I can help',
          text: 'I can find, summarize, and organize information from trusted sources.',
        },
      },
    ]

    cues.forEach(({ delay, cue }) => {
      const timer = setTimeout(() => setAlexIntroCue(cue), delay)
      introCueTimers.current.push(timer)
    })

    const clearTimer = setTimeout(() => setAlexIntroCue(null), 19000)
    introCueTimers.current.push(clearTimer)
  }

  async function handleSend(e) {
    e.preventDefault()

    const trimmed = input.trim()
    if (!trimmed) return

    updateTranscript('user', trimmed)

    clearAlexIntroCues()
    setAlexTalkingPoints([])
    setShowTalkingPoints(false)
    setIsAlexActive(true)
    playGesture('startSwiping')
    playGesture('lookleft')
    setShowCards(true)
    setAlexSources([])
    clearJordanUI()
    setActiveJordanSuggestion(null)
    setActiveQuerySuggestion('')
    setActiveQueryLoading(false)
    setShowCollabQuestionPrompt(false)
    setCollabQuestionPromptText(null)

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

      const evalResponse = await fetch(`${BASE_URL}/evaluate-goal-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_message: trimmed,
          alex_answer: data.answer,
          goals: goalObjects.map((goal) => ({
            id: goal.id,
            title: goal.title,
            description: goal.description,
            addressed: coveredGoals.has(goal.id),
            notes: goalNotes[goal.id] || [],
          })),
          condition: proactivity,
          previous_suggestions: Array.from(previousJordanSuggestions.current),
        }),
      })

      const evalData = await evalResponse.json()

      console.log('***EVAL DATA IS', evalData)

      setAlexSources(data.sources || [])

      console.log('Sources', data.sources)

      updateTranscript('alex', data.answer, {
        sources: data.sources || [],
      })

      setAlexTalkingPoints(data.talking_points || [])
      setShowTalkingPoints(false)

      let talkingPointsTimer

      await speakWithLipsync(data.answer, 'doctor', null, () => {
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
        talkingPointsTimer = setTimeout(() => {
          setShowTalkingPoints(true)
        }, 5000)
      })

      playGesture('stopCompanionGesture')
      clearTimeout(talkingPointsTimer)
      setIsAlexActive(false)
      setShowTalkingPoints(false)
      setAlexTalkingPoints([])

      handleGoalEvalResult(evalData, alexMsgId, data.sources || [])
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
      setAlexTalkingPoints([])
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

  return (
    <div className={`mi-root mi-root-${proactivity}`}>
      {!audioReady && (
        <div className="start-overlay">
          <div className="start-overlay-content tutorial-start-content">
            <img src={logo} className="logo" alt="Study logo" />
            <h2>Before you begin</h2>
            <p>
              Take a quick look at how this version of Jordan will support you.
            </p>

            {currentTutorialImage && (
              <div className="tutorial-image-frame">
                <img
                  src={currentTutorialImage}
                  alt={`${proactivity} tutorial step ${tutorialIndex + 1}`}
                  className="tutorial-image"
                />
              </div>
            )}

            <div className="tutorial-progress">
              {tutorialImages.map((_, index) => (
                <span
                  key={index}
                  className={`tutorial-dot ${
                    index === tutorialIndex ? 'tutorial-dot-active' : ''
                  }`}
                />
              ))}
            </div>

            <div className="tutorial-actions">
              <button
                type="button"
                className="tutorial-secondary-btn"
                disabled={tutorialIndex === 0}
                onClick={() =>
                  setTutorialIndex((prev) => Math.max(0, prev - 1))
                }
              >
                Back
              </button>

              {isLastTutorial ? (
                <button
                  className="cssbuttons-io-button"
                  onClick={() => setAudioReady(true)}
                >
                  Start chatting
                  <span className="icon">
                    <FontAwesomeIcon icon={faArrowRight} size="xs" />
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  className="tutorial-button"
                  onClick={() =>
                    setTutorialIndex((prev) =>
                      Math.min(tutorialImages.length - 1, prev + 1),
                    )
                  }
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="tool-header">
        <img src={logo} className="logo" alt="Study logo" />
        <h2>Clinical Trials Education</h2>
        <h1>Chat with Virtual Characters</h1>
      </div>
      <button className="history-btn" onClick={() => setShowHistory(true)}>
        <FontAwesomeIcon icon={faCommentDots} size="sm" />
        Chat history
      </button>

      {allGoalsCovered && (
        <button className="mi-continue-btn" onClick={handleContinue}>
          Finish
        </button>
      )}

      <main className="mi-main">
        <div
          className={`mi-overlay ${jordanPopupOpen ? 'mi-overlay-open' : ''}`}
          onClick={closeJordanPopup}
        />

        {proactivity === 'passive' && openJordanPanel === 'notes' && (
          <div className="mi-passive-goals-popover">
            <div className="mi-passive-goals-header">
              <span>Your goals</span>
              <div className="sticky-note">
                I'll keep track of your goals below and add notes based on your
                conversation with Alex as we go!
              </div>
              <button type="button" onClick={closeJordanPopup}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="mi-goals-list">
              {goalObjects.map((goal) => (
                <div
                  key={goal.id}
                  className={`mi-goal-chip mi-goal-chip-with-notes${
                    coveredGoals.has(goal.id) ? ' mi-goal-chip-covered' : ''
                  }`}
                >
                  <div className="mi-goal-chip-main">
                    <span>{goal.title}</span>

                    {coveredGoals.has(goal.id) && (
                      <FontAwesomeIcon
                        icon={faCheck}
                        className="mi-goal-chip-check"
                      />
                    )}
                  </div>

                  {goalNotes[goal.id]?.length > 0 && (
                    <div className="mi-goal-notes">
                      {goalNotes[goal.id].map((note) => (
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
                                  onClick={() => setActiveSourcePopout(source)}
                                  title={
                                    source.title || source.source || source.file
                                  }
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
              ))}
            </div>
          </div>
        )}

        <JordanSidebar
          proactivity={proactivity}
          openJordanPanel={openJordanPanel}
          companionRef={companionRef}
          goalObjects={goalObjects}
          coveredGoals={coveredGoals}
          collabSuggestion={collabSuggestion}
          onAcceptCollabSuggestion={acceptCollabSuggestion}
          onDismissCollabSuggestion={dismissCollabSuggestion}
          onCollabEvalResponse={handleCollabEvalResponse}
          onRequestCollabQuestion={handleCollabQueryHelp}
          onAcceptCollabGoal={markGoalCovered}
          onSaveCollabNote={(goalId, noteText, sources) =>
            addGoalNote(goalId, noteText, sources, false)
          }
          onToggleGoalCovered={toggleGoalCovered}
          onAddManualNote={(goalId, noteText, sources) =>
            addGoalNote(goalId, noteText, sources, false)
          }
          availableSources={alexSources}
          isAlexActive={isAlexActive}
          pendingGoalNotes={pendingGoalNotes}
          onSavePendingGoalNote={savePendingGoalNote}
          onDismissPendingGoalNote={dismissPendingGoalNote}
          goalNotes={goalNotes}
          onOpenSource={setActiveSourcePopout}
          hasSentFirstMessage={hasSentFirstMessage}
          alexIntroDone={alexIntroDone}
          showCollabQuestionPrompt={showCollabQuestionPrompt}
          collabQuestionPromptText={collabQuestionPromptText}
        />

        <section className="mi-chat-card fade-in-up">
          <AlexHeader
            doctorRef={doctorRef}
            isAlexActive={isAlexActive}
            sources={alexSources}
            showCards={showCards}
            talkingPoints={alexTalkingPoints}
            showTalkingPoints={showTalkingPoints}
            introCue={alexIntroCue}
            proactivity={proactivity}
            onOpenSource={setActiveSourcePopout}
          />

          <MessageThread
            messages={messages}
            chatEndRef={chatEndRef}
            proactivity={proactivity}
            companionRef={companionRef}
            onOpenGoals={() => toggleJordanPanel('notes')}
            onAcceptQuerySuggestion={acceptQuerySuggestion}
            onDismissNudge={(id, resolution, message) => {
              updateTranscript(
                'jordan_suggestion_action',
                'dismissed suggestion',
                {
                  action: 'dismissed',
                  suggestion_id: id,
                  suggested_question: message?.suggestion || null,
                  suggestion_text: message?.text || null,
                  suggestion_type: message?.type || message?.nudgeType || null,
                },
              )

              resolveNudge(id, resolution)
            }}
            onInlineEvalResponse={handleInlineEvalResponse}
            onResolveNudge={resolveNudge}
          />

          <ChatInput
            input={input}
            textareaRef={textareaRef}
            onChange={handleInputChange}
            onSubmit={handleSend}
            disabled={isAlexActive}
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
        />
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Render helpers                                                             */
/* -------------------------------------------------------------------------- */

function ActiveJordanDock({
  companionRef,
  openJordanPanel,
  coveredGoalsCount,
  getQuerySuggestion,
  activeJordanSuggestion,
  activeQuerySuggestion,
  activeQueryLoading,
  onTogglePanel,
  onClosePanel,
  onManualQueryHelp,
  onAcceptQuerySuggestion,
  onActiveSaveNote,
  disabled = false,
}) {
  return (
    <div className="mi-jordan-active-area">
      {openJordanPanel === 'query' && (
        <div className="mi-dock-nudge">
          <div className="mi-dock-nudge-content">
            <span className="mi-dock-nudge-text">
              {activeJordanSuggestion?.text ||
                'Want help wording that question?'}
            </span>

            <div className="mi-dock-nudge-suggestion">
              {activeQueryLoading ? (
                <em>Thinking of a helpful question...</em>
              ) : (
                activeJordanSuggestion?.suggestion ||
                activeQuerySuggestion ||
                getQuerySuggestion()
              )}
            </div>

            <div className="mi-dock-nudge-actions">
              <button
                type="button"
                className="mi-nudge-btn mi-nudge-btn-primary"
                onClick={() => onAcceptQuerySuggestion(activeJordanSuggestion)}
                disabled={disabled}
              >
                Use this
              </button>

              <button
                type="button"
                className="mi-nudge-btn"
                onClick={onClosePanel}
                disabled={disabled}
              >
                No thanks
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mi-jordan-dock">
        <div className="mi-jordan-dock-avatar">
          <div
            className="virtual-companion"
            id="virtualcompanion"
            ref={companionRef}
          />
        </div>

        <div className="mi-jordan-dock-actions">
          <button
            type="button"
            className="mi-jordan-action-btn"
            onClick={() => onTogglePanel('notes')}
            aria-label="Open Jordan's notes"
            disabled={disabled}
          >
            <FontAwesomeIcon icon={faBullseye} />
            {coveredGoalsCount > 0 && (
              <span className="mi-notes-badge">{coveredGoalsCount}</span>
            )}
          </button>

          <button
            type="button"
            className="mi-jordan-action-btn"
            onClick={onManualQueryHelp}
            aria-label="Ask Jordan to help phrase a question"
            disabled={disabled}
          >
            <FontAwesomeIcon icon={faLightbulb} />
          </button>
        </div>
      </div>
    </div>
  )
}

function JordanSidebar({
  proactivity,
  companionRef,
  goalObjects,
  coveredGoals,
  collabSuggestion,
  onAcceptCollabSuggestion,
  onDismissCollabSuggestion,
  onCollabEvalResponse,
  onRequestCollabQuestion,
  onAcceptCollabGoal,
  onSaveCollabNote,
  onToggleGoalCovered,
  onAddManualNote,
  availableSources,
  isAlexActive,
  pendingGoalNotes,
  onSavePendingGoalNote,
  onDismissPendingGoalNote,
  goalNotes,
  onOpenSource,
  hasSentFirstMessage,
  alexIntroDone,
  showCollabQuestionPrompt,
  collabQuestionPromptText,
}) {
  const isActive = proactivity === 'active'

  return (
    <aside className="mi-sidebar mi-sidebar-open">
      <div className={`mi-goals-panel ${isActive ? 'active' : ''}`}>
        <JordanSidebarHeader
          proactivity={proactivity}
          companionRef={companionRef}
          onRequestQuestion={onRequestCollabQuestion}
          isAlexActive={isAlexActive}
          collabSuggestion={collabSuggestion}
          hasSentFirstMessage={hasSentFirstMessage}
          alexIntroDone={alexIntroDone}
          showCollabQuestionPrompt={showCollabQuestionPrompt}
          collabQuestionPromptText={collabQuestionPromptText}
        />

        {!isActive && collabSuggestion && (
          <div className="mi-sidebar-suggestions-section">
            <CollaborativeSuggestionCard
              key={collabSuggestion.id}
              suggestion={collabSuggestion}
              onAcceptQuery={onAcceptCollabSuggestion}
              onDismiss={onDismissCollabSuggestion}
              onEvalResponse={onCollabEvalResponse}
              onAcceptGoal={onAcceptCollabGoal}
              onSaveNote={onSaveCollabNote}
              onOpenSource={onOpenSource}
              proactivity={proactivity}
            />
          </div>
        )}

        <GoalsSection
          proactivity={proactivity}
          goalObjects={goalObjects}
          coveredGoals={coveredGoals}
          goalNotes={goalNotes}
          pendingGoalNotes={pendingGoalNotes}
          onToggleGoalCovered={onToggleGoalCovered}
          onSavePendingGoalNote={onSavePendingGoalNote}
          onDismissPendingGoalNote={onDismissPendingGoalNote}
          onAddManualNote={onAddManualNote}
          availableSources={availableSources}
          onOpenSource={onOpenSource}
          isAlexActive={isAlexActive}
        />
      </div>
    </aside>
  )
}

function JordanSidebarHeader({
  proactivity,
  companionRef,
  onRequestQuestion,
  isAlexActive,
  collabSuggestion,
  hasSentFirstMessage,
  alexIntroDone,
  showCollabQuestionPrompt,
  collabQuestionPromptText,
}) {
  const isActive = proactivity === 'active'
  const isPassive = proactivity === 'passive'
  const helperText =
    proactivity === 'passive'
      ? "I'll track your goals, save notes, attach sources, and suggest questions automatically."
      : proactivity === 'collaborative'
        ? 'I can help suggest questions and notes, but you have the final say.'
        : 'Use the space below to track your own goals and notes.'

  return (
    <div className="mi-collab-jordan-header mi-jordan-sidebar-header">
      <div className="mi-jordan-stage-header">
        <div className="mi-jordan-stage-avatar">
          <div
            className="virtual-companion"
            id="virtualcompanion"
            ref={companionRef}
          />
        </div>

        <div className="mi-jordan-stage-text">
          <h3>Jordan</h3>
          <p>{helperText}</p>
        </div>
      </div>

      {!isActive &&
        !isAlexActive &&
        !isPassive &&
        alexIntroDone &&
        (!hasSentFirstMessage || showCollabQuestionPrompt) &&
        !collabSuggestion && (
          <div className="mi-collab-question-btn">
            <p>
              <FontAwesomeIcon icon={faLightbulb} />
              <span>{collabQuestionPromptText || 'Not sure what to ask?'}</span>
            </p>

            <button
              type="button"
              className="mi-nudge-btn mi-nudge-btn-primary mi-nudge-btn-suggestion"
              onClick={onRequestQuestion}
              disabled={isAlexActive}
            >
              Suggest a question
            </button>
          </div>
        )}
    </div>
  )
}

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
          goalId={goalId}
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
  onOpenSource,
  proactivity,
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
                      onClick={() => setGoalDecision('open')}
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
                        onClick={() => setNoteDecision('dismissed')}
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
                onClick={() => setRequestedExtraSuggestion(true)}
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

function AlexHeader({
  doctorRef,
  isAlexActive,
  sources,
  showCards,
  talkingPoints,
  showTalkingPoints,
  introCue,
  proactivity,
  onOpenSource,
}) {
  const uniqueSources = dedupeSources(sources)
  return (
    <div
      className={`mi-chat-header ${isAlexActive ? 'mi-alex-area-active' : ''}`}
    >
      <div className="mi-avatar-alex">
        {showCards && <SwipingCards />}
        <div className="virtual-doctor" id="virtualdoctor" ref={doctorRef} />

        <div className="alex-title-area">
          <span className="mi-eyebrow">Chatting with</span>
          <h2>Alex</h2>
        </div>

        {introCue?.type === 'goals-review' && (
          <div className="alex-goals-review-card">
            <div className="alex-goals-paper">
              <div className="alex-goals-paper-title">Your goals</div>
              <div className="alex-goals-paper-line" />
              <div className="alex-goals-paper-line short" />
              <div className="alex-goals-paper-line" />
            </div>
          </div>
        )}

        {introCue?.type === 'boundary' && (
          <div
            className={`alex-intro-visual-card alex-intro-visual-card-${proactivity}`}
          >
            <div className="alex-search-icon">
              <FontAwesomeIcon icon={faClipboardList} size="5x" />

              <div className="alex-search-ban">
                <FontAwesomeIcon icon={faBan} />
              </div>
            </div>
          </div>
        )}

        {introCue?.type === 'sources' && (
          <div
            className={`alex-intro-visual-card alex-intro-visual-card-${proactivity}`}
          >
            <div
              className={`alex-source-stack alex-source-stack-${proactivity}`}
            >
              <div className="alex-source-step alex-source-step-1">
                <FontAwesomeIcon icon={faMagnifyingGlass} size="3x" />
              </div>

              <div className="alex-source-step alex-source-step-2">
                <FontAwesomeIcon icon={faObjectGroup} size="3x" />
              </div>

              <div className="alex-source-step alex-source-step-3">
                <FontAwesomeIcon icon={faListCheck} size="3x" />
              </div>
            </div>
          </div>
        )}

        {uniqueSources.length > 0 && (
          <div className={`alex-source-panel alex-source-panel-${proactivity}`}>
            <span className="alex-source-label">Trusted sources checked</span>

            <div className="alex-source-list">
              {uniqueSources.map((source, index) => (
                <button
                  key={getSourceKey(source)}
                  type="button"
                  className="alex-source-chip alex-source-chip-verified"
                  style={{ animationDelay: `${index * 120}ms` }}
                  title={source.relevance_explanation}
                  onClick={() => onOpenSource(source)}
                >
                  <FontAwesomeIcon icon={faCheck} />
                  {source.source} - {source.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {isAlexActive && showTalkingPoints && talkingPoints?.length > 0 && (
          <div
            className={`alex-talking-points alex-talking-points-${proactivity}`}
          >
            {talkingPoints.map((point, index) => (
              <div
                className="alex-talking-point"
                style={{
                  animationDelay: `${index * 550}ms`,
                }}
                key={`${point}-${index}`}
              >
                <FontAwesomeIcon icon={faCheck} />
                <span>{point}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MessageThread({
  messages,
  chatEndRef,
  proactivity,
  companionRef,
  onOpenGoals,
  onAcceptQuerySuggestion,
  onDismissNudge,
  onInlineEvalResponse,
  onResolveNudge,
}) {
  const messagesRef = useRef(null)
  const passiveJordanRef = useRef(null)

  const activeNudge = [...messages]
    .reverse()
    .find((message) => message.from === 'jordan-nudge')

  useEffect(() => {
    if (proactivity !== 'passive') return
    if (!messagesRef.current || !passiveJordanRef.current) return

    let cancelled = false

    function positionJordan() {
      if (cancelled) return
      if (!messagesRef.current || !passiveJordanRef.current) return
      if (!activeNudge) return

      const nudgeEl = messagesRef.current.querySelector(
        `[data-jordan-nudge-id="${activeNudge.id}"]`,
      )

      if (!nudgeEl) return

      const containerRect = messagesRef.current.getBoundingClientRect()
      const nudgeRect = nudgeEl.getBoundingClientRect()

      const x = Math.max(8, nudgeRect.left - containerRect.left - 95)
      const y =
        nudgeRect.top - containerRect.top + messagesRef.current.scrollTop

      passiveJordanRef.current.style.transform = `translate(${x}px, ${y}px)`
    }

    const frame1 = requestAnimationFrame(() => {
      positionJordan()

      requestAnimationFrame(() => {
        positionJordan()
      })
    })

    messagesRef.current.addEventListener('scroll', positionJordan)
    window.addEventListener('resize', positionJordan)

    return () => {
      cancelled = true
      cancelAnimationFrame(frame1)
      messagesRef.current?.removeEventListener('scroll', positionJordan)
      window.removeEventListener('resize', positionJordan)
    }
  }, [messages, activeNudge, proactivity])

  return (
    <div className="mi-messages" ref={messagesRef}>
      {messages.map((message) => {
        if (message.from === 'jordan-nudge') {
          return (
            <JordanNudge
              key={message.id}
              msg={message}
              onAcceptQuery={() => {
                onAcceptQuerySuggestion(message)
                onResolveNudge(message.id, 'used')
              }}
              onDismiss={() => onDismissNudge(message.id, 'dismissed', message)}
              onEvalYes={() => onInlineEvalResponse(message.id, 'yes')}
              onEvalNo={() => onInlineEvalResponse(message.id, 'no')}
              onOpenGoals={onOpenGoals}
              proactivity={proactivity}
            />
          )
        }

        return <ChatMessage key={message.id} message={message} />
      })}

      <div ref={chatEndRef} />
    </div>
  )
}

function ChatMessage({ message }) {
  return (
    <div className={`mi-msg mi-msg-${message.from}`}>
      <span className="mi-msg-sender">
        {message.from === 'alex' ? 'Alex' : 'You'}
      </span>

      <div className="mi-msg-bubble">{message.text}</div>
    </div>
  )
}

function ChatInput({
  input,
  textareaRef,
  onChange,
  onFocus,
  onSubmit,
  disabled = false,
}) {
  return (
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
          onFocus={onFocus}
          placeholder={
            disabled
              ? 'Please wait while Alex is speaking...'
              : 'Type your message to Alex here...'
          }
          rows={3}
          disabled={disabled}
        />
      </div>

      <button type="submit" className="send-button" disabled={disabled}>
        <FontAwesomeIcon icon={faPaperPlane} />
        <span>Send</span>
      </button>
    </form>
  )
}

function SourcePopout({ source, onClose }) {
  return (
    <div className="source-popout-overlay" onClick={onClose}>
      <div className="source-popout" onClick={(e) => e.stopPropagation()}>
        <div className="source-popout-header">
          <div>
            <h3>Source Preview</h3>
          </div>

          <button type="button" onClick={onClose}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="source-preview-card">
          <div className="source-preview-site">
            <p>
              <span>Source</span>{' '}
              {source.source || 'Trusted clinical trials resource'}
            </p>
            <p>
              <span>Source Title</span>{' '}
              {source.title || source.source || source.file}
            </p>
            <p>
              <span>Source Snippet</span>{' '}
              {source.content && (
                <div className="source-popout-content">
                  {source.content.slice(0, 900)}
                  {source.content.length > 900 ? '…' : ''}
                </div>
              )}
            </p>
          </div>
          <div className="source-link-later-note">
            Jordan will save this resource with your notes. You can receive the
            full link at the end of the activity.
          </div>
        </div>
      </div>
    </div>
  )
}

function HistoryModal({ messages, onClose }) {
  return (
    <div className="history-overlay" onClick={onClose}>
      <div className="history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="history-modal-header">
          <span>Conversation history</span>
          <button className="history-close-btn" onClick={onClose}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="history-modal-body">
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

function JordanNudge({
  msg,
  proactivity,
  onOpenGoals,
  onAcceptQuery,
  onDismiss,
  onEvalYes,
  onEvalNo,
}) {
  return (
    <div
      className={`mi-nudge${msg.resolved ? ' mi-nudge-resolved' : ''}`}
      data-jordan-nudge-id={msg.id}
    >
      <FontAwesomeIcon icon={faLightbulb} className="mi-nudge-icon" />

      <div className="mi-nudge-body">
        <span className="mi-nudge-text">{msg.text}</span>

        {msg.suggestion && (
          <div className="mi-nudge-suggestion">{msg.suggestion}</div>
        )}

        {!msg.resolved && msg.nudgeType === 'query' && (
          <div className="mi-nudge-actions">
            <button
              type="button"
              className="mi-nudge-btn mi-nudge-btn-primary"
              onClick={onAcceptQuery}
            >
              Use this
            </button>

            <button type="button" className="mi-nudge-btn" onClick={onDismiss}>
              No thanks
            </button>

            {proactivity === 'passive' && (
              <button
                type="button"
                className="mi-passive-goals-link"
                onClick={onOpenGoals}
              >
                <FontAwesomeIcon icon={faBullseye} className="mi-nudge-icon" />
                View my goals
              </button>
            )}
          </div>
        )}

        {!msg.resolved && msg.nudgeType === 'eval' && (
          <div className="mi-nudge-actions">
            <button
              type="button"
              className="mi-nudge-btn mi-nudge-btn-primary"
              onClick={onEvalYes}
            >
              Yes
            </button>

            <button type="button" className="mi-nudge-btn" onClick={onEvalNo}>
              Not quite
            </button>

            {proactivity === 'passive' && (
              <button
                type="button"
                className="mi-passive-goals-link"
                onClick={onOpenGoals}
              >
                <FontAwesomeIcon icon={faBullseye} className="mi-nudge-icon" />
                View my goals
              </button>
            )}
          </div>
        )}

        {msg.resolved && (
          <span className="mi-nudge-resolution">{msg.resolution}</span>
        )}
      </div>
    </div>
  )
}
