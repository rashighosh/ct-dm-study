import { useState, useRef, useEffect } from 'react'
import '../css/App.css'
import { initDoctorCharacter, initCompanionCharacter } from '../character.js';
import logo from '../assets/logo-transparent.png'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight, faPaperPlane, faCheck } from '@fortawesome/free-solid-svg-icons'


const TRIAL_PIECES = [
  {
    label: 'What is this study and what will you have to do?',
    content:
      `This is a Phase II randomized, open-label trial evaluating using two drugs instead of one to treat your tumor. You will have to: provide a small tissue sample (biopsy) to read your tumor's DNA, take targed drugs (pill or IV), and do regular blood tests and scans to see how you're doing.`,
  },
  {
    label: 'What is the time and visit commitment?',
    content:
      `You will have to first visit a cancer center for biopsies and scans. Then, you'll have to wait a few weeks to get your tumor's DNA results. Then, you will start a drug combination and visit the center at least once a week when you first start. You'll be on the drug in 4-week cycles as long as they are helping.`
  },
  {
    label: 'What are the costs and compensation?',
    content:
      `The initial testing and drugs are free for you. However, there is no additional compensation. That being said, some sites may help you pay for parking and gas.`
  },
  {
    label: 'What are the risks?',
    content:
      `Potential side effects from two drugs, minor biopsy risks, and no guarantee of a match.`
  },
  {
    label: 'What are the potential benefits?',
    content:
      `Highly personalized treatment, a chance to overcome drug resistance, and free expert genetic mapping of your cancer.`
  },
]

const DISCUSSION_PROMPTS = [
  `How do you feel about what you'd need to do during this trial?`,
  `Do you have any concerns about the time and visit commitments?`,
  `Are these costs and compensations do-able for you?`,
  `How do you feel about those risks? Is there anything that worries you?`,
  `What do you think about these potential benefits?`,
]

const NOTE_RULES = [
  {
    key: 'invasive',
    patterns: ['biopsy', 'invasiv', 'needle', 'inject', 'surgery', 'blood draw', "don't like", "not comfortable", 'uncomfortable'],
    text: 'Prefers non-invasive procedures',
  },
  {
    key: 'time',
    patterns: ['busy', "can't commit", 'too many visit', 'too often', 'hard to come', 'hard to visit', 'frequent visit'],
    text: 'Limited availability for frequent visits',
  },
  {
    key: 'travel',
    patterns: ['far', 'travel', 'drive', 'distance', 'location', 'nearby', 'close to home'],
    text: 'Needs trial site close to home',
  },
  {
    key: 'cost',
    patterns: ['afford', 'expens', 'cost', 'money', 'financial', 'pay for'],
    text: 'Has financial concerns',
  },
  {
    key: 'risk',
    patterns: ['scared', 'worri', 'afraid', 'risky', 'dangerous', 'side effect', 'nervous about', 'fear'],
    text: 'Concerned about risks and side effects',
  },
  {
    key: 'oral',
    patterns: ['pill', 'oral', 'tablet'],
    text: 'Prefers oral medication',
  },
  {
    key: 'match',
    patterns: ['no guarantee', 'not match', 'might not work', 'uncertain', 'no match'],
    text: 'Concerned about treatment match uncertainty',
  },
]

function extractNote(text) {
  const lower = text.toLowerCase()
  for (const rule of NOTE_RULES) {
    if (rule.patterns.some(p => lower.includes(p))) {
      return { key: rule.key, text: rule.text }
    }
  }
  return null
}

export default function App() {
  const [started, setStarted] = useState(false)
  const [step, setStep] = useState(0)
  const [messages, setMessages] = useState([
    { role: 'agent', text: DISCUSSION_PROMPTS[0] },
  ])
  const [input, setInput] = useState('')
  const [notes, setNotes] = useState([])
  const chatEndRef = useRef(null)
  const doctorRef = useRef(null);
  const companionRef = useRef(null);

  async function handleBegin() {
    setStarted(true)
    try {
      await initDoctorCharacter(doctorRef.current);
      await initCompanionCharacter(companionRef.current);
    } catch (error) {
      console.error("Init failed:", error);
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleNext() {
    if (step >= TRIAL_PIECES.length - 1) return
    const nextStep = step + 1
    setStep(nextStep)
    setMessages(prev => [
      ...prev,
      { role: 'agent', text: DISCUSSION_PROMPTS[nextStep] },
    ])
  }

  function handleSend(e) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return
    setMessages(prev => [...prev, { role: 'user', text: trimmed }])
    setInput('')
    const note = extractNote(trimmed)
    if (note) {
      setNotes(prev => prev.some(n => n.key === note.key) ? prev : [...prev, note])
    }
  }

  const piece = TRIAL_PIECES[step]
  const isLast = step === TRIAL_PIECES.length - 1

  return (
    <div className="app">
      {!started && (
        <div className="start-overlay">
          <img src={logo} className="logo" alt="Study logo" />
          <div className="information">Please click the button below to begin.</div>
        <button className="cssbuttons-io-button" onClick={handleBegin}>
          Begin
          <span className="icon">
            <FontAwesomeIcon icon={faArrowRight} size="xs" />
          </span>
        </button>
      </div>
      )}
      {/* Presenter panel */}
      <div className="presenter-panel">
        <p className="panel-label">Agent 1 — Clinical Trial Presenter</p>
        <div className="presenter-stage">
          <div className="virtual-doctor" id="virtualdoctor" ref={doctorRef} />
          <div className="piece-card">
            <p className="step-indicator">
              Step {step + 1} of {TRIAL_PIECES.length}
            </p>
            <h2 className="piece-heading">{piece.label}</h2>
            <p className="piece-body">{piece.content}</p>
              {isLast ? (<button className="next-btn" onClick={handleNext} disabled={isLast}>All information viewed <FontAwesomeIcon icon={faCheck} size="xs" /></button>) : 
              (<button className="next-btn" onClick={handleNext} disabled={isLast}>Next <FontAwesomeIcon icon={faArrowRight} size="xs" /></button>)}
          </div>
        </div>
      </div>

      {/* Chat panel */}
      <div className="chat-panel">
        {/* Notes panel */}
        <div className="notes-panel">
          <p className="panel-label">Patient Notes</p>
          {notes.length === 0 ? (
            <p className="notes-empty">Notes will appear here as you share your thoughts.</p>
          ) : (
            <ul className="notes-list">
              {notes.map(n => (
                <li key={n.key} className="note-item">{n.text}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="virtual-companion" id="virtualcompanion" ref={companionRef} />
        <div className="chat-content">
        <p className="panel-label">Agent 2 — Discussion Agent</p>
        <div className="messages">
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <span className="msg-sender">
                {msg.role === 'agent' ? 'Agent 2' : 'You'}
              </span>
              <p className="msg-text">{msg.text}</p>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <form className="chat-input-row" onSubmit={handleSend}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Share your thoughts…"
          />
          <button type="submit" className="send-button">
            <div className="svg-wrapper-1">
              <div className="svg-wrapper">
                <FontAwesomeIcon icon={faPaperPlane} />
              </div>
            </div>
            <span>Send</span>
          </button>
        </form>
        </div>
      </div>
    </div>
  )
}
