import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
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

const BASE_URL = 'http://127.0.0.1:8000'
// const BASE_URL =
//   'https://brcco3c42yqwcnqmvj4h2k2igu0fysxd.lambda-url.us-east-1.on.aws'

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

  const participantId =
    searchParams.get('id') ||
    searchParams.get('PROLIFIC_PID') ||
    'test-participant'

  const condition = Number(searchParams.get('c') ?? 0)

  const doctorRef = useRef(null)
  const companionRef = useRef(null)
  const textareaRef = useRef(null)
  const historyBodyRef = useRef(null)
  const conversationStartedRef = useRef(false)
  const introStartedRef = useRef(false)

  const SESSION_KEY = `studySession-${participantId}-${condition}`

  const [started, setStarted] = useState(false)
  const [charactersReady, setCharactersReady] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [topicState, setTopicState] = useState(null)
  const [startChecks, setStartChecks] = useState({
    volume: false,
    browser: false,
  })
  const [alexSubtitle, setAlexSubtitle] = useState('')
  const [jordanSubtitle, setJordanSubtitle] = useState('')
  const [sentMessageAnimation, setSentMessageAnimation] = useState('')
  const [introDone, setIntroDone] = useState(false)
  const canStart = Object.values(startChecks).every(Boolean)
  const [showTopics, setShowTopics] = useState(false)
  const [isResponding, setIsResponding] = useState(false)

  // Restore saved conversation history
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY)

      if (!saved) return

      const session = JSON.parse(saved)

      const restoredMessages = session.messages ?? []
      const restoredTopicState = session.topicState ?? null

      setMessages(restoredMessages)
      setTopicState(restoredTopicState)
      setIntroDone(session.introDone ?? false)

      // Only show topics immediately if the intro was already completed
      setShowTopics(session.introDone ?? false)
    } catch (error) {
      console.error('Could not restore session:', error)
    }
  }, [SESSION_KEY])

  useEffect(() => {
    if (!started) return

    async function loadTopicState() {
      try {
        const response = await fetch(
          `${BASE_URL}/conversation/state/${participantId}`,
        )

        if (!response.ok) {
          throw new Error(`Topic state request failed: ${response.status}`)
        }

        const data = await response.json()

        console.log('Topic state:', data)

        setTopicState(data)

        // Keep database copy of conversation state up to date
        try {
          const stateResponse = await fetch(
            `${BASE_URL}/save-conversation-state`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                participant_id: participantId,
                state: data,
              }),
            },
          )

          if (!stateResponse.ok) {
            throw new Error(
              `Saving conversation state failed: ${stateResponse.status}`,
            )
          }

          console.log('Recovered conversation state logged:', data)
        } catch (error) {
          console.error('Could not log recovered conversation state:', error)
        }
      } catch (error) {
        console.error('Could not load topic state:', error)
      }
    }

    loadTopicState()
  }, [started, participantId])

  // save conversation transcript
  useEffect(() => {
    if (messages.length === 0) return

    async function saveConversationTranscript() {
      try {
        const response = await fetch(
          `${BASE_URL}/log-conversation-transcript`,
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
      topicState,
      introDone,
    }

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  }, [SESSION_KEY, participantId, condition, messages, topicState, introDone])

  // Initialize both virtual characters after Begin is clicked
  useEffect(() => {
    if (!started) return

    async function initCharacters() {
      try {
        setCharactersReady(false)

        await Promise.all([
          initDoctorCharacter(doctorRef.current),
          initCompanionCharacter(companionRef.current),
        ])

        await Promise.all([
          waitForCharacterRender(doctorRef.current),
          waitForCharacterRender(companionRef.current),
        ])

        setCharactersReady(true)
      } catch (error) {
        console.error('Failed to initialize characters:', error)
      }
    }

    initCharacters()
  }, [started])

  async function playCharacterIntro() {
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Jordan intro 1
    playGesture('alexLookAtJordan')

    setMessages((previous) => [
      ...previous,
      {
        from: 'Jordan',
        text: "Hi there, I'm Jordan, and this is Alex. We are AI-powered virtual characters here to help you explore and understand clinical trial participation. My role is to guide our conversation through a few topics chosen based on your earlier survey responses and ask about what you think or feel about each one.",
      },
    ])

    setTimeout(() => {
      setShowTopics(true)
    }, 9169)

    await speakWithLipsyncStatic(
      '/intro-voices/companion-audio-JORDAN_INTRO_1.mp3',
      '/intro-voices/companion-timestamps-JORDAN_INTRO_1.json',
      'companion',
      true,
      setJordanSubtitle,
    )

    setJordanSubtitle('')

    // Alex intro 1
    playGesture('jordanLookAtAlex')

    setMessages((previous) => [
      ...previous,
      {
        from: 'Alex',
        text: "And my role is to provide information. I can quickly access information from trusted health resources, such as the National Cancer Institute. When questions come up or more information might help, I'll step in with information to help you better understand the topic.",
      },
    ])

    await speakWithLipsyncStatic(
      '/intro-voices/doctor-audio-ALEX_INTRO_1.mp3',
      '/intro-voices/doctor-timestamps-ALEX_INTRO_1.json',
      'doctor',
      true,
      setAlexSubtitle,
    )

    setAlexSubtitle('')

    // Jordan intro 2
    playGesture('alexLookAtJordan')

    setMessages((previous) => [
      ...previous,
      {
        from: 'Jordan',
        text: "We'll take the topics one at a time, and you can ask questions or share whatever comes to mind along the way. Let's get started!",
      },
    ])

    await speakWithLipsyncStatic(
      '/intro-voices/companion-audio-JORDAN_INTRO_2.mp3',
      '/intro-voices/companion-timestamps-JORDAN_INTRO_2.json',
      'companion',
      true,
      setJordanSubtitle,
    )

    setJordanSubtitle('')

    playGesture('stopAlexGesture')
    playGesture('stopCompanionGesture')
  }

  useEffect(() => {
    if (!started || !charactersReady) return
    if (conversationStartedRef.current) return
    if (messages.length > 0) return

    conversationStartedRef.current = true

    async function startConversation() {
      setIsResponding(true)
      try {
        // Play the prerecorded introduction first
        if (!introDone && !introStartedRef.current) {
          introStartedRef.current = true

          await playCharacterIntro()

          // Log when the character intro actually finishes
          try {
            const introResponse = await fetch(
              `${BASE_URL}/log-intro-finished`,
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

        // Then begin Topic 1
        const response = await fetch(`${BASE_URL}/conversation/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            participant_id: participantId,
            conversation_history: [],
          }),
        })

        if (!response.ok) {
          throw new Error(`Conversation start failed: ${response.status}`)
        }

        const data = await response.json()

        console.log('Conversation started:', data)

        const newTopicState = {
          current_topic_index: data.current_topic_index,
          conversation_complete: data.conversation_complete,
          topics: data.topics,
        }

        setTopicState(newTopicState)

        // Log starting conversation state to database
        try {
          const stateResponse = await fetch(
            `${BASE_URL}/save-conversation-state`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                participant_id: participantId,
                state: newTopicState,
              }),
            },
          )

          if (!stateResponse.ok) {
            throw new Error(
              `Saving conversation state failed: ${stateResponse.status}`,
            )
          }

          const stateData = await stateResponse.json()

          console.log('Conversation state logged:', stateData)
        } catch (error) {
          console.error('Could not log conversation state:', error)
        }

        // Alex introduces Topic 1
        setMessages((previous) => [
          ...previous,
          {
            from: 'Alex',
            text: data.alex_reply,
          },
        ])

        playGesture('jordanLookAtAlex')

        await speakWithLipsync(
          data.alex_reply,
          'doctor',
          null,
          null,
          setAlexSubtitle,
        )

        setAlexSubtitle('')

        // Jordan then asks for the user's perspective
        setMessages((previous) => [
          ...previous,
          {
            from: 'Jordan',
            text: data.jordan_reply,
          },
        ])

        playGesture('alexLookAtJordan')

        await speakWithLipsync(
          data.jordan_reply,
          'companion',
          null,
          null,
          setJordanSubtitle,
        )

        setJordanSubtitle('')

        playGesture('stopAlexGesture')
        playGesture('stopCompanionGesture')
      } catch (error) {
        console.error('Could not start conversation:', error)

        conversationStartedRef.current = false
      } finally {
        setIsResponding(false)
      }
    }

    startConversation()
  }, [started, charactersReady, participantId, messages.length, introDone])

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

    playGesture('alexLookAtJordan')
    playGesture('thinking')

    setIsResponding(true)

    try {
      // 1. Send user message to Jordan
      const response = await fetch(`${BASE_URL}/conversation/turn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participant_id: participantId,
          user_message: trimmed,
          conversation_history: messages,
        }),
      })

      if (!response.ok) {
        throw new Error(`Conversation request failed: ${response.status}`)
      }

      const data = await response.json()

      console.log('Conversation response:', data)

      if (data.topic_advanced) {
        const newTopicState = {
          current_topic_index: data.current_topic_index,
          conversation_complete: data.conversation_complete,
          topics: data.topics,
        }

        setTopicState(newTopicState)

        // Log the topic that was just completed
        try {
          const topicResponse = await fetch(`${BASE_URL}/log-topic-covered`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              participant_id: participantId,
              topic_number: data.completed_topic_number,
            }),
          })

          if (!topicResponse.ok) {
            throw new Error(
              `Topic completion logging failed: ${topicResponse.status}`,
            )
          }

          const topicData = await topicResponse.json()

          console.log('Topic completion logged:', topicData)
        } catch (error) {
          console.error('Could not log topic completion:', error)
        }

        // Save the updated conversation state
        try {
          const stateResponse = await fetch(
            `${BASE_URL}/save-conversation-state`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                participant_id: participantId,
                state: newTopicState,
              }),
            },
          )

          if (!stateResponse.ok) {
            throw new Error(
              `Saving conversation state failed: ${stateResponse.status}`,
            )
          }

          console.log('Updated conversation state logged:', newTopicState)
        } catch (error) {
          console.error('Could not log updated conversation state:', error)
        }
      }

      // If we advanced to another topic, Alex introduces it first,
      // then Jordan asks for the user's perspective
      if (data.topic_advanced && data.alex_reply) {
        setMessages((previous) => [
          ...previous,
          {
            from: 'Alex',
            text: data.alex_reply,
          },
        ])

        playGesture('jordanLookAtAlex')

        await speakWithLipsync(
          data.alex_reply,
          'doctor',
          null,
          null,
          setAlexSubtitle,
        )

        setAlexSubtitle('')

        setMessages((previous) => [
          ...previous,
          {
            from: 'Jordan',
            text: data.jordan_reply,
          },
        ])

        playGesture('alexLookAtJordan')

        await speakWithLipsync(
          data.jordan_reply,
          'companion',
          null,
          null,
          setJordanSubtitle,
        )

        setJordanSubtitle('')

        playGesture('stopAlexGesture')
        playGesture('stopCompanionGesture')

        return
      }

      // 2. Add Jordan's response to chat
      setMessages((previous) => [
        ...previous,
        {
          from: 'Jordan',
          text: data.jordan_reply,
        },
      ])

      // 3. If Alex is needed, start generating Alex's answer immediately
      let alexResponsePromise = null

      if (data.alex_info_needed) {
        alexResponsePromise = fetch(`${BASE_URL}/conversation-alex`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: trimmed,
            history: [
              ...messages,
              {
                from: 'Jordan',
                text: data.jordan_reply,
              },
            ],
          }),
        })
      }

      // 4. Jordan speaks while Alex generates
      await speakWithLipsync(
        data.jordan_reply,
        'companion',
        null,
        null,
        setJordanSubtitle,
      )
      setJordanSubtitle('')

      if (!alexResponsePromise) {
        playGesture('stopAlexGesture')
        playGesture('stopCompanionGesture')
      }

      // 5. If Alex was needed, get the response that was generating
      if (alexResponsePromise) {
        const alexResponse = await alexResponsePromise

        if (!alexResponse.ok) {
          throw new Error(`Alex request failed: ${alexResponse.status}`)
        }

        const alexData = await alexResponse.json()

        console.log('Alex response:', alexData)

        // 5. Add Alex's response to chat
        setMessages((previous) => [
          ...previous,
          {
            from: 'Alex',
            text: alexData.answer,
          },
        ])

        // 6. Start generating Jordan's follow-up immediately
        const jordanAfterAlexPromise = fetch(
          `${BASE_URL}/conversation/after-alex`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              participant_id: participantId,
              user_message: trimmed,
              alex_answer: alexData.answer,
              conversation_history: [
                ...messages,
                {
                  from: 'user',
                  text: trimmed,
                },
                {
                  from: 'Jordan',
                  text: data.jordan_reply,
                },
                {
                  from: 'Alex',
                  text: alexData.answer,
                },
              ],
            }),
          },
        )

        playGesture('jordanLookAtAlex')
        // 7. Alex speaks while Jordan's follow-up generates
        await speakWithLipsync(
          alexData.answer,
          'doctor',
          null,
          null,
          setAlexSubtitle,
        )
        setAlexSubtitle('')

        // 8. Get Jordan's already-running follow-up response
        const jordanAfterAlexResponse = await jordanAfterAlexPromise

        if (!jordanAfterAlexResponse.ok) {
          throw new Error(
            `Jordan after Alex request failed: ${jordanAfterAlexResponse.status}`,
          )
        }

        const jordanAfterAlexData = await jordanAfterAlexResponse.json()

        console.log('Jordan after Alex:', jordanAfterAlexData)

        // 8. Add Jordan's follow-up to chat
        setMessages((previous) => [
          ...previous,
          {
            from: 'Jordan',
            text: jordanAfterAlexData.jordan_reply,
          },
        ])

        playGesture('alexLookAtJordan')
        // 9. Jordan speaks again
        await speakWithLipsync(
          jordanAfterAlexData.jordan_reply,
          'companion',
          null,
          null,
          setJordanSubtitle,
        )
        setJordanSubtitle('')
        playGesture('stopAlexGesture')
        playGesture('stopCompanionGesture')
      }
    } catch (error) {
      console.error('Conversation error:', error)
    } finally {
      setIsResponding(false)
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend(event)
    }
  }

  async function handleBegin() {
    if (!canStart) return

    try {
      const response = await fetch(`${BASE_URL}/log-conversation-started`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participant_id: participantId,
        }),
      })

      if (!response.ok) {
        throw new Error(`Conversation start logging failed: ${response.status}`)
      }

      const data = await response.json()

      console.log('Conversation started logged:', data)
    } catch (error) {
      console.error('Could not log conversation start:', error)
    }

    setStarted(true)
  }

  async function handleFinish() {
    try {
      // 1. Save final conversation state
      if (topicState) {
        const stateResponse = await fetch(
          `${BASE_URL}/save-conversation-state`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              participant_id: participantId,
              state: topicState,
            }),
          },
        )

        if (!stateResponse.ok) {
          throw new Error(
            `Final conversation state save failed: ${stateResponse.status}`,
          )
        }
      }

      // 2. Save final transcript
      const transcriptResponse = await fetch(
        `${BASE_URL}/log-conversation-transcript`,
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
        `${BASE_URL}/log-conversation-finished`,
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

      alert('TODO: Redirect participant to the next page after finishing!')
    } catch (error) {
      console.error('Could not finish conversation:', error)
    }
  }

  // ---------------------------------------------------------------------------
  // Start overlay
  // ---------------------------------------------------------------------------

  if (!started) {
    return (
      <div className="start-overlay">
        <div className="mi-start-overlay-content">
          <img src={logo} className="logo" alt="Study logo" />

          <h2>Clinical Trials Education</h2>
          <h1>Chat with Virtual Characters</h1>

          <div className="mi-start-information">
            In this activity, you'll learn about clinical trials with the help
            of two virtual characters: <strong>Alex and Jordan</strong>.
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
          </div>

          <div className="mi-start-instructions">
            Please complete this short checklist, then click Begin.
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
            onClick={handleBegin}
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

  // ---------------------------------------------------------------------------
  // Main interaction
  // ---------------------------------------------------------------------------

  return (
    <div className="mi-root main-interaction1">
      <div className="tool-header">
        <img src={logo} className="logo" alt="Study logo" />
        <h2>Clinical Trials Education</h2>
        <h1>Chat with Virtual Characters</h1>
      </div>

      <button className="history-btn" onClick={() => setShowHistory(true)}>
        Chat history
      </button>

      <main className="mi-main">
        <section className="mi-chat-card">
          <div
            className={`mi-chat-header mi-shared-character-stage ${
              charactersReady ? 'characters-ready' : 'characters-loading'
            }`}
          >
            <div
              className="mi-shared-stage-background"
              style={{
                backgroundImage: `url(${stageBackground})`,
              }}
            />

            <div className="mi-character-zone mi-character-zone-alex">
              <div className="mi-character-content">
                <div
                  className="virtual-doctor"
                  id="virtualdoctor"
                  ref={doctorRef}
                />
                {alexSubtitle && (
                  <div className="character-subtitle character-subtitle-alex">
                    {alexSubtitle}
                  </div>
                )}
              </div>
            </div>
            <TopicProgress topicState={topicState} showTopics={showTopics} />

            <div className="mi-character-zone mi-character-zone-jordan">
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
              </div>
            </div>
          </div>

          {topicState?.conversation_complete ? (
            <div className="finish-area">
              <button
                type="button"
                className="finish-button"
                onClick={handleFinish}
              >
                Finish
                <FontAwesomeIcon icon={faArrowRight} />
              </button>
            </div>
          ) : (
            <ChatInput
              input={input}
              textareaRef={textareaRef}
              onChange={setInput}
              onSubmit={handleSend}
              onHandleKeyDown={handleKeyDown}
              sentMessageAnimation={sentMessageAnimation}
              isResponding={isResponding}
            />
          )}
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
  )
}

function TopicProgress({ topicState, showTopics }) {
  if (!topicState) return null

  const currentTopicIndex = topicState.current_topic_index

  return (
    <div
      className={`topic-progress ${
        showTopics ? 'topic-progress-visible' : 'topic-progress-hidden'
      }`}
    >
      <div
        className="topic-progress-list"
        style={{
          '--topic-count': topicState.topics.length,
          '--progress':
            topicState.topics.length > 1
              ? currentTopicIndex / (topicState.topics.length - 1)
              : 0,
        }}
      >
        <div className="topic-progress-line" />
        <div className="topic-progress-line-fill" />

        {topicState.topics.map((topic, index) => (
          <div
            key={topic.topic}
            className={`topic-progress-item ${topic.status}`}
            style={{
              '--topic-delay': `${index * 160}ms`,
            }}
          >
            <span className="topic-progress-number">
              {topic.status === 'completed' ? (
                <FontAwesomeIcon icon={faCheck} />
              ) : (
                index + 1
              )}
            </span>

            <span className="topic-progress-name">{topic.topic}</span>
          </div>
        ))}
      </div>
    </div>
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
            placeholder="Type a message..."
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
