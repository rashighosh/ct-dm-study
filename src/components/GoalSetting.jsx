import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import logo from '../assets/logo-transparent.png'
import dralex from '../assets/dralex.png'
import '../css/GoalSetting.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowRight,
  faCheck,
  faHandHoldingHeart,
  faPlus,
  faXmark,
  faFilePen,
  faNoteSticky,
  faClipboardList,
  faBan,
  faLightbulb,
  faScaleUnbalanced,
  faCircleQuestion,
  faCode,
  faCommentNodes,
  faSquarePollHorizontal,
  faSliders,
  faVolume,
  faExpand,
} from '@fortawesome/free-solid-svg-icons'
import {
  initCompanionCharacter,
  speakWithLipsyncStatic,
  playGesture,
} from '../character.js'
import { logSession, logGoalSetting } from '../api/logging.js'

function ToggleRow({ item, checked, onToggle, accent }) {
  const label = item.label
  const description = item.description

  return (
    <button
      type="button"
      className={`gs-row gs-row-${accent}${checked ? ' gs-row-checked' : ''}`}
      onClick={() => onToggle(item.id)}
      aria-pressed={checked}
    >
      <div className="gs-row-text">
        <span className="gs-row-label">{label}</span>
        <span className="gs-row-description">{description}</span>
      </div>
      <span className={`gs-switch${checked ? ' gs-switch-on' : ''}`}>
        <span className="gs-switch-knob">
          {checked && <FontAwesomeIcon icon={faCheck} />}
        </span>
      </span>
    </button>
  )
}

