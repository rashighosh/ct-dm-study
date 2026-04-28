import { useState, useRef, useEffect } from 'react'
import '../css/App.css'
import { initDoctorCharacter, initCompanionCharacter } from '../character.js';

const TRIAL_PIECES = [
  {
    label: 'What is this study?',
    content:
      'This is a Phase II randomized controlled trial evaluating Drug X versus placebo in adults with moderate-to-severe rheumatoid arthritis.',
  },
  {
    label: 'Who can participate?',
    content:
      'Adults aged 18–65 with a confirmed RA diagnosis for at least 6 months who have not responded adequately to at least one DMARD. Exclusion criteria include pregnancy, severe kidney disease, or active infection.',
  },
  {
    label: 'What will happen to you?',
    content:
      'You will be randomly assigned to receive either Drug X or a placebo as a weekly injection over 24 weeks, with 6 clinic visits for assessments.',
  },
  {
    label: 'What are the risks?',
    content:
      'Possible side effects include injection-site reactions, increased infection risk, and in rare cases liver enzyme elevation. All serious adverse events will be monitored and reported.',
  },
  {
    label: 'What are the potential benefits?',
    content:
      'There is no guarantee of direct benefit. Drug X may reduce joint inflammation. Findings from this study may help future patients with RA.',
  },
]

const DISCUSSION_PROMPTS = [
  'Thanks for starting. What are your initial thoughts about this study?',
  'How do you feel about the eligibility criteria? Does anything concern you?',
  'What do you think about the procedures involved? Any questions so far?',
  'How do you feel about those risks? Is there anything that worries you?',
  "Now that you've heard about the potential benefits — how are you feeling about this study overall?",
]

export default function App() {
  const [started, setStarted] = useState(false)
  const [step, setStep] = useState(0)
  const [messages, setMessages] = useState([
    { role: 'agent', text: DISCUSSION_PROMPTS[0] },
  ])
  const [input, setInput] = useState('')
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
    if (!input.trim()) return
    setMessages(prev => [...prev, { role: 'user', text: input.trim() }])
    setInput('')
  }

  const piece = TRIAL_PIECES[step]
  const isLast = step === TRIAL_PIECES.length - 1

  return (
    <div className="app">
      {!started && (
        <div className="start-overlay">
          <button className="start-btn" onClick={handleBegin}>
            Begin
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
            <button className="next-btn" onClick={handleNext} disabled={isLast}>
              {isLast ? 'All pieces presented' : 'Next →'}
            </button>
          </div>
        </div>
      </div>

      {/* Chat panel */}
      <div className="chat-panel">
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
          <button type="submit">Send</button>
        </form>
        </div>
      </div>
    </div>
  )
}
