import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import '../css/MainInteraction.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPaperPlane,
  faBullseye,
  faCommentDots,
  faXmark,
  faCheck,
  faHandHoldingHeart,
  faPenToSquare,
  faCommentMedical,
} from '@fortawesome/free-solid-svg-icons'
import {
  initCompanionCharacter,
  initDoctorCharacter,
  playGesture,
  speakWithLipsync,
} from '../character.js'
import SwipingCards from './SwipingCards'

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const GOAL_META = {
  'trial-basics': 'What is a clinical trial?',
  purpose: 'Purpose of this study',
  risks: 'Risks & side effects',
  benefits: 'Possible benefits',
  alternatives: 'My other options',
  randomization: 'Randomization & groups',
  eligibility: 'Eligibility',
  logistics: 'Schedule, costs & visits',
  priorities: 'What matters most to me',
  'life-fit': 'How this fits my life',
  worries: "Worries I haven't said out loud",
  weighing: "Decisions I'm still weighing",
  questions: 'Questions for my doctor',
}

const PROACTIVITY_COPY = {
  query: {
    collaborative: 'Want help wording that question?',
    passive: "Here's one way you could ask that — feel free to edit it.",
  },
  eval: {
    collaborative: 'Did that answer what you wanted to know?',
    passive: 'That covered the basics — want to go deeper on anything?',
  },
  drift: {
    collaborative: (name) =>
      `This looks a little different from "${name}" — want to add it to your goals?`,
    passive: (name) =>
      `Heads up — that's outside "${name}." Adding it to your goals so we don't lose track of it.`,
  },
}

const MOCK_ALEX_RESPONSE =
  "That's a great question. I'll answer this using the clinical trial information we have."

const uid = () => crypto.randomUUID()

/* -------------------------------------------------------------------------- */
/* Small helpers                                                              */
/* -------------------------------------------------------------------------- */

function wordsOf(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 3)
}

// Placeholder drift detection — replace with real NLP / API logic later.
function detectDrift(message, goalLabels) {
  if (goalLabels.length === 0) return null

  const msgWords = new Set(wordsOf(message))
  if (msgWords.size < 3) return null

  for (const label of goalLabels) {
    const overlapsGoal = wordsOf(label).some((word) => msgWords.has(word))
    if (overlapsGoal) return null
  }

  return goalLabels[0]
}

/* -------------------------------------------------------------------------- */
/* Main component                                                             */
/* -------------------------------------------------------------------------- */

