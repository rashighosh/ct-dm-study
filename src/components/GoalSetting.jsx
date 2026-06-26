import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import logo from '../assets/logo-transparent.png'
import dralex from '../assets/dralex.png'
import jordan_thumbsup from '../assets/jordan_thumbsup.png'
import '../css/GoalSetting.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowRight,
  faCheck,
  faStethoscope,
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
} from '@fortawesome/free-solid-svg-icons'
import {
  initDoctorCharacter,
  initCompanionCharacter,
  speakWithLipsync,
  speakWithLipsyncStatic,
  playGesture,
} from '../character.js'
import { logSession, logGoalSetting } from '../api/logging.js'

function waitMs(duration) {
  return new Promise((resolve) => setTimeout(resolve, duration))
}

// Things to understand, with Dr. Alex — factual / informational needs
// (QPL-CT, QuIC informed)
const ALEX_SECTIONS = [
  {
    title: 'The basics',
    items: [
      {
        id: 'trial-basics',
        label: 'What is a clinical trial?',
        description: 'What trials are, and why one might be offered to you.',
      },
    ],
  },
  {
    title: 'Risks & benefits',
    items: [
      {
        id: 'risks',
        label: 'Risks & side effects',
        description: "What could go wrong, and how it's monitored.",
      },
      {
        id: 'benefits',
        label: 'Possible benefits',
        description: "What could help you, and what's still uncertain.",
      },
      {
        id: 'alternatives',
        label: 'Other options',
        description: 'Ways to participate in research beyond clinical trials.',
      },
    ],
  },
  {
    title: 'How it works',
    items: [
      {
        id: 'types',
        label: 'Types of clinical trials',
        description: 'Different types of clinical trials.',
      },
      {
        id: 'randomization',
        label: 'Randomization & groups',
        description: 'How treatment assignment is decided.',
      },
      {
        id: 'logistics',
        label: 'Schedule, costs & visits',
        description: "Time commitment, location, and what's covered.",
      },
    ],
  },
  {
    title: 'Other',
    items: [
      {
        id: 'stories',
        label: "People's experiences",
        description: 'Experiences of people who have participated.',
      },
    ],
  },
]

// Things to think through, with Jordan — values / decision-support needs
// (Ottawa Decision Support Framework informed)
const JORDAN_SECTIONS = [
  {
    title: 'What matters to you',
    items: [
      {
        id: 'priorities',
        label: 'What matters most to me',
        description: 'The things you care about most in this decision.',
      },
      {
        id: 'life-fit',
        label: 'How this fits my life',
        description: 'Family, work, and daily routine considerations.',
      },
    ],
  },
  {
    title: 'Working through it',
    items: [
      {
        id: 'worries',
        label: "Worries I haven't said out loud",
        description: 'Concerns or fears about joining — no judgment here.',
      },
      {
        id: 'weighing',
        label: "Decisions I'm still weighing",
        description: "Pros and cons you haven't settled yet.",
      },
      {
        id: 'questions',
        label: 'Questions for my doctor',
        description: 'Help getting ready for that conversation.',
      },
    ],
  },
]

function ToggleRow({ item, checked, onToggle, accent }) {
  return (
    <button
      type="button"
      className={`gs-row gs-row-${accent}${checked ? ' gs-row-checked' : ''}`}
      onClick={() => onToggle(item.id)}
      aria-pressed={checked}
    >
      <div className="gs-row-text">
        <span className="gs-row-label">{item.label}</span>
        <span className="gs-row-description">{item.description}</span>
      </div>

      <span className={`gs-switch${checked ? ' gs-switch-on' : ''}`}>
        <span className="gs-switch-knob">
          {checked && <FontAwesomeIcon icon={faCheck} />}
        </span>
      </span>
    </button>
  )
}

