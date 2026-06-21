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
import { initCompanionCharacter, initDoctorCharacter } from '../character.js'

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

const INITIAL_ALEX_MESSAGE =
  "Hi, I'm Dr. Alex. Ask me anything about clinical trials, and I'll help walk you through it."

const MOCK_ALEX_RESPONSE =
  "That's a great question. I'll answer this using the clinical trial information we have."

let nextId = 1
const uid = () => nextId++

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

  // Active condition only:
  // null | "notes" | "query" | "eval"
  const [openJordanPanel, setOpenJordanPanel] = useState(null)

  // Collaborative condition only:
  // null | { type: "query" | "eval", ... }
  const [collabSuggestion, setCollabSuggestion] = useState(null)

  const [proactivity, setProactivity] = useState('passive')
  const [showHistory, setShowHistory] = useState(false)
  const [input, setInput] = useState('')
  const [coveredGoals, setCoveredGoals] = useState(new Set())
  const [messages, setMessages] = useState([
    {
      id: uid(),
      from: 'alex',
      text: INITIAL_ALEX_MESSAGE,
    },
  ])

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
      } catch (err) {
        console.error('Main interaction init failed:', err)
      }
    }

    initCharacters()
  }, [])

  useEffect(() => {
    if (proactivity !== 'passive') return

    const timer = setTimeout(() => {
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
            suggestion: 'What should I know first about clinical trials?',
          },
        ]
      })
    }, 900)

    return () => clearTimeout(timer)
  }, [proactivity])

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

  /* ------------------------------------------------------------------------ */
  /* Query support                                                            */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    clearTimeout(queryPauseTimer.current)

    if (proactivity !== 'collaborative' && proactivity !== 'passive') return
    if (!input.trim() || queryNudgeShownForDraft.current) return

    queryPauseTimer.current = setTimeout(() => {
      pushQueryNudge()
      queryNudgeShownForDraft.current = true
    }, 2000)

    return () => clearTimeout(queryPauseTimer.current)
    // pushQueryNudge reads current input/proactivity intentionally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, proactivity])

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

  function handleManualQueryHelp() {
    queryNudgeShownForDraft.current = true
    toggleJordanPanel('query')
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

  /* ------------------------------------------------------------------------ */
  /* Message send flow                                                        */
  /* ------------------------------------------------------------------------ */

  function handleSend(e) {
    e.preventDefault()

    const trimmed = input.trim()
    if (!trimmed) return

    clearTimeout(queryPauseTimer.current)
    clearTimeout(evalPauseTimer.current)
    queryNudgeShownForDraft.current = false
    clearJordanUI()
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

    // Remove any outstanding query-writing suggestions
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

    handlePossibleGoalDrift(trimmed)

    const alexMsgId = uid()

    // Mocked Alex response — replace with API call later.
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: alexMsgId,
          from: 'alex',
          text: MOCK_ALEX_RESPONSE,
        },
      ])

      scheduleEvalNudge(alexMsgId)
    }, 600)
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
          coveredGoalsCount={coveredGoals.size}
          getQuerySuggestion={getQuerySuggestion}
          getLastAlexMessage={getLastAlexMessage}
          onTogglePanel={toggleJordanPanel}
          onClosePanel={closeJordanPopup}
          onManualQueryHelp={handleManualQueryHelp}
          onAcceptQuerySuggestion={acceptQuerySuggestion}
          onActiveEvalResponse={handleActiveEvalResponse}
        />
      )}

      <Topbar
        proactivity={proactivity}
        onChange={(nextProactivity) => {
          setProactivity(nextProactivity)
          clearJordanUI()
        }}
      />

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
                  className={`mi-goal-chip${
                    coveredGoals.has(label) ? ' mi-goal-chip-covered' : ''
                  }`}
                >
                  <span>{label}</span>
                  {coveredGoals.has(label) && (
                    <FontAwesomeIcon
                      icon={faCheck}
                      className="mi-goal-chip-check"
                    />
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
        />

        <section className="mi-chat-card fade-in-up">
          <AlexHeader doctorRef={doctorRef} />

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
  getLastAlexMessage,
  onTogglePanel,
  onClosePanel,
  onManualQueryHelp,
  onAcceptQuerySuggestion,
  onActiveEvalResponse,
}) {
  return (
    <div className="mi-jordan-active-area">
      {openJordanPanel === 'query' && (
        <div className="mi-dock-nudge">
          <div className="mi-dock-nudge-content">
            <span className="mi-dock-nudge-text">
              Want help wording that question?
            </span>

            <div className="mi-dock-nudge-suggestion">
              {getQuerySuggestion()}
            </div>

            <div className="mi-dock-nudge-actions">
              <button
                type="button"
                className="mi-nudge-btn mi-nudge-btn-primary"
                onClick={() => onAcceptQuerySuggestion(getQuerySuggestion())}
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

      {openJordanPanel === 'eval' && (
        <div className="mi-dock-nudge">
          <div className="mi-dock-nudge-content">
            <span className="mi-dock-nudge-text">
              Did Dr. Alex's answer help?
            </span>

            <div className="mi-dock-nudge-actions">
              <button
                type="button"
                className="mi-nudge-btn mi-nudge-btn-primary"
                onClick={() => onActiveEvalResponse('yes')}
              >
                Yes
              </button>

              <button
                type="button"
                className="mi-nudge-btn"
                onClick={() => onActiveEvalResponse('no')}
              >
                Not quite
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

          <button
            type="button"
            className="mi-jordan-action-btn"
            onClick={() => onTogglePanel('eval')}
            aria-label="Ask Jordan about Dr. Alex's answer"
            disabled={!getLastAlexMessage()}
          >
            <FontAwesomeIcon icon={faCommentMedical} />
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

function GoalChip({ label, covered }) {
  return (
    <div className={`mi-goal-chip${covered ? ' mi-goal-chip-covered' : ''}`}>
      <span>{label}</span>

      {covered && (
        <FontAwesomeIcon icon={faCheck} className="mi-goal-chip-check" />
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

function AlexHeader({ doctorRef }) {
  return (
    <div className="mi-chat-header">
      <div className="mi-avatar-alex">
        <div className="virtual-doctor" id="virtualdoctor" ref={doctorRef} />
        <div className="alex-title-area">
          <span className="mi-eyebrow">Chatting with</span>
          <h2>Dr. Alex</h2>
        </div>
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
          </div>
        )}

        {msg.resolved && (
          <span className="mi-nudge-resolution">{msg.resolution}</span>
        )}

        {proactivity === 'passive' && (
          <button
            type="button"
            className="mi-passive-goals-link"
            onClick={onOpenGoals}
          >
            View my goals
          </button>
        )}
      </div>
    </div>
  )
}