export default function MainInteraction() {
  const BASE_URL = 'http://127.0.0.1:8000'
  // const BASE_URL = 'https://brcco3c42yqwcnqmvj4h2k2igu0fysxd.lambda-url.us-east-1.on.aws'
  const location = useLocation()
  const goals = location.state ?? { selectedGoals: [], customGoals: [] }

  const doctorRef = useRef(null)
  const companionRef = useRef(null)
  const chatEndRef = useRef(null)
  const textareaRef = useRef(null)
  const pendingPassiveDrift = useRef(null)

  const queryPauseTimer = useRef(null)
  const evalPauseTimer = useRef(null)
  const queryNudgeShownForDraft = useRef(false)

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
  const [proactivity, setProactivity] = useState('active')
  const [showHistory, setShowHistory] = useState(false)
  const [input, setInput] = useState('')
  const [coveredGoals, setCoveredGoals] = useState(new Set())
  const [messages, setMessages] = useState([])

  const goalLabels = [
    ...(goals?.selectedGoals || []).map((id) => GOAL_META[id] || id),
    ...(goals?.customGoals || []),
  ]

  const jordanPopupOpen = openJordanPanel !== null

  /* ------------------------------------------------------------------------ */
  /* Character setup + scroll behavior                                        */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    async function initCharacters() {
      try {
        await initDoctorCharacter(doctorRef.current)
        if (companionRef.current) {
          await initCompanionCharacter(companionRef.current)
        }

        console.log('GOALS ARE', goals)
        const triggerFirstAlexResponse = `You are a Dr. Alex, a virtual health assistant n. You are introducing yourself and starting the conversation. Here are their information seeking goals: ${goals.selectedGoals}, ${goals.customGoals}. Briefly acknowledge you received their goals and summarize them. Then, ask the user where they'd like to start. Keep your response to 80 words or less.`

        const firstAlexPrompt = `
          You are Dr. Alex, a warm and approachable virtual health assistant helping cancer patients learn about clinical trials as a treatment option.
          You are starting the conversation.

          The user's information-seeking goals are:
          Selected goals:
          ${goals?.selectedGoals?.join(', ') || 'None'}

          Custom goals:
          ${goals?.customGoals?.join(', ') || 'None'}

          Your role is to:
          - Help the user understand clinical trials and related topics.
          - Help find, summarize, and organize information from trusted clinical-trial resources.
          - Avoid asking for the user's diagnosis or personal medical details.
          - Avoid providing treatment recommendations or medical advice.
          - Avoid searching for specific clinical trials.
          - Avoid determining whether a particular trial is appropriate for the user.

          Write exactly 4 sentences, in this exact order, and keep the full response under 80 words:
          1. Introduce yourself as Dr. Alex.
          2. Explain that your goal is to help find, summarize, and organize information about clinical trials from trusted sources. Briefly explain that you do not identify specific trials or determine whether a trial is a good fit because you do not collect personal medical details and those decisions are best discussed with healthcare providers or study teams.
          3. Show that you reviewed the user's goals. Mention 2–3 examples from their goals, but frame them as examples rather than a complete list. Use language such as "topics like," "including," or "such as" so the user understands you reviewed all of their goals.
          4. Ask one question about where the user would like to begin.

          Do not use bullet points.
          Do not list all of the user's goals.
          Do not repeat the goals word-for-word.
          Be conversational, supportive, concise, and easy to understand.
          `
        try {
          const response = await fetch(`${BASE_URL}/simple-chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: firstAlexPrompt,
            }),
          })
          const data = await response.json()
          console.log('RESPONSE IS', data)

          setMessages((prev) => [
            ...prev,
            {
              id: uid(),
              from: 'alex',
              text: data.reply,
              sources: [],
              explanation: null,
              confidence: null,
            },
          ])
          setIsAlexActive(true)
          // await speakWithLipsync(data.reply, 'doctor')
          setIsAlexActive(false)
          setAlexIntroDone(true)
        } catch (err) {
          console.log(err)
        }
      } catch (err) {
        console.error('Main interaction init failed:', err)
      }
    }

    initCharacters()
  }, [])

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

      setMessages((prev) => {
        const alreadySuggested = prev.some(
          (message) =>
            message.from === 'jordan-nudge' &&
            message.nudgeType === 'query' &&
            message.isOpeningSuggestion,
        )

        if (alreadySuggested) return prev

        return [
          ...prev,
          {
            id: uid(),
            from: 'jordan-nudge',
            nudgeType: 'query',
            type: 'query',
            isOpeningSuggestion: true,
            text: "Not sure where to start? Here's a question you could ask.",
            suggestion,
          },
        ]
      })
    }, 900)

    return () => clearTimeout(timer)
  }, [proactivity, alexIntroDone, goals])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /* ------------------------------------------------------------------------ */
  /* Jordan panel helpers                                                     */
  /* ------------------------------------------------------------------------ */

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
      : 'What would you like to ask Dr. Alex about first?'
  }

  function getLastAlexMessage() {
    return [...messages].reverse().find((message) => message.from === 'alex')
  }

  async function generateJordanOpeningSuggestion() {
    let suggestion = 'What should I know first about clinical trials?'

    try {
      const firstJordanPrompt = `
      You are Jordan, a helpful virtual companion helping a patient start a conversation with Dr. Alex about clinical trial participation concepts.

      The user's goals are:
      Goals: ${goalLabels.join(', ') || 'None'}
      Already covered goals: ${Array.from(coveredGoals).join(', ') || 'None'}

      Write ONE short question the user could ask Dr. Alex first.
      Make it specific to one of their goals.
      The question should be meaningful and related to the goal, not just the goal title turned into a question.
      The question should ask about a practical detail, concern, tradeoff, or decision the user might actually have.
      Use the user's voice.
      Return only the question without any quotations.
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

  // useEffect(() => {
  //   clearTimeout(queryPauseTimer.current)

  //   if (proactivity !== 'collaborative' && proactivity !== 'passive') return
  //   if (!input.trim() || queryNudgeShownForDraft.current) return

  //   queryPauseTimer.current = setTimeout(() => {
  //     pushQueryNudge()
  //     queryNudgeShownForDraft.current = true
  //   }, 2000)

  //   return () => clearTimeout(queryPauseTimer.current)
  //   // pushQueryNudge reads current input/proactivity intentionally.
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [input, proactivity])

  function makeQueryNudge() {
    const text =
      proactivity === 'passive'
        ? PROACTIVITY_COPY.query.passive
        : PROACTIVITY_COPY.query.collaborative

    return {
      id: uid(),
      type: 'query',
      from: 'jordan-nudge',
      nudgeType: 'query',
      text,
      suggestion: getQuerySuggestion(),
    }
  }

  function pushQueryNudge() {
    const nudge = makeQueryNudge()

    if (proactivity === 'active') {
      toggleJordanPanel('query')
      return
    }

    if (proactivity === 'collaborative') {
      setCollabSuggestion(nudge)
      return
    }

    // Passive: Jordan appears inline in the chat.
    setMessages((prev) => [...prev, nudge])
  }

  async function handleManualQueryHelp() {
    queryNudgeShownForDraft.current = true
    setActiveQueryLoading(true)
    setOpenJordanPanel('query')

    const suggestion = await generateJordanOpeningSuggestion()

    setActiveQuerySuggestion(suggestion)
    setActiveQueryLoading(false)
  }

  function handleInputChange(value) {
    setInput(value)

    queryNudgeShownForDraft.current = false

    setMessages((prev) =>
      prev.filter(
        (message) =>
          !(
            message.from === 'jordan-nudge' &&
            message.nudgeType === 'query' &&
            !message.resolved
          ),
      ),
    )
  }

  function acceptQuerySuggestion(suggestion) {
    setInput(suggestion)
    textareaRef.current?.focus()
    closeJordanPopup()
  }

  function acceptCollabSuggestion() {
    if (!collabSuggestion || collabSuggestion.type !== 'query') return

    setInput(collabSuggestion.suggestion)
    textareaRef.current?.focus()
    setCollabSuggestion(null)
  }

  function dismissCollabSuggestion() {
    setCollabSuggestion(null)
  }

  /* ------------------------------------------------------------------------ */
  /* Evaluation/check-in support                                              */
  /* ------------------------------------------------------------------------ */

  function addGoalNote(goalId, noteText) {
    if (!noteText) return

    setGoalNotes((prev) => ({
      ...prev,
      [goalId]: [
        ...(prev[goalId] || []),
        {
          id: uid(),
          text: noteText,
        },
      ],
    }))

    setCoveredGoals((prev) => new Set(prev).add(goalId))
  }

  function scheduleEvalNudge(alexMessageId) {
    clearTimeout(evalPauseTimer.current)

    if (proactivity === 'active') return

    if (proactivity === 'passive') {
      evalPauseTimer.current = setTimeout(() => {
        pushEvalNudge(alexMessageId)
      }, 700)
      return
    }

    evalPauseTimer.current = setTimeout(() => {
      pushEvalNudge(alexMessageId)
    }, 4000)
  }

  function showJordanSuggestion(suggestion) {
    if (proactivity === 'active') {
      setActiveJordanSuggestion(suggestion)

      if (suggestion.type === 'query' && suggestion.suggestion) {
        setActiveQuerySuggestion(suggestion.suggestion)
        setOpenJordanPanel('query')
        return
      }

      if (suggestion.type === 'eval') {
        setOpenJordanPanel('eval')
        return
      }

      return
    }

    if (proactivity === 'collaborative') {
      setCollabSuggestion(suggestion)
      return
    }

    setMessages((prev) => [
      ...prev,
      {
        ...suggestion,
        from: 'jordan-nudge',
        nudgeType: suggestion.type,
        resolved: false,
        followWithJordan: true,
      },
    ])
  }

  function handleGoalEvalResult(evalData, alexMsgId) {
    const matches = evalData.matches || []

    if (matches.length === 0) {
      const text =
        evalData.all_goals_covered_message ||
        evalData.no_match_jordan_message ||
        "That didn't seem connected to your goals yet. You could ask:"

      const jordanSuggestion = {
        id: uid(),
        type: evalData.suggested_goal_question ? 'query' : 'eval',
        text,
        suggestion:
          evalData.suggested_goal_question ||
          'What else should I know about clinical trials?',
        forMessageId: alexMsgId,
      }

      showJordanSuggestion(jordanSuggestion)
      return
    }

    const goodMatches = matches.filter(
      (match) => match.user_question_relevant && match.alex_answered_question,
    )

    if (goodMatches.length === 0) {
      const jordanSuggestion = {
        id: uid(),
        type: evalData.suggested_goal_question ? 'query' : 'eval',
        text:
          evalData.next_step_message ||
          evalData.no_match_jordan_message ||
          "That didn't fully answer your goal. You could try asking:",
        suggestion:
          evalData.suggested_goal_question ||
          'What should I ask next about my clinical trial goals?',
        forMessageId: alexMsgId,
      }

      showJordanSuggestion(jordanSuggestion)
      return
    }

    const match = goodMatches[0]

    if (proactivity === 'active') {
      setCoveredGoals((prev) => new Set(prev).add(match.goal_id))

      if (match.note_to_add) {
        setPendingGoalNotes((prev) => ({
          ...prev,
          [match.goal_id]: {
            id: uid(),
            text: match.note_to_add,
          },
        }))
      }
    } else if (match.note_to_add) {
      addGoalNote(match.goal_id, match.note_to_add)
    }

    if (proactivity === 'passive' && match.note_to_add) {
      addGoalNote(match.goal_id, match.note_to_add)
    }

    const nudgeText =
      evalData.all_goals_covered_message ||
      evalData.next_step_message ||
      match.jordan_message

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

    addGoalNote(activeJordanSuggestion.goalId, activeJordanSuggestion.noteToAdd)

    setActiveJordanSuggestion((prev) =>
      prev ? { ...prev, noteSaved: true } : prev,
    )
  }

  function pushEvalNudge(forMessageId) {
    const pendingDrift = pendingPassiveDrift.current
    pendingPassiveDrift.current = null
    const text =
      proactivity === 'passive'
        ? PROACTIVITY_COPY.eval.passive
        : PROACTIVITY_COPY.eval.collaborative

    if (proactivity === 'collaborative') {
      setCollabSuggestion({
        id: uid(),
        type: 'eval',
        text,
        forMessageId,
      })
      return
    }

    if (proactivity === 'passive') {
      clearUnresolvedJordanNudges()

      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          from: 'jordan-nudge',
          nudgeType: pendingDrift ? 'drift' : 'eval',
          text: pendingDrift
            ? PROACTIVITY_COPY.drift.passive(pendingDrift.driftedFrom)
            : PROACTIVITY_COPY.eval.passive,
          driftedFrom: pendingDrift?.driftedFrom,
          driftText: pendingDrift?.driftText,
          forMessageId,
        },
      ])

      return
    }

    clearUnresolvedJordanNudges()

    // Passive: Jordan appears inline in the chat.
    setMessages((prev) => [
      ...prev,
      {
        id: uid(),
        from: 'jordan-nudge',
        nudgeType: 'eval',
        text,
        forMessageId,
      },
    ])
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

  function handleActiveEvalResponse(answer) {
    closeJordanPopup()

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

  function handleAddDrifted(goalText) {
    setCoveredGoals((prev) => new Set(prev).add(goalText))
  }

  function makeGoalRelevantSuggestion() {
    const uncoveredGoal =
      goalLabels.find((label) => !coveredGoals.has(label)) || goalLabels[0]

    if (!uncoveredGoal) {
      return 'What should I know first about clinical trials?'
    }

    return `Can you tell me about ${uncoveredGoal.toLowerCase()}?`
  }

  /* ------------------------------------------------------------------------ */
  /* Message send flow                                                        */
  /* ------------------------------------------------------------------------ */

  async function handleSend(e) {
    e.preventDefault()

    const trimmed = input.trim()
    if (!trimmed) return

    setIsAlexActive(true)
    playGesture('startSwiping')
    setShowCards(true)
    setAlexSources([])
    clearTimeout(queryPauseTimer.current)
    clearTimeout(evalPauseTimer.current)
    queryNudgeShownForDraft.current = false
    clearJordanUI()
    setActiveJordanSuggestion(null)
    setActiveQuerySuggestion('')
    setActiveQueryLoading(false)
    clearUnresolvedJordanNudges()

    const userMsgId = uid()

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        from: 'user',
        text: trimmed,
      },
    ])

    setInput('')

    handlePossibleGoalDrift(trimmed)

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
        }),
      })

      const data = await response.json()

      const evalResponse = await fetch(`${BASE_URL}/evaluate-goal-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_message: trimmed,
          alex_answer: data.answer,
          goals: goalLabels.map((label) => ({
            id: label,
            title: label,
            addressed: coveredGoals.has(label),
            notes: [],
          })),
          condition: proactivity,
        }),
      })

      const evalData = await evalResponse.json()

      console.log('***EVAL DATA IS', evalData)

      setAlexSources(data.sources || [])

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

      console.log('Sources', data.sources)
      playGesture('stopSwiping')
      setShowCards(false)

      // await speakWithLipsync(data.answer, 'doctor')
      setIsAlexActive(false)

      handleGoalEvalResult(evalData, alexMsgId)
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
    }
  }

  function clearUnresolvedJordanNudges() {
    setMessages((prev) =>
      prev.filter(
        (message) =>
          !(
            message.from === 'jordan-nudge' &&
            !message.resolved &&
            ['query', 'eval', 'drift'].includes(message.nudgeType)
          ),
      ),
    )
  }

  function savePendingGoalNote(goalId) {
    const pendingNote = pendingGoalNotes[goalId]
    if (!pendingNote) return

    addGoalNote(goalId, pendingNote.text)

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

  function handlePossibleGoalDrift(userMessage) {
    if (proactivity === 'active') return

    const driftedFrom = detectDrift(userMessage, goalLabels)
    if (!driftedFrom) return

    // Passive: store it, but DO NOT show it yet.
    // It will appear after Dr. Alex responds.
    if (proactivity === 'passive') {
      pendingPassiveDrift.current = {
        driftedFrom,
        driftText: userMessage,
      }

      handleAddDrifted(userMessage)
      return
    }

    // Collaborative: show drift nudge normally.
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          from: 'jordan-nudge',
          nudgeType: 'drift',
          text: PROACTIVITY_COPY.drift.collaborative(driftedFrom),
          driftedFrom,
          driftText: userMessage,
        },
      ])
    }, 1200)
  }

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className={`mi-root mi-root-${proactivity}`}>
      <button className="history-btn" onClick={() => setShowHistory(true)}>
        <FontAwesomeIcon icon={faCommentDots} size="sm" />
        Chat history
      </button>

      {proactivity === 'active' && (
        <ActiveJordanDock
          companionRef={companionRef}
          openJordanPanel={openJordanPanel}
          coveredGoalsCount={Object.keys(pendingGoalNotes).length}
          getQuerySuggestion={getQuerySuggestion}
          activeQuerySuggestion={activeQuerySuggestion}
          activeQueryLoading={activeQueryLoading}
          onTogglePanel={toggleJordanPanel}
          onClosePanel={closeJordanPopup}
          onManualQueryHelp={handleManualQueryHelp}
          onAcceptQuerySuggestion={acceptQuerySuggestion}
          activeJordanSuggestion={activeJordanSuggestion}
          onActiveSaveNote={handleActiveSaveNote}
        />
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
              <button type="button" onClick={closeJordanPopup}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="mi-goals-list">
              {goalLabels.map((label) => (
                <div
                  key={label}
                  className={`mi-goal-chip mi-goal-chip-with-notes${
                    coveredGoals.has(label) ? ' mi-goal-chip-covered' : ''
                  }`}
                >
                  <div className="mi-goal-chip-main">
                    <span>{label}</span>

                    {coveredGoals.has(label) && (
                      <FontAwesomeIcon
                        icon={faCheck}
                        className="mi-goal-chip-check"
                      />
                    )}
                  </div>

                  {goalNotes[label]?.length > 0 && (
                    <div className="mi-goal-notes">
                      {goalNotes[label].map((note) => (
                        <div key={note.id} className="mi-goal-note">
                          {note.text}
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
          goalLabels={goalLabels}
          coveredGoals={coveredGoals}
          collabSuggestion={collabSuggestion}
          onAcceptCollabSuggestion={acceptCollabSuggestion}
          onDismissCollabSuggestion={dismissCollabSuggestion}
          onCollabEvalResponse={handleCollabEvalResponse}
          pendingGoalNotes={pendingGoalNotes}
          onSavePendingGoalNote={savePendingGoalNote}
          onDismissPendingGoalNote={dismissPendingGoalNote}
          goalNotes={goalNotes}
        />

        <section className="mi-chat-card fade-in-up">
          <AlexHeader
            doctorRef={doctorRef}
            isAlexActive={isAlexActive}
            sources={alexSources}
            showCards={showCards}
          />

          <MessageThread
            messages={messages}
            chatEndRef={chatEndRef}
            proactivity={proactivity}
            companionRef={companionRef}
            onOpenGoals={() => toggleJordanPanel('notes')}
            onAcceptQuerySuggestion={acceptQuerySuggestion}
            onDismissNudge={resolveNudge}
            onInlineEvalResponse={handleInlineEvalResponse}
            onAddDrift={handleAddDrifted}
            onResolveNudge={resolveNudge}
          />

          <ChatInput
            input={input}
            textareaRef={textareaRef}
            onChange={handleInputChange}
            onSubmit={handleSend}
          />
        </section>
      </main>

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

function Topbar({ proactivity, onChange }) {
  return (
    <div className="mi-topbar">
      <div
        className="mi-proactivity-toggle"
        role="radiogroup"
        aria-label="Jordan proactivity condition"
      >
        {['active', 'collaborative', 'passive'].map((level) => (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={proactivity === level}
            className={`mi-proactivity-btn${
              proactivity === level ? ' mi-proactivity-btn-active' : ''
            }`}
            onClick={() => onChange(level)}
          >
            {level === 'active'
              ? 'Active'
              : level === 'collaborative'
                ? 'Collaborative'
                : 'Passive'}
          </button>
        ))}
      </div>
    </div>
  )
}

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
              {activeQueryLoading
                ? 'Thinking of a helpful question...'
                : activeJordanSuggestion?.suggestion ||
                  activeQuerySuggestion ||
                  getQuerySuggestion()}
            </div>

            <div className="mi-dock-nudge-actions">
              <button
                type="button"
                className="mi-nudge-btn mi-nudge-btn-primary"
                onClick={() =>
                  onAcceptQuerySuggestion(
                    activeJordanSuggestion?.suggestion ||
                      activeQuerySuggestion ||
                      getQuerySuggestion(),
                  )
                }
              >
                Use this
              </button>

              <button
                type="button"
                className="mi-nudge-btn"
                onClick={onClosePanel}
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
          >
            <FontAwesomeIcon icon={faPenToSquare} />
          </button>
        </div>
      </div>
    </div>
  )
}

function JordanSidebar({
  proactivity,
  openJordanPanel,
  companionRef,
  goalLabels,
  coveredGoals,
  collabSuggestion,
  onAcceptCollabSuggestion,
  onDismissCollabSuggestion,
  onCollabEvalResponse,
  pendingGoalNotes,
  onSavePendingGoalNote,
  onDismissPendingGoalNote,
  goalNotes,
}) {
  const sidebarOpen = proactivity !== 'active' || openJordanPanel === 'notes'

  return (
    <>
      {proactivity !== 'passive' && (
        <aside className={`mi-sidebar ${sidebarOpen ? 'mi-sidebar-open' : ''}`}>
          <div className="mi-goals-panel">
            {proactivity === 'collaborative' && (
              <div className="mi-collab-jordan-header">
                <div className="mi-collab-jordan-avatar">
                  <div
                    className="virtual-companion"
                    id="virtualcompanion"
                    ref={companionRef}
                  />
                </div>

                <div>
                  <h3>Jordan</h3>
                  <p>Your study companion</p>
                </div>
              </div>
            )}

            <div className="goals-area">
              <p className="mi-goals-subtext">
                {proactivity === 'collaborative'
                  ? "I'll keep track of your goals and suggest helpful questions as we go."
                  : 'Jordan is keeping track of your goals here and will take notes for you!'}
              </p>

              <div className="mi-goals-header">
                <FontAwesomeIcon icon={faBullseye} />
                <span>Your goals</span>
              </div>

              {goalLabels.length === 0 ? (
                <p className="mi-goals-empty">No goals selected yet.</p>
              ) : (
                <div className="mi-goals-list">
                  {goalLabels.map((label) => (
                    <GoalChip
                      key={label}
                      label={label}
                      covered={coveredGoals.has(label)}
                      notes={goalNotes[label] || []}
                      pendingNote={pendingGoalNotes[label]}
                      onSavePendingNote={() => onSavePendingGoalNote(label)}
                      onDismissPendingNote={() =>
                        onDismissPendingGoalNote(label)
                      }
                    />
                  ))}

                  {proactivity === 'collaborative' && collabSuggestion && (
                    <CollaborativeSuggestionCard
                      suggestion={collabSuggestion}
                      onAcceptQuery={onAcceptCollabSuggestion}
                      onDismiss={onDismissCollabSuggestion}
                      onEvalResponse={onCollabEvalResponse}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>
      )}
    </>
  )
}

function GoalChip({
  label,
  covered,
  notes,
  pendingNote,
  onSavePendingNote,
  onDismissPendingNote,
}) {
  return (
    <div className={`mi-goal-chip${covered ? ' mi-goal-chip-covered' : ''}`}>
      <span>{label}</span>

      {covered && (
        <FontAwesomeIcon icon={faCheck} className="mi-goal-chip-check" />
      )}

      {pendingNote && (
        <div className="mi-goal-pending-note">
          <div>{pendingNote.text}</div>

          <div className="mi-goal-pending-note-actions">
            <button type="button" onClick={onSavePendingNote}>
              Save note
            </button>

            <button type="button" onClick={onDismissPendingNote}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* SAVED NOTES GO HERE */}
      {notes?.length > 0 && (
        <div className="mi-goal-notes">
          {notes.map((note) => (
            <div key={note.id} className="mi-goal-note">
              {note.text}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CollaborativeSuggestionCard({
  suggestion,
  onAcceptQuery,
  onDismiss,
  onEvalResponse,
}) {
  const isQuery = suggestion.type === 'query'

  return (
    <div className="mi-collab-suggestion-card">
      <span className="mi-collab-suggestion-label">
        {isQuery ? 'Jordan suggests a question' : 'Jordan checks in'}
      </span>

      <p>{suggestion.text}</p>

      {isQuery && (
        <div className="mi-collab-suggestion-quote">
          {suggestion.suggestion}
        </div>
      )}

      <div className="mi-collab-suggestion-actions">
        {isQuery ? (
          <>
            <button
              type="button"
              className="mi-nudge-btn mi-nudge-btn-primary"
              onClick={onAcceptQuery}
            >
              Use this
            </button>

            <button type="button" className="mi-nudge-btn" onClick={onDismiss}>
              Not now
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="mi-nudge-btn mi-nudge-btn-primary"
              onClick={() => onEvalResponse('yes')}
            >
              Yes
            </button>

            <button
              type="button"
              className="mi-nudge-btn"
              onClick={() => onEvalResponse('no')}
            >
              Not quite
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function AlexHeader({ doctorRef, isAlexActive, sources, showCards }) {
  return (
    <div
      className={`mi-chat-header ${isAlexActive ? 'mi-alex-area-active' : ''}`}
    >
      <div className="mi-avatar-alex">
        {showCards && <SwipingCards />}
        <div className="virtual-doctor" id="virtualdoctor" ref={doctorRef} />

        <div className="alex-title-area">
          <span className="mi-eyebrow">Chatting with</span>
          <h2>Dr. Alex</h2>
        </div>

        {sources.length > 0 && (
          <div className="alex-source-panel">
            <span className="alex-source-label">Sources used</span>

            <div className="alex-source-list">
              {sources.map((source) => (
                <span
                  key={`${source.id}-${source.file}-${source.chunk_id}`}
                  className="alex-source-chip"
                  title={source.relevance_explanation}
                >
                  {source.source}
                </span>
              ))}
            </div>
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
  onAddDrift,
  onResolveNudge,
}) {
  const messagesRef = useRef(null)
  const passiveJordanRef = useRef(null)

  const activeNudge = [...messages]
    .reverse()
    .find((message) => message.from === 'jordan-nudge' && !message.resolved)

  useEffect(() => {
    if (proactivity !== 'passive') return
    if (!messagesRef.current || !passiveJordanRef.current) return

    let cancelled = false

    function positionJordan() {
      if (cancelled) return
      if (!messagesRef.current || !passiveJordanRef.current) return

      if (!activeNudge) {
        passiveJordanRef.current.classList.remove('mi-passive-jordan-active')
        return
      }

      const nudgeEl = messagesRef.current.querySelector(
        `[data-jordan-nudge-id="${activeNudge.id}"]`,
      )

      if (!nudgeEl) return

      passiveJordanRef.current.classList.add('mi-passive-jordan-active')

      const containerRect = messagesRef.current.getBoundingClientRect()
      const nudgeRect = nudgeEl.getBoundingClientRect()

      const x = Math.max(8, nudgeRect.left - containerRect.left - 56)
      const y =
        nudgeRect.top - containerRect.top + messagesRef.current.scrollTop

      passiveJordanRef.current.style.transform = `translate(${x}px, ${y}px)`
    }

    const frame1 = requestAnimationFrame(() => {
      positionJordan()

      const frame2 = requestAnimationFrame(() => {
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
      {proactivity === 'passive' && (
        <div
          ref={passiveJordanRef}
          className={`mi-passive-jordan-floating ${
            activeNudge ? 'mi-passive-jordan-active' : ''
          }`}
        >
          <div
            className="virtual-companion"
            id="virtualcompanion"
            ref={companionRef}
          />
        </div>
      )}

      {messages.map((message) => {
        if (message.from === 'jordan-nudge') {
          return (
            <JordanNudge
              key={message.id}
              msg={message}
              onAcceptQuery={() => onAcceptQuerySuggestion(message.suggestion)}
              onDismiss={() => onDismissNudge(message.id, 'dismissed')}
              onEvalYes={() => onInlineEvalResponse(message.id, 'yes')}
              onEvalNo={() => onInlineEvalResponse(message.id, 'no')}
              onAddDrift={() => {
                onAddDrift(message.driftText)
                onResolveNudge(message.id, 'added to goals')
              }}
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
        {message.from === 'alex' ? 'Dr. Alex' : 'You'}
      </span>

      <div className="mi-msg-bubble">{message.text}</div>
    </div>
  )
}

function ChatInput({ input, textareaRef, onChange, onFocus, onSubmit }) {
  return (
    <form className="mi-input-row" onSubmit={onSubmit}>
      <div className="mi-input-stack">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          placeholder="Ask Dr. Alex anything..."
          rows={3}
        />
      </div>

      <button type="submit" className="send-button">
        <FontAwesomeIcon icon={faPaperPlane} />
        <span>Send</span>
      </button>
    </form>
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
                  ? 'Dr. Alex'
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
  onAddDrift,
}) {
  return (
    <div
      className={`mi-nudge${msg.resolved ? ' mi-nudge-resolved' : ''}`}
      data-jordan-nudge-id={msg.id}
    >
      <FontAwesomeIcon icon={faHandHoldingHeart} className="mi-nudge-icon" />

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

        {!msg.resolved && msg.nudgeType === 'drift' && (
          <div className="mi-nudge-actions">
            <button
              type="button"
              className="mi-nudge-btn mi-nudge-btn-primary"
              onClick={onAddDrift}
            >
              Add to my goals
            </button>

            <button type="button" className="mi-nudge-btn" onClick={onDismiss}>
              Not now
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