export default function GoalSetting({ onComplete }) {
  const [started, setStarted] = useState(false)
  const [selectedGoals, setSelectedGoals] = useState([])
  const [customGoals, setCustomGoals] = useState([]) // [{ id, label }]
  const [customInput, setCustomInput] = useState('')
  const [showDiv, setShowDiv] = useState(false)
  const [introFinished, setIntroFinished] = useState(false)
  const [introIcon, setIntroIcon] = useState(null)
  const [highlightTarget, setHighlightTarget] = useState(null) // null | 'goals' | 'continue'
  const companionRef = useRef(null)
  const navigate = useNavigate()

  const [searchParams] = useSearchParams()

  const participantId = searchParams.get('id') || 'test-participant'

  const conditionParam = searchParams.get('condition') || '2'

  const CONDITION_MAP = {
    1: 'passive',
    2: 'collaborative',
    3: 'active',
  }

  const proactivity = CONDITION_MAP[conditionParam] || 'collaborative'

  const JORDAN_INTRO_ICON_TIMELINE = [
    { time: 3.2, icon: 'doctor', label: 'Talk with Dr. Alex' },
    { time: 7.5, icon: 'goals', label: 'Set goals' },
    { time: 10.5, icon: 'notes', label: 'Keep notes' },
    { time: 13.5, icon: 'no-search', label: 'No trial search' },
    { time: 20, icon: 'decision', label: 'Think it through' },
  ]

  useEffect(() => {
    logSession(participantId, conditionParam, proactivity).catch(console.error)
  }, [participantId, conditionParam, proactivity])

  useEffect(() => {
    if (!started) return
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
        await speakWithLipsyncStatic(
          '/intro-voices/companion-shared-intro.mp3',
          '/intro-voices/companion-shared-intro-timestamps.json',
          'companion',
        )
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

        await speakWithLipsyncStatic(
          `/intro-voices/companion-${proactivity}-intro.mp3`,
          `/intro-voices/companion-${proactivity}-intro-timestamps.json`,
          'companion',
        )

        secondIntroHighlightTimeouts.forEach(clearTimeout)
        setHighlightTarget(null)

        playGesture('lookright')
      } catch (error) {
        console.error('Init failed:', error)
      }
    })()
  }, [started])

  function toggleGoal(id) {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    )
    playGesture('thumbsupQuick')
    setTimeout(() => {
      playGesture('lookright')
    }, 3000)
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
        const allItems = [...ALEX_SECTIONS, ...JORDAN_SECTIONS].flatMap(
          (section) => section.items,
        )
        return allItems.find((item) => item.id === id)?.label || id
      }),
      customGoals: customGoals.map((g) => g.label),
    }

    await logGoalSetting(participantId, goalPayload)

    navigate('/main-interaction', {
      state: {
        participantId,
        condition: conditionParam,
        proactivity,
        selectedGoals,
        customGoals: customGoals.map((g) => g.label),
      },
    })
  }

  function IntroVisual({ introIcon }) {
    if (introIcon === 'doctor') {
      return (
        <div className="gs-intro-visual-card gs-intro-doctor-card">
          <img src={dralex} alt="Dr. Alex" className="gs-intro-doctor-img" />
          <span>Dr. Alex</span>
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

  return (
    <div className="gs-root">
      {/* ── Start overlay ── */}
      {!started && (
        <div className="start-overlay">
          <img src={logo} className="logo" alt="Study logo" />
          <div className="information">
            Let's set up what you'd like to talk about today.
          </div>
          <button
            className="cssbuttons-io-button"
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
        <header className="gs-header">
          {introIcon && (
            <div key={introIcon} className="gs-intro-visual-wrap">
              <IntroVisual introIcon={introIcon} />
            </div>
          )}
          <div className="gs-header-avatars">
            <div
              className={
                introFinished
                  ? 'gs-avatar gs-avatar-jordan small'
                  : 'gs-avatar gs-avatar-jordan large'
              }
            >
              <div
                className="virtual-companion"
                id="virtualcompanion"
                ref={companionRef}
              />
            </div>
          </div>
          <h1 className="gs-title">Jordan</h1>
          <span className="gs-eyebrow">Virtual Companion</span>
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
            className={`gs-columns fade-in-up ${
              highlightTarget === 'goals' ? 'gs-highlight-goals' : ''
            }`}
          >
            <section className="gs-column gs-column-alex">
              <div className="gs-column-header">
                <span className="gs-column-icon gs-column-icon-alex">
                  <FontAwesomeIcon icon={faFilePen} />
                </span>
                <div>
                  <h2 className="gs-column-title">
                    Let's write down your information needs
                  </h2>
                </div>
              </div>
              {ALEX_SECTIONS.map((section) => (
                <div className="gs-subsection" key={section.title}>
                  <h3 className="gs-subsection-title">{section.title}</h3>
                  <div className="gs-row-list">
                    {section.items.map((item) => (
                      <ToggleRow
                        key={item.id}
                        item={item}
                        accent="alex"
                        checked={selectedGoals.includes(item.id)}
                        onToggle={toggleGoal}
                      />
                    ))}
                  </div>
                </div>
              ))}

              <div className="gs-subsection">
                <h3 className="gs-subsection-title">Custom topics</h3>
                <form className="gs-custom-form" onSubmit={handleAddCustomGoal}>
                  <input
                    type="text"
                    className="gs-custom-input"
                    placeholder="Enter any custom topics in your own words here."
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
                          onClick={() => handleRemoveCustomGoal(goal.id)}
                          aria-label={`Remove "${goal.label}"`}
                        >
                          <FontAwesomeIcon icon={faXmark} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section className="gs-column gs-column-jordan">
              <div className="gs-column-header">
                <span className="gs-column-icon gs-column-icon-jordan">
                  <FontAwesomeIcon icon={faHandHoldingHeart} />
                </span>
                <div>
                  <span className="gs-column-tag gs-column-tag-jordan">
                    With Jordan
                  </span>
                  <h2 className="gs-column-title">Things to think through</h2>
                </div>
              </div>
              {JORDAN_SECTIONS.map((section) => (
                <div className="gs-subsection" key={section.title}>
                  <h3 className="gs-subsection-title">{section.title}</h3>
                  <div className="gs-row-list">
                    {section.items.map((item) => (
                      <ToggleRow
                        key={item.id}
                        item={item}
                        accent="jordan"
                        checked={selectedGoals.includes(item.id)}
                        onToggle={toggleGoal}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
