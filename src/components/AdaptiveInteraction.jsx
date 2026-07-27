import { useEffect, useMemo, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowRight,
  faCommentDots,
  faFileLines,
  faPaperPlane,
  faSpinner,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import logo from '../assets/logo-transparent.png'
import stageBackground from '../assets/bg.jpg'
import {
  initCompanionCharacter,
  initDoctorCharacter,
  playGesture,
  prepareSpeech,
  playPreparedSpeech,
  disposeCharacters,
} from '../character.js'
import '../css/AdaptiveInteraction.css'
import SwipingCards from './SwipingCards'

const uid = () => crypto.randomUUID()

const DEFAULT_BASE_URL = 'http://127.0.0.1:8000'

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
        requestAnimationFrame(() => requestAnimationFrame(resolve))
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

function normalizeSource(source, index) {
  return {
    id: source.id || source.url || source.title || `source-${index}`,
    title: source.title || source.file || source.source || 'Health resource',
    source: source.source || source.organization || '',
    url: source.url || '',
    snippet: source.snippet || source.explanation || source.text || '',
  }
}

export default function AdaptiveInteraction() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE_URL

  const doctorRef = useRef(null)
  const companionRef = useRef(null)
  const textareaRef = useRef(null)
  const speakingQueueRef = useRef(Promise.resolve())
  const queuedSpeechCountRef = useRef(0)
  const historyBodyRef = useRef(null)

  const [isProcessing, setIsProcessing] = useState(false)
  const [showCards, setShowCards] = useState(false)
  const [charactersReady, setCharactersReady] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [history, setHistory] = useState([])
  const [sources, setSources] = useState([])
  const [talkingPoints, setTalkingPoints] = useState([])
  const [isAlexSpeaking, setIsAlexSpeaking] = useState(false)
  const [isJordanSpeaking, setIsJordanSpeaking] = useState(false)
  const [alexSubtitle, setAlexSubtitle] = useState('')
  const [jordanSubtitle, setJordanSubtitle] = useState('')
  const [error, setError] = useState('')
  const [showHistory, setShowHistory] = useState(false)

  const isAnyoneSpeaking = isAlexSpeaking || isJordanSpeaking

  const normalizedSources = useMemo(
    () => sources.map(normalizeSource).slice(0, 3),
    [sources],
  )

  // For chat history modal, auto scroll to most recent message
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
    let cancelled = false

    async function initializeCharacters() {
      try {
        await Promise.all([
          initDoctorCharacter(doctorRef.current),
          initCompanionCharacter(companionRef.current),
        ])

        if (cancelled) {
          await disposeCharacters()
          return
        }

        await Promise.all([
          waitForCharacterRender(doctorRef.current),
          waitForCharacterRender(companionRef.current),
        ])

        if (cancelled) {
          await disposeCharacters()
          return
        }

        setCharactersReady(true)
        playGesture('alexLookAtJordan')
        playGesture('jordanLookAtAlex')

        window.setTimeout(() => {
          playGesture('stopAlexGesture')
          playGesture('stopCompanionGesture')
        }, 1100)
      } catch (characterError) {
        console.error('Character initialization failed:', characterError)
        if (!cancelled) setCharactersReady(true)
      }
    }

    initializeCharacters()

    return () => {
      cancelled = true

      disposeCharacters().finally(() => {
        doctorRef.current?.replaceChildren()
        companionRef.current?.replaceChildren()
      })
    }
  }, [])

  function turnCharactersTowardEachOther() {
    playGesture('alexLookAtJordan')
    playGesture('jordanLookAtAlex')
  }

  function stopCharactersLookingAtEachOther() {
    playGesture('stopAlexGesture')
    playGesture('stopCompanionGesture')
  }

  function enqueueSpeech(text, speaker, onStart = null, onEnd = null) {
    if (!text) return Promise.resolve()

    const isAlex = speaker === 'alex'
    const character = isAlex ? 'doctor' : 'companion'
    const setSubtitle = isAlex ? setAlexSubtitle : setJordanSubtitle

    /*
     * Starts fetching and decoding immediately—even while another
     * character is still speaking.
     */
    const preparedSpeechPromise = prepareSpeech(text, character)

    queuedSpeechCountRef.current += 1

    speakingQueueRef.current = speakingQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        try {
          // Often already finished by the time this speech reaches the queue.
          const prepared = await preparedSpeechPromise

          await playPreparedSpeech({
            prepared,
            onSubtitle: setSubtitle,
            onStart: () => {
              if (isAlex) {
                setIsAlexSpeaking(true)
              } else {
                setIsJordanSpeaking(true)
              }

              onStart?.()
            },
          })
        } catch (speechError) {
          console.error(`${speaker} speech failed:`, speechError)
        } finally {
          if (isAlex) {
            setIsAlexSpeaking(false)
            setAlexSubtitle('')
          } else {
            setIsJordanSpeaking(false)
            setJordanSubtitle('')
          }

          onEnd?.()

          queuedSpeechCountRef.current -= 1

          if (queuedSpeechCountRef.current === 0) {
            playGesture('stopAlexGesture')
            playGesture('stopCompanionGesture')
          }
        }
      })

    return speakingQueueRef.current
  }

  function addMessage(from, text, kind = 'response') {
    if (!text) return

    setMessages((previous) => [
      ...previous,
      {
        id: uid(),
        from,
        text,
        kind,
      },
    ])
  }

  async function handleStreamPart(part, turnState) {
    switch (part.part) {
      case 'route':
        turnState.route = part.route

        if (part.route === 'fact_finding') {
          // Consultation ends when Alex begins searching.
          stopCharactersLookingAtEachOther()

          playGesture('jordanLookAtAlex')
          setShowCards(true)
          playGesture('startSwiping')
        }

        break

      case 'information_need':
        console.log('Information need', part.information_need || '')
        break

      case 'jordan_before':
        turnState.jordanBefore = part.message
        addMessage('jordan', part.message, 'framing')

        enqueueSpeech(
          part.message,
          'jordan',
          () => {
            // Consultation ends only when Jordan actually begins speaking.
            stopCharactersLookingAtEachOther()

            // Alex searches throughout Jordan's speech.
            setShowCards(true)
            playGesture('startSwiping')
          },
          () => {
            playGesture('stopCompanionGesture')
            playGesture('jordanLookAtAlex')
          },
        )

        break

      case 'search_query':
        console.log('Search query', part.search_query || '')
        setShowCards(true)
        playGesture('startSwiping')
        break

      case 'alex':
        stopCharactersLookingAtEachOther()

        turnState.alexAnswer = part.message

        const nextSources = part.sources || []
        const nextTalkingPoints = part.talking_points || []

        setSources(nextSources)
        setTalkingPoints([])
        addMessage('alex', part.message)

        let jordanThinkingTimer = null

        enqueueSpeech(
          part.message,
          'alex',
          () => {
            setShowCards(false)
            playGesture('stopSwiping')

            playGesture('stopAlexGesture')
            playGesture('stopCompanionGesture')
            playGesture('jordanLookAtAlex')

            // Mount the cards now, so their stagger starts with Alex’s speech.
            setTalkingPoints(nextTalkingPoints)

            jordanThinkingTimer = window.setTimeout(() => {
              playGesture('thinking')
            }, 2500)
          },
          () => {
            window.clearTimeout(jordanThinkingTimer)
            playGesture('stopCompanionGesture')
          },
        )

        break

      case 'jordan_after':
        stopCharactersLookingAtEachOther()
        turnState.jordanAfter = part.message
        addMessage('jordan', part.message, 'interpretation')
        enqueueSpeech(part.message, 'jordan', () => {
          // Only turn Alex when Jordan actually starts speaking.
          playGesture('alexLookAtJordan')
        })

        break

      case 'error':
        throw new Error(part.message || 'The adaptive chat request failed.')

      case 'done':
        console.log('Done!')
        break

      default:
        break
    }
  }

  async function handleSend(event) {
    event?.preventDefault()

    const message = input.trim()
    if (!message || isProcessing || isAlexSpeaking || isJordanSpeaking) return

    setInput('')
    setError('')
    setSources([])
    setTalkingPoints([])
    setIsProcessing(true)
    addMessage('user', message)

    // Characters turn to each other to "decide" who leads
    turnCharactersTowardEachOther()

    const turnState = {
      route: null,
      jordanBefore: null,
      alexAnswer: null,
      jordanAfter: null,
    }

    try {
      const response = await fetch(`${baseUrl}/adaptive/chat-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
      })

      if (!response.ok) {
        throw new Error(
          (await response.text()) || `Request failed (${response.status}).`,
        )
      }

      if (!response.body) {
        throw new Error(
          'The browser did not provide a readable response stream.',
        )
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) continue
          await handleStreamPart(JSON.parse(line), turnState)
        }
      }

      if (buffer.trim()) {
        await handleStreamPart(JSON.parse(buffer), turnState)
      }

      setHistory((previous) => {
        const next = [...previous, { role: 'user', content: message }]
        if (turnState.jordanBefore) {
          next.push({ role: 'jordan', content: turnState.jordanBefore })
        }
        if (turnState.alexAnswer) {
          next.push({ role: 'alex', content: turnState.alexAnswer })
        }
        if (turnState.jordanAfter) {
          next.push({ role: 'jordan', content: turnState.jordanAfter })
        }
        return next
      })
    } catch (requestError) {
      console.error('Adaptive chat failed:', requestError)
      setError(requestError.message)
    } finally {
      setIsProcessing(false)
      textareaRef.current?.focus()
    }
  }

  const inputDisabled =
    isProcessing || isAlexSpeaking || isJordanSpeaking || !charactersReady

  return (
    <div className="adaptive-root">
      <button
        type="button"
        className="adaptive-history-btn"
        onClick={() => setShowHistory(true)}
      >
        <FontAwesomeIcon icon={faCommentDots} />
        Chat history
      </button>
      <header className="adaptive-header">
        <img src={logo} alt="" className="adaptive-logo" />
        <div>
          <p>Clinical Trials Education</p>
          <h1>Explore with Alex and Jordan</h1>
        </div>
      </header>

      <main className="adaptive-layout">
        <section className="adaptive-stage-card">
          <div
            className={`adaptive-stage ${
              showCards || isAlexSpeaking
                ? 'alex-focused'
                : isJordanSpeaking
                  ? 'jordan-focused'
                  : ''
            }`}
          >
            <div
              className="adaptive-stage-background"
              style={{ backgroundImage: `url(${stageBackground})` }}
            />

            <div className="adaptive-character adaptive-character-alex">
              <div className="adaptive-character-label">Alex</div>

              <div className="adaptive-alex-character-content">
                {showCards && (
                  <div className="adaptive-swiping-cards">
                    <SwipingCards />
                  </div>
                )}

                <div
                  ref={doctorRef}
                  id="virtualdoctor"
                  className="virtual-doctor"
                />
              </div>

              {alexSubtitle && (
                <div className="adaptive-subtitle adaptive-subtitle-alex">
                  {alexSubtitle}
                </div>
              )}

              {!isAnyoneSpeaking && normalizedSources.length > 0 && (
                <SourcePanel sources={normalizedSources} />
              )}

              {talkingPoints.length > 0 && (
                <div
                  className={`adaptive-talking-points ${
                    isAlexSpeaking ? 'adaptive-talking-points-speaking' : ''
                  }`}
                >
                  {talkingPoints.slice(0, 3).map((point, index) => (
                    <div
                      key={`${point}-${index}`}
                      className="adaptive-talking-point"
                    >
                      <span className="adaptive-talking-point-number">
                        {index + 1}
                      </span>

                      <span className="adaptive-talking-point-text">
                        {point}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="adaptive-stage-divider" />

            <div className="adaptive-character adaptive-character-jordan">
              <div className="adaptive-character-label">Jordan</div>
              <div ref={companionRef} className="virtual-companion" />
              {jordanSubtitle && (
                <div className="adaptive-subtitle adaptive-subtitle-jordan">
                  {jordanSubtitle}
                </div>
              )}
            </div>

            {!charactersReady && (
              <div className="adaptive-character-loader">
                <FontAwesomeIcon icon={faSpinner} spin />
                <span>Preparing the virtual characters…</span>
              </div>
            )}
          </div>

          <form className="adaptive-input-form" onSubmit={handleSend}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  handleSend(event)
                }
              }}
              placeholder="Ask about clinical trial participation…"
              disabled={inputDisabled}
              rows={1}
            />
            <button
              type="submit"
              disabled={inputDisabled || !input.trim()}
              aria-label="Send question"
            >
              <FontAwesomeIcon icon={faPaperPlane} />
            </button>
          </form>

          {error && <div className="adaptive-error">{error}</div>}
        </section>
      </main>
      {showHistory && (
        <HistoryModal
          messages={messages}
          historyBodyRef={historyBodyRef}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  )
}

function HistoryModal({ messages, onClose, historyBodyRef }) {
  return (
    <div
      className="adaptive-history-overlay"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="adaptive-history-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adaptive-history-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="adaptive-history-header">
          <span id="adaptive-history-title">Conversation history</span>

          <button
            type="button"
            className="adaptive-history-close"
            onClick={onClose}
            aria-label="Close conversation history"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div
          ref={historyBodyRef}
          className="adaptive-history-body"
          aria-live="polite"
        >
          {messages.length === 0 ? (
            <div className="adaptive-history-empty">No messages yet.</div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`adaptive-history-message adaptive-history-message-${message.from}`}
              >
                <span className="adaptive-history-sender">
                  {message.from === 'user'
                    ? 'You'
                    : message.from === 'alex'
                      ? 'Alex'
                      : 'Jordan'}
                </span>

                <div className="adaptive-history-bubble">{message.text}</div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

function SourcePanel({ sources }) {
  return (
    <section className="adaptive-source-panel">
      <div className="adaptive-source-heading">
        <FontAwesomeIcon icon={faFileLines} />
        <span>Sources Alex used</span>
      </div>

      <div className="adaptive-source-list">
        {sources.map((source) => {
          const content = (
            <>
              <strong>{source.title}</strong>
              {source.source && <span>{source.source}</span>}
              {source.snippet && <p>{source.snippet}</p>}
            </>
          )

          return source.url ? (
            <a
              key={source.id}
              className="adaptive-source-card"
              href={source.url}
              target="_blank"
              rel="noreferrer"
            >
              {content}
              <small>
                Open source <FontAwesomeIcon icon={faArrowRight} />
              </small>
            </a>
          ) : (
            <div key={source.id} className="adaptive-source-card">
              {content}
            </div>
          )
        })}
      </div>
    </section>
  )
}