function SuggestedGoalList({ title, goals, selectedGoals, onToggle }) {
  if (!goals.length) return null
  console.log('GOALS ARE', goals)

  return (
    <div className="gs-subsection">
      <h3 className="gs-subsection-title">{title}</h3>

      <div className="gs-row-list">
        {goals.map((goal) => (
          <ToggleRow
            key={goal.id}
            item={{
              id: goal.id,
              label: goal.title,
              description: goal.description,
            }}
            accent="alex"
            checked={selectedGoals.includes(goal.id)}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  )
}

function CustomGoalForm({
  customInput,
  setCustomInput,
  customGoals,
  onAddCustomGoal,
  onRemoveCustomGoal,
  title,
  placeholder,
}) {
  return (
    <div className="gs-subsection">
      <h3 className="gs-subsection-title">{title}</h3>

      <form className="gs-custom-form" onSubmit={onAddCustomGoal}>
        <input
          type="text"
          className="gs-custom-input"
          placeholder={placeholder}
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          maxLength={120}
        />

        <button
          type="submit"
          className="gs-custom-add-btn"
          disabled={!customInput.trim()}
        >
          <FontAwesomeIcon icon={faPlus} size="xs" />
          Add
        </button>
      </form>

      {customGoals.length > 0 && (
        <ul className="gs-custom-chip-list">
          {customGoals.map((goal) => (
            <li className="gs-custom-chip" key={goal.id}>
              <span>{goal.label}</span>

              <button
                type="button"
                className="gs-custom-chip-remove"
                onClick={() => onRemoveCustomGoal(goal.id)}
                aria-label={`Remove "${goal.label}"`}
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function IntroVisual({ introIcon }) {
  if (introIcon === 'doctor') {
    return (
      <div className="gs-intro-visual-card gs-intro-doctor-card">
        <img src={dralex} alt="Alex" className="gs-intro-doctor-img" />
        <span>Alex</span>
      </div>
    )
  }

  if (introIcon === 'ai') {
    return (
      <div className="gs-intro-visual-card gs-intro-decision">
        <FontAwesomeIcon
          className="gs-decision-icon gs-decision-1"
          icon={faCode}
        />
        <FontAwesomeIcon
          className="gs-decision-icon gs-decision-2"
          icon={faCommentNodes}
        />
      </div>
    )
  }

  if (introIcon === 'survey') {
    return (
      <div className="gs-intro-visual-card gs-intro-decision">
        <FontAwesomeIcon
          className="gs-decision-icon gs-decision-1"
          icon={faSquarePollHorizontal}
        />
        <FontAwesomeIcon
          className="gs-decision-icon gs-decision-2"
          icon={faSliders}
        />
      </div>
    )
  }

  if (introIcon === 'goals') {
    return (
      <div className="gs-intro-visual-card gs-intro-checklist">
        {[0, 1, 2].map((i) => (
          <div className="gs-check-row" key={i}>
            <span className="gs-check-box">
              <FontAwesomeIcon icon={faCheck} />
            </span>
            <span className="gs-check-line" />
          </div>
        ))}
      </div>
    )
  }

  if (introIcon === 'notes') {
    return (
      <div className="gs-intro-visual-card gs-intro-notes">
        <div className="gs-note-icon">
          <FontAwesomeIcon icon={faNoteSticky} size="2xl" />
          <div className="gs-note-plus">
            <FontAwesomeIcon icon={faPlus} />
          </div>
        </div>
      </div>
    )
  }

  if (introIcon === 'no-search') {
    return (
      <div className="gs-intro-visual-card">
        <div className="gs-search-icon">
          <FontAwesomeIcon icon={faClipboardList} size="2xl" />

          <div className="gs-search-ban">
            <FontAwesomeIcon icon={faBan} />
          </div>
        </div>
      </div>
    )
  }

  if (introIcon === 'decision') {
    return (
      <div className="gs-intro-visual-card gs-intro-decision">
        <FontAwesomeIcon
          className="gs-decision-icon gs-decision-1"
          icon={faScaleUnbalanced}
        />
        <FontAwesomeIcon
          className="gs-decision-icon gs-decision-2"
          icon={faCircleQuestion}
        />
        <FontAwesomeIcon
          className="gs-decision-icon gs-decision-3"
          icon={faLightbulb}
        />
      </div>
    )
  }

  return null
}

export default function GoalSetting({ onComplete }) {
  // const BASE_URL = 'http://127.0.0.1:8000'
  const BASE_URL =
    'https://brcco3c42yqwcnqmvj4h2k2igu0fysxd.lambda-url.us-east-1.on.aws'

  const [started, setStarted] = useState(false)
  const [selectedGoals, setSelectedGoals] = useState([])
  const [customGoals, setCustomGoals] = useState([]) // [{ id, label }]
  const [customInput, setCustomInput] = useState('')
  const [showDiv, setShowDiv] = useState(false)
  const [introFinished, setIntroFinished] = useState(false)
  const [introIcon, setIntroIcon] = useState(null)
  const [highlightTarget, setHighlightTarget] = useState(null) // null | 'goals' | 'continue'
  const companionRef = useRef(null)
  const introRanRef = useRef(false)
  const [isJordanSpeaking, setIsJordanSpeaking] = useState(false)
  const [suggestedGoals, setSuggestedGoals] = useState([])
  const [suggestingMoreGoals, setSuggestingMoreGoals] = useState(false)
  const [restoredProgress, setRestoredProgress] = useState(false)
  const [showAskJordanCard, setShowAskJordanCard] = useState(false)
  const [subtitle, setSubtitle] = useState('')
  const [collabSuggestionCount, setCollabSuggestionCount] = useState(3)
  const [startChecks, setStartChecks] = useState({
    volume: false,
    browser: false,
  })

  const canStart = Object.values(startChecks).every(Boolean)

  const navigate = useNavigate()

  const [searchParams] = useSearchParams()

  const participantId = searchParams.get('id') || 'R_1dt1pZa4q7EkLbw'

  const conditionParam = searchParams.get('c') || '1'

  const STORAGE_KEY = `goalSettingProgress-${participantId}-${conditionParam}`

  const CONDITION_MAP = {
    1: 'passive',
    2: 'collaborative',
    3: 'active',
  }

  const proactivity = CONDITION_MAP[conditionParam] || 'passive'

  const JORDAN_INTRO_ICON_TIMELINE = [
    { time: 4.6, icon: 'doctor', label: 'Talk with Alex' },
    { time: 10.1, icon: 'ai', label: 'Not real people' },
    { time: 14.0, icon: 'survey', label: 'Tailor survey' },
    { time: 20.0, icon: 'goals', label: 'Set goals' },
    { time: 25.0, icon: 'notes', label: 'Keep notes' },
    { time: 28.3, icon: 'no-search', label: 'No trial search' },
    { time: 35.5, icon: 'decision', label: 'Think it through' },
  ]

  useEffect(() => {
    logSession(participantId, conditionParam, proactivity).catch(console.error)
  }, [participantId, conditionParam, proactivity])

  useEffect(() => {
    if (!showDiv) return

    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        started,
        showDiv,
        introFinished,
        selectedGoals,
        customGoals,
        suggestedGoals,
        showAskJordanCard,
      }),
    )
  }, [
    STORAGE_KEY,
    started,
    showDiv,
    introFinished,
    selectedGoals,
    customGoals,
    suggestedGoals,
    showAskJordanCard,
  ])

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (!saved) return

    try {
      const parsed = JSON.parse(saved)

      setStarted(parsed.started || false)
      setShowDiv(parsed.showDiv || false)
      setIntroFinished(parsed.introFinished || false)
      setSelectedGoals(parsed.selectedGoals || [])
      setCustomGoals(parsed.customGoals || [])
      setSuggestedGoals(parsed.suggestedGoals || [])
      setShowAskJordanCard(
        proactivity === 'collaborative' && (parsed.showAskJordanCard || false),
      )
      setRestoredProgress(true)
    } catch (e) {
      console.error('Could not restore goal setting progress:', e)
    }
  }, [STORAGE_KEY])

  useEffect(() => {
    if (!started || !restoredProgress) return
    if (!companionRef.current) return

    initCompanionCharacter(companionRef.current).catch(console.error)
  }, [started, restoredProgress])

  useEffect(() => {
    if (!['passive', 'collaborative', 'active'].includes(proactivity)) return

    async function loadSuggestedGoals() {
      try {
        const res = await fetch(`${BASE_URL}/generate-initial-goals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ response_id: participantId }),
        })

        const data = await res.json()
        console.log("***User's suggested goals", data)

        const goals = data.suggestedGoals || []

        setSuggestedGoals(goals)

        if (proactivity === 'passive') {
          setSelectedGoals(goals.map((goal) => goal.id))
        }
      } catch (error) {
        console.error('Could not load suggested goals:', error)
      }
    }

    loadSuggestedGoals()
  }, [participantId, proactivity])

  useEffect(() => {
    if (!started || restoredProgress) return
    if (introRanRef.current) return
    introRanRef.current = true
    ;(async () => {
      try {
        const SHARED_JORDAN_OPENING = `
          Hi, I’m Jordan, a virtual companion. In this activity, you’ll talk with Doctor Alex, a virtual doctor, about clinical trials.
          I’ll help you get ready by setting goals for the conversation, and I’ll help keep track of useful notes as you go.
          This activity will not search for specific clinical trials or tell you whether a trial is right for you. Instead, it’s meant to help you think through what people may want to understand, ask, and consider before deciding whether to participate.
        `
        const JORDAN_INTRO_SCRIPTS = {
          passive: `First, I’ll help set up some goals for your conversation. 
          I’ve suggested a few common topics to start with here next to me.
          Feel free to change them, or click the continue button below me to meet Doctor Alex.`,

          collaborative: `First, we’ll set up some goals for your conversation together. 
          Here next to me, I've shown a few suggestions you can choose from, or you enter your own goals.
          When you feel good about them, click the continue button below me to meet Doctor Alex.`,

          active: `First, you’ll set up your own goals for the conversation. 
          Here next to me, you can add whatever goals you have in mind. You can also ask me for suggestions if you'd like.
          When you feel good about them, click the continue button below me to meet Doctor Alex.`,
        }
        await initCompanionCharacter(companionRef.current)
        const iconTimeouts = JORDAN_INTRO_ICON_TIMELINE.map(({ time, icon }) =>
          setTimeout(() => setIntroIcon(icon), time * 1000),
        )
        setIsJordanSpeaking(true)
        await playIntroWithAutoCaptions(
          '/intro-voices/companion-shared-intro.mp3',
          '/intro-voices/companion-shared-intro-timestamps.json',
          'companion',
        )
        setIsJordanSpeaking(false)
        iconTimeouts.forEach(clearTimeout)
        setIntroIcon(null)
        await new Promise((resolve) => setTimeout(resolve, 600))
        setShowDiv(true)
        setIntroFinished(true)

        const secondIntroHighlightTimeouts = [
          setTimeout(() => setHighlightTarget('goals'), 2500),
          setTimeout(() => setHighlightTarget('continue'), 7500),
          setTimeout(() => setHighlightTarget(null), 11500),
        ]

        setIsJordanSpeaking(true)
        await playIntroWithAutoCaptions(
          `/intro-voices/companion-${proactivity}-intro.mp3`,
          `/intro-voices/companion-${proactivity}-intro-timestamps.json`,
          'companion',
        )
        setIsJordanSpeaking(false)

        if (proactivity === 'collaborative') {
          setShowAskJordanCard(true)
        }

        secondIntroHighlightTimeouts.forEach(clearTimeout)
        setHighlightTarget(null)

        playGesture('lookright')
      } catch (error) {
        console.error('Init failed:', error)
      }
    })()
  }, [started, restoredProgress])

  function toggleGoal(id) {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    )
    playGesture('thumbsupQuick')
    setTimeout(() => {
      playGesture('lookright')
    }, 3000)
  }

  async function playIntroWithAutoCaptions(
    audioPath,
    timestampsPath,
    character,
  ) {
    const res = await fetch(timestampsPath)
    const words = await res.json()

    const captionTimeouts = []
    const chunkSeconds = 3

    for (
      let start = 0;
      start < words[words.length - 1].end;
      start += chunkSeconds
    ) {
      const end = start + chunkSeconds

      const captionText = words
        .filter((w) => w.start >= start && w.start < end)
        .map((w) => w.word)
        .join('')
        .trim()

      if (!captionText) continue

      captionTimeouts.push(
        setTimeout(() => setSubtitle(captionText), start * 1000),
      )
    }

    try {
      await speakWithLipsyncStatic(audioPath, timestampsPath, character)
    } finally {
      captionTimeouts.forEach(clearTimeout)
      setSubtitle('')
    }
  }

  function handleAddCustomGoal(e) {
    e.preventDefault()
    const trimmed = customInput.trim()
    if (!trimmed) return
    setCustomGoals((prev) => [
      ...prev,
      { id: `custom-${Date.now()}`, label: trimmed },
    ])
    setCustomInput('')
  }

  function handleRemoveCustomGoal(id) {
    setCustomGoals((prev) => prev.filter((g) => g.id !== id))
  }

  const totalSelected = selectedGoals.length + customGoals.length

  async function handleContinue() {
    if (totalSelected === 0) return

    const goalPayload = {
      condition: conditionParam,
      proactivity,
      selectedGoals,
      selectedGoalLabels: selectedGoals.map((id) => {
        const suggested = suggestedGoals.find((goal) => goal.id === id)
        return suggested?.title || id
      }),
      customGoals: customGoals.map((g) => g.label),

      // add these
      suggestedGoals,
      selectedSuggestedGoals: suggestedGoals.filter((goal) =>
        selectedGoals.includes(goal.id),
      ),
    }

    await logGoalSetting(participantId, goalPayload)

    const selectedGoalObjects = suggestedGoals.filter((goal) =>
      selectedGoals.includes(goal.id),
    )

    navigate('/main-interaction', {
      state: {
        participantId,
        condition: conditionParam,
        proactivity,
        selectedGoalObjects,
        customGoals,
        suggestedGoals,
      },
    })
  }

  async function handleSuggestMoreGoals() {
    if (suggestingMoreGoals) return

    if (
      proactivity === 'collaborative' &&
      collabSuggestionCount < suggestedGoals.length
    ) {
      setCollabSuggestionCount((prev) =>
        Math.min(prev + 1, suggestedGoals.length),
      )
      return
    }

    setSuggestingMoreGoals(true)

    await speakWithLipsyncStatic(
      '/intro-voices/companion-thinking-intro.mp3',
      '/intro-voices/companion-thinking-intro-timestamps.json',
      'companion',
    )

    playGesture('thinking')

    try {
      const res = await fetch(`${BASE_URL}/suggest-more-goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response_id: participantId,
          existing_goals: suggestedGoals,
        }),
      })

      const data = await res.json()
      const newGoals = data.suggestedGoals || []

      await speakWithLipsyncStatic(
        '/intro-voices/companion-doneThinking-intro.mp3',
        '/intro-voices/companion-doneThinking-intro-timestamps.json',
        'companion',
      )

      playGesture('lookright')

      setSuggestedGoals((prev) => {
        const existingIds = new Set(prev.map((goal) => goal.id))

        const uniqueNewGoals = newGoals.filter(
          (goal) => !existingIds.has(goal.id),
        )

        return [...prev, ...uniqueNewGoals]
      })

      setCollabSuggestionCount((prev) => prev + 3)
    } catch (error) {
      console.error('Could not suggest more goals:', error)
    } finally {
      setSuggestingMoreGoals(false)
    }
  }

  return (
    <div className="gs-root">
      {/* ── Start overlay ── */}
      {!started && (
        <div className="start-overlay">
          <img src={logo} className="logo" alt="Study logo" />
          <h2>Clinical Trials Education</h2>
          <h1>Chat with Virtual Characters</h1>
          <div className="information">
            In this activity, you'll learn about clinical trials with the help
            of <strong>two virtual characters</strong> (or computer-generated
            characters). The goal is to provide{' '}
            <strong>general information</strong> and help you prepare for
            conversations about clinical trials -- <strong>not</strong> to find
            a specific trial.
          </div>
          <div className="instructions">
            Please complete the short checklist below to help make sure you have
            the best experience during the activity. Then, click begin!
          </div>
          <div className="gs-start-checks">
            <label className="gs-start-check">
              <div className="check-area">
                <FontAwesomeIcon icon={faVolume} />
                <span>My volume is turned up.</span>
              </div>
              <input
                type="checkbox"
                checked={startChecks.volume}
                onChange={(e) =>
                  setStartChecks((prev) => ({
                    ...prev,
                    volume: e.target.checked,
                  }))
                }
              />
            </label>

            <label className="gs-start-check">
              <div className="check-area">
                <FontAwesomeIcon icon={faExpand} />
                <span>My browser window is maximized.</span>
              </div>
              <input
                type="checkbox"
                checked={startChecks.browser}
                onChange={(e) =>
                  setStartChecks((prev) => ({
                    ...prev,
                    browser: e.target.checked,
                  }))
                }
              />
            </label>
          </div>
          <button
            className="cssbuttons-io-button"
            disabled={!canStart}
            onClick={() => setStarted(true)}
          >
            Begin
            <span className="icon">
              <FontAwesomeIcon icon={faArrowRight} size="xs" />
            </span>
          </button>
        </div>
      )}

      <div className="gs-page">
        <div className="companion-intro">
          <img src={logo} className="logo" alt="Study logo" />
          <h2>Clinical Trials Education</h2>
          <h1>Chat with Virtual Characters</h1>
        </div>
        <header className="gs-header">
          <div
            className={`gs-intro-visual-slot ${introIcon ? 'has-icon' : ''}`}
          >
            <div className="gs-intro-visual-wrap">
              {introIcon && <IntroVisual introIcon={introIcon} />}
            </div>
          </div>
          <div className="gs-header-avatars">
            <div
              className={`gs-avatar gs-avatar-jordan ${
                introFinished ? 'small' : 'large'
              } ${isJordanSpeaking ? 'gs-avatar-speaking' : ''}`}
            >
              <div
                className="virtual-companion"
                id="virtualcompanion"
                ref={companionRef}
              />
            </div>
          </div>
          <div>
            <h1 className="gs-title">Jordan</h1>
            <span className="gs-eyebrow">Virtual Companion</span>
            <hr />
          </div>

          <div
            className={`gs-subtitle-slot ${
              subtitle ? 'has-subtitle' : ''
            } ${introFinished && !subtitle ? 'is-done' : ''}`}
          >
            <div className="gs-subtitles">
              <span className="gs-subtitle-text">{subtitle}</span>
            </div>
          </div>
          {introFinished && (
            <div
              className={`continue-area ${
                highlightTarget === 'continue' ? 'gs-highlight-continue' : ''
              }`}
            >
              <span className="gs-footer-count">
                {totalSelected === 0
                  ? 'Select at least one topic to continue'
                  : `${totalSelected} topic${totalSelected > 1 ? 's' : ''} selected`}
              </span>
              <button
                type="button"
                className="cssbuttons-io-button gs-continue-button"
                disabled={totalSelected === 0}
                onClick={handleContinue}
              >
                Continue
                <span className="icon">
                  <FontAwesomeIcon icon={faArrowRight} size="xs" />
                </span>
              </button>
            </div>
          )}
        </header>

        {showDiv && (
          <div
            className={`gs-columns fade-in-up ${proactivity} ${
              highlightTarget === 'goals' ? 'gs-highlight-goals' : ''
            }`}
          >
            <section className={`gs-column gs-column-alex ${proactivity}`}>
              <div className="gs-column-header">
                <span className="gs-column-icon gs-column-icon-alex">
                  <FontAwesomeIcon icon={faFilePen} />
                </span>
                <div>
                  <h2 className="gs-column-title">
                    Let's plan what you'd like to learn
                  </h2>
                </div>
              </div>

              {proactivity === 'active' ? (
                <CustomGoalForm
                  customInput={customInput}
                  setCustomInput={setCustomInput}
                  customGoals={customGoals}
                  onAddCustomGoal={handleAddCustomGoal}
                  onRemoveCustomGoal={handleRemoveCustomGoal}
                  title="Your goals"
                  placeholder="Enter a goal in your own words."
                />
              ) : (
                <>
                  <SuggestedGoalList
                    title="Jordan's suggestions"
                    goals={
                      proactivity === 'collaborative'
                        ? suggestedGoals.slice(0, collabSuggestionCount)
                        : suggestedGoals
                    }
                    selectedGoals={selectedGoals}
                    onToggle={toggleGoal}
                  />

                  {proactivity === 'collaborative' && (
                    <CustomGoalForm
                      customInput={customInput}
                      setCustomInput={setCustomInput}
                      customGoals={customGoals}
                      onAddCustomGoal={handleAddCustomGoal}
                      onRemoveCustomGoal={handleRemoveCustomGoal}
                      title="Your Ideas"
                      placeholder="Enter your own goals in your words here."
                    />
                  )}
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
