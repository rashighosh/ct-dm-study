import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import logo from '../assets/logo-transparent.png'
import alex from '../assets/alex.png'
import jordan from '../assets/jordan.png'
import stageBackground from '../assets/bg.jpg'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPaperPlane,
  faVolume,
  faExpand,
  faArrowRight,
  faCheck,
} from '@fortawesome/free-solid-svg-icons'
import {
  initCompanionCharacter,
  initDoctorCharacter,
  speakWithLipsync,
  speakWithLipsyncStatic,
  playGesture,
} from '../character.js'
import '../css/Adaptive.css'
import introSequences from '../data/introSequences.json'
import SwipingCards from './SwipingCards.jsx'

// const BASE_URL = 'http://127.0.0.1:8000'
const BASE_URL =
  'https://7bnfepvywhuc3ip5onitak3se40hivzn.lambda-url.us-east-1.on.aws'

const CONDITION_SINGLE_INFO = 1
const CONDITION_SINGLE_COMBINED = 2
const CONDITION_MULTIPLE = 3

const CONDITION_NAMES = {
  1: 'Single Info Only',
  2: 'Single Combined',
  3: 'Multiple',
}

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

export default function MainInteraction() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const participantId =
    searchParams.get('id') ||
    searchParams.get('PROLIFIC_PID') ||
    'test-participant'

  const condition = Number(searchParams.get('c') ?? 0)

  const isSingleAgent =
    condition === CONDITION_SINGLE_INFO ||
    condition === CONDITION_SINGLE_COMBINED

  const conversationalSpeaker =
    condition === CONDITION_SINGLE_COMBINED ? 'Alex' : 'Jordan'

  const doctorRef = useRef(null)
  const companionRef = useRef(null)
  const textareaRef = useRef(null)
  const historyBodyRef = useRef(null)
  const conversationStartedRef = useRef(false)
  const introStartedRef = useRef(false)

  const SESSION_KEY = `studySession-${participantId}-${condition}`

  const [participantReady, setParticipantReady] = useState(false)
  const [started, setStarted] = useState(false)
  const [charactersReady, setCharactersReady] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [startChecks, setStartChecks] = useState({
    volume: false,
    browser: false,
  })
  const [alexSubtitle, setAlexSubtitle] = useState('')
  const [jordanSubtitle, setJordanSubtitle] = useState('')
  const [sentMessageAnimation, setSentMessageAnimation] = useState('')
  const [introDone, setIntroDone] = useState(false)
  const canStart = participantReady && Object.values(startChecks).every(Boolean)
  const [isResponding, setIsResponding] = useState(false)
  const [responseStatus, setResponseStatus] = useState('')
  const [showStartOverlay, setShowStartOverlay] = useState(true)
  const [showSceneLoading, setShowSceneLoading] = useState(false)
  const [starting, setStarting] = useState(false)
  const [showThinkingBubble, setShowThinkingBubble] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [showSearching, setShowSearching] = useState(false)

  // Log participant to database
  useEffect(() => {
    async function logConversationEntered() {
      try {
        const response = await fetch(
          `${BASE_URL}/logs/log-conversation-entered`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              participant_id: participantId,
              c: condition,
              condition_name: CONDITION_NAMES[condition],
            }),
          },
        )

        if (!response.ok) {
          throw new Error(
            `Conversation entry logging failed: ${response.status}`,
          )
        }

        const data = await response.json()

        console.log('Conversation entered logged:', data)

        setParticipantReady(true)
      } catch (error) {
        console.error('Could not log conversation entry:', error)
      }
    }

    logConversationEntered()
  }, [participantId, condition])

  // Restore saved conversation history
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY)

      if (!saved) return

      const session = JSON.parse(saved)

      const restoredMessages = session.messages ?? []

      setMessages(restoredMessages)
      setIntroDone(session.introDone ?? false)
    } catch (error) {
      console.error('Could not restore session:', error)
    }
  }, [SESSION_KEY])

  // save conversation transcript
  useEffect(() => {
    if (messages.length === 0) return

    async function saveConversationTranscript() {
      try {
        const response = await fetch(
          `${BASE_URL}/logs/log-conversation-transcript`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              participant_id: participantId,
              transcript: JSON.stringify(messages),
            }),
          },
        )

        if (!response.ok) {
          throw new Error(
            `Saving conversation transcript failed: ${response.status}`,
          )
        }

        console.log('Conversation transcript logged')
      } catch (error) {
        console.error('Could not log conversation transcript:', error)
      }
    }

    saveConversationTranscript()
  }, [messages, participantId])

  // Save basic session information
  useEffect(() => {
    const existingSession = JSON.parse(
      sessionStorage.getItem(SESSION_KEY) || '{}',
    )

    const session = {
      ...existingSession,
      participantId,
      condition,
      messages,
      introDone,
    }

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  }, [SESSION_KEY, participantId, condition, messages, introDone])

  // Initialize both virtual characters after Begin is clicked
  useEffect(() => {
    if (!started) return

    async function initCharacters() {
      try {
        setCharactersReady(false)

        if (isSingleAgent) {
          await initDoctorCharacter(doctorRef.current)
          await waitForCharacterRender(doctorRef.current)
        } else {
          await Promise.all([
            initDoctorCharacter(doctorRef.current),
            initCompanionCharacter(companionRef.current),
          ])

          await Promise.all([
            waitForCharacterRender(doctorRef.current),
            waitForCharacterRender(companionRef.current),
          ])
        }

        setCharactersReady(true)
      } catch (error) {
        console.error('Failed to initialize characters:', error)
      }
    }

    initCharacters()
  }, [started, isSingleAgent])

  useEffect(() => {
    if (!started || !charactersReady) return

    async function revealScene() {
      // Characters/scene are loaded underneath the start overlay.
      // Show the scene loading layer before exposing the scene.
      setShowSceneLoading(true)

      // Close the start overlay.
      setShowStartOverlay(false)

      // Give React one frame to render the scene + loader.
      await new Promise((resolve) => requestAnimationFrame(resolve))

      // Let the characters appear / settle into position
      // Wait for 500ms loader fade + 1.5 second pause
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Fade out the scene loading layer
      setShowSceneLoading(false)
    }

    revealScene()
  }, [started, charactersReady])

  useEffect(() => {
    if (!showHistory) return

    requestAnimationFrame(() => {
      if (historyBodyRef.current) {
        historyBodyRef.current.scrollTop = historyBodyRef.current.scrollHeight
      }
    })
  }, [showHistory])

  async function playCharacterIntro() {
    const introSequence = introSequences[condition]

    if (!introSequence) {
      throw new Error(`No intro sequence configured for condition ${condition}`)
    }

    for (const intro of introSequence) {
      if (intro.beforeGesture) {
        playGesture(intro.beforeGesture)
      }

      setMessages((previous) => [
        ...previous,
        {
          from: intro.from,
          text: intro.text,
        },
      ])

      const setSubtitle =
        intro.character === 'doctor' ? setAlexSubtitle : setJordanSubtitle

      await speakWithLipsyncStatic(
        intro.audio,
        intro.timestamps,
        intro.character,
        true,
        setSubtitle,
      )

      setSubtitle('')
    }

    playGesture('stopAlexGesture')

    if (!isSingleAgent) {
      playGesture('stopCompanionGesture')
    }
  }

  useEffect(() => {
    if (!started || !charactersReady || showStartOverlay || showSceneLoading)
      return

    if (conversationStartedRef.current) return
    if (messages.length > 0) return

    conversationStartedRef.current = true

    async function startConversation() {
      setIsResponding(true)

      try {
        // Brief pause after the scene finishes settling
        await new Promise((resolve) => setTimeout(resolve, 1500))

        // Play the prerecorded introduction
        if (!introDone && !introStartedRef.current) {
          introStartedRef.current = true

          await playCharacterIntro()

          // Log when the character intro actually finishes
          try {
            const introResponse = await fetch(
              `${BASE_URL}/logs/log-intro-finished`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  participant_id: participantId,
                }),
              },
            )

            if (!introResponse.ok) {
              throw new Error(
                `Intro finish logging failed: ${introResponse.status}`,
              )
            }

            const introData = await introResponse.json()

            console.log('Intro finished logged:', introData)
          } catch (error) {
            console.error('Could not log intro finish:', error)
          }

          setIntroDone(true)
        }

        playGesture('stopAlexGesture')

        if (!isSingleAgent) {
          playGesture('stopCompanionGesture')
        }
      } catch (error) {
        console.error('Could not start conversation:', error)
        conversationStartedRef.current = false
      } finally {
        setIsResponding(false)
      }
    }

    startConversation()
  }, [
    started,
    charactersReady,
    showStartOverlay,
    showSceneLoading,
    participantId,
    messages.length,
    introDone,
  ])

  async function handleSend(event) {
    event.preventDefault()

    const trimmed = input.trim()

    if (!trimmed || isResponding) return

    console.log('User sent:', {
      participantId,
      condition,
      message: trimmed,
    })

    setMessages((previous) => [
      ...previous,
      {
        from: 'user',
        text: trimmed,
      },
    ])

    setInput('')
    setSentMessageAnimation(trimmed)

    setTimeout(() => {
      setSentMessageAnimation('')
    }, 3500)

    setIsResponding(true)

    try {
      setShowSearching(true)
      playGesture('startSwiping')

      const response = await fetch(`${BASE_URL}/alex/conversation-alex`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmed,
          history: messages,
          earlier_memory: '',
          prior_topic_summaries: [],
          condition,
        }),
      })

      if (!response.ok) {
        throw new Error(`Alex request failed: ${response.status}`)
      }

      const data = await response.json()

      console.log('Alex response:', data)

      setMessages((previous) => [
        ...previous,
        {
          from: 'Alex',
          text: data.answer,
        },
      ])

      setShowSearching(false)
      playGesture('stopSwiping')

      await speakWithLipsync(data.answer, 'doctor', null, null, setAlexSubtitle)

      setAlexSubtitle('')
      playGesture('stopAlexGesture')
    } catch (error) {
      console.error('Conversation error:', error)
    } finally {
      setShowSearching(false)
      playGesture('stopSwiping')
      setIsResponding(false)
      setResponseStatus('')
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend(event)
    }
  }

  async function handleBegin() {
    if (!canStart || starting) return

    try {
      setStarting(true)

      const response = await fetch(
        `${BASE_URL}/logs/log-conversation-started`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            participant_id: participantId,
          }),
        },
      )

      if (!response.ok) {
        throw new Error(`Conversation start logging failed: ${response.status}`)
      }

      const data = await response.json()

      console.log('Conversation started logged:', data)

      setStarted(true)
    } catch (error) {
      console.error('Could not log conversation start:', error)
      setStarting(false)
    }
  }

  async function handleFinish() {
    if (finishing) return
    try {
      setFinishing(true)

      // 2. Save final transcript
      const transcriptResponse = await fetch(
        `${BASE_URL}/logs/log-conversation-transcript`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            participant_id: participantId,
            transcript: JSON.stringify(messages),
          }),
        },
      )

      if (!transcriptResponse.ok) {
        throw new Error(
          `Final transcript save failed: ${transcriptResponse.status}`,
        )
      }

      // 3. Log finished timestamp
      const finishResponse = await fetch(
        `${BASE_URL}/logs/log-conversation-finished`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            participant_id: participantId,
          }),
        },
      )

      if (!finishResponse.ok) {
        throw new Error(
          `Conversation finish logging failed: ${finishResponse.status}`,
        )
      }

      const finishData = await finishResponse.json()
      console.log('Conversation finished logged:', finishData)

      navigate(`/resources?${searchParams.toString()}`)
    } catch (error) {
      console.error('Could not finish conversation:', error)
      setFinishing(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Start overlay
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Main interaction
  // ---------------------------------------------------------------------------

  return (
    <>
      {showStartOverlay && (
        <div className="start-overlay">
          {!participantReady && (
            <div className="participant-loading-overlay">
              <div className="response-status">
                <span className="response-status-dots" aria-hidden="true">
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </span>
                <span>Getting ready</span>
              </div>
            </div>
          )}
          <div className="mi-start-overlay-content">
            <img src={logo} className="logo" alt="Study logo" />

            <h2>Clinical Trials Education</h2>
            {!isSingleAgent ? (
              <h1>Chat with Virtual Characters</h1>
            ) : (
              <h1>Chat with a Virtual Character</h1>
            )}

            <div className="mi-start-information">
              {!isSingleAgent ? (
                <p>
                  You are about to explore what it means to participate in a
                  clinical trial with two virtual characters:{' '}
                  <strong>Alex</strong> and <strong>Jordan</strong>!
                </p>
              ) : (
                <p>
                  You are about to explore what it means to participate in a
                  clinical trial with a virtual character: <strong>Alex</strong>
                  !
                </p>
              )}
              <div className="character-images-row">
                <div>
                  <img
                    src={alex}
                    className="character-preview"
                    alt="Alex character"
                  />
                  <p>Alex</p>
                </div>

                {!isSingleAgent && (
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
              <p>
                {!isSingleAgent ? (
                  <strong>
                    You’ll have a conversation with the virtual characters where
                    you can ask questions and bring up things you’re curious or
                    unsure about. The virtual characters will use information
                    from credible sources to help you explore and organize what
                    it means to participate in a clinical trial. After the
                    characters introduce themselves, a Finish button will appear
                    in the top right corner of your screen.
                  </strong>
                ) : (
                  <strong>
                    You’ll have a conversation with the virtual character where
                    you can ask questions and bring up things you’re curious or
                    unsure about. The virtual character will use information
                    from credible sources to help you explore what it means to
                    participate in a clinical trial. After the character
                    introduces themself, a Finish button will appear in the top
                    right corner of your screen.
                  </strong>
                )}{' '}
                You may continue asking as many or as few questions as you'd
                like until you feel you've experienced how the website can help
                you learn about clinical trial participation.
              </p>
            </div>

            <div className="mi-start-instructions">
              Please complete this short checklist to make sure you have the
              best experience. Then, click begin.{' '}
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

                <span
                  className={`start-checkbox ${
                    startChecks.volume ? 'start-checkbox-selected' : ''
                  }`}
                >
                  {startChecks.volume && <FontAwesomeIcon icon={faCheck} />}
                </span>
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

                <span
                  className={`start-checkbox ${
                    startChecks.browser ? 'start-checkbox-selected' : ''
                  }`}
                >
                  {startChecks.browser && <FontAwesomeIcon icon={faCheck} />}
                </span>
              </label>
            </div>

            <button
              type="button"
              className="cssbuttons-io-button"
              disabled={!canStart || starting}
              onClick={handleBegin}
            >
              {starting ? (
                <span className="button-loading">
                  Loading
                  <span className="button-loading-dots" aria-hidden="true">
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                  </span>
                </span>
              ) : (
                'Begin'
              )}

              <span className="icon">
                <FontAwesomeIcon icon={faArrowRight} size="xs" />
              </span>
            </button>
          </div>
        </div>
      )}

      <div className="mi-root main-interaction1">
        <div className="tool-header">
          <img src={logo} className="logo" alt="Study logo" />
          <h2>Clinical Trials Education</h2>
          {!isSingleAgent ? (
            <h1>Chat with Virtual Characters</h1>
          ) : (
            <h1>Chat with a Virtual Character</h1>
          )}
        </div>

        <button className="history-btn" onClick={() => setShowHistory(true)}>
          Chat history
        </button>

        {introDone && (
          <button
            type="button"
            className="cssbuttons-io-button finish-button"
            onClick={handleFinish}
            disabled={finishing}
          >
            {finishing ? (
              <span className="button-loading">
                Saving
                <span className="button-loading-dots" aria-hidden="true">
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </span>
              </span>
            ) : (
              'Finish Conversation'
            )}

            <span className="icon">
              <FontAwesomeIcon icon={faArrowRight} size="xs" />
            </span>
          </button>
        )}

        <main className="mi-main">
          <section className="mi-chat-card">
            <div
              className={`mi-chat-header mi-shared-character-stage ${
                charactersReady ? 'characters-ready' : 'characters-loading'
              } ${isSingleAgent ? 'single-agent' : ''}`}
            >
              <div
                className="mi-shared-stage-background"
                style={{
                  backgroundImage: `url(${stageBackground})`,
                }}
              />
              {showSearching && (
                <div className="swipe-cards-overlay">
                  <SwipingCards />
                </div>
              )}

              {started && (
                <div
                  className={`scene-loading-overlay ${
                    showSceneLoading ? 'scene-loading-overlay-visible' : ''
                  }`}
                >
                  <div className="response-status">
                    <span className="response-status-dots" aria-hidden="true">
                      <span>.</span>
                      <span>.</span>
                      <span>.</span>
                    </span>
                    <span>Getting ready</span>
                  </div>
                </div>
              )}

              <div className="mi-character-zone mi-character-zone-alex">
                <div className="mi-character-content">
                  <div
                    className="virtual-doctor"
                    id="virtualdoctor"
                    ref={doctorRef}
                  />
                  {showThinkingBubble && (
                    <div className="character-thinking character-thinking-alex">
                      <div className="character-thinking-bubble">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>

                      <span className="thinking-tail thinking-tail-large"></span>
                      <span className="thinking-tail thinking-tail-small"></span>
                    </div>
                  )}
                  {alexSubtitle && (
                    <div className="character-subtitle character-subtitle-alex">
                      {alexSubtitle}
                    </div>
                  )}
                </div>
              </div>

              {responseStatus && (
                <div className="response-status">
                  <span className="response-status-dots" aria-hidden="true">
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                  </span>
                  <span>{responseStatus}</span>
                </div>
              )}

              {!isSingleAgent && (
                <div className="mi-character-zone mi-character-zone-jordan">
                  <div className="mi-character-content">
                    <div
                      className="virtual-companion"
                      id="virtualcompanion"
                      ref={companionRef}
                    />
                    {showThinkingBubble && (
                      <div className="character-thinking character-thinking-jordan">
                        <div className="character-thinking-bubble">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>

                        <span className="thinking-tail thinking-tail-large"></span>
                        <span className="thinking-tail thinking-tail-small"></span>
                      </div>
                    )}
                    {jordanSubtitle && (
                      <div className="character-subtitle character-subtitle-jordan">
                        {jordanSubtitle}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <ChatInput
              input={input}
              textareaRef={textareaRef}
              onChange={setInput}
              onSubmit={handleSend}
              onHandleKeyDown={handleKeyDown}
              sentMessageAnimation={sentMessageAnimation}
              isResponding={isResponding || showSceneLoading || !introDone}
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
      </div>
    </>
  )
}

function ChatInput({
  input,
  textareaRef,
  onChange,
  onSubmit,
  onHandleKeyDown,
  sentMessageAnimation,
  isResponding,
}) {
  return (
    <div className="full-input-area">
      {sentMessageAnimation && (
        <div className="sent-message-animation">{sentMessageAnimation}</div>
      )}
      <form className="mi-input-row" onSubmit={onSubmit}>
        <div className="mi-input-stack">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => onChange(event.target.value)}
            placeholder={
              isResponding
                ? 'Please wait for the virtual character to finish speaking...'
                : 'Type a message...'
            }
            rows={3}
            onKeyDown={onHandleKeyDown}
            disabled={isResponding}
          />
        </div>

        <button
          type="submit"
          className="send-button"
          disabled={!input.trim() || isResponding}
        >
          <FontAwesomeIcon icon={faPaperPlane} />
          <span>Send</span>
        </button>
      </form>

      <p>Press enter to send, or Shift + Enter for newline</p>
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
            ×
          </button>
        </div>

        <div className="history-modal-body" ref={historyBodyRef}>
          {messages.length === 0 ? (
            <p>No messages yet.</p>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`history-message ${
                  message.from === 'user'
                    ? 'history-message-user'
                    : message.from === 'Alex'
                      ? 'history-message-alex'
                      : 'history-message-jordan'
                }`}
              >
                <strong>
                  {message.from === 'user' ? 'You' : message.from}
                </strong>
                <p>{message.text}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
