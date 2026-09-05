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
import { faCircleCheck } from '@fortawesome/free-regular-svg-icons'
import {
  initCompanionCharacter,
  initDoctorCharacter,
  speakWithLipsync,
  speakWithLipsyncStatic,
  playGesture,
} from '../character.js'
import '../css/Adaptive.css'
import introSequences from '../data/introSequences.json'

const BASE_URL = 'http://127.0.0.1:8000'
// const BASE_URL =
//   'https://7bnfepvywhuc3ip5onitak3se40hivzn.lambda-url.us-east-1.on.aws'

const CONDITION_SINGLE_INFO = 1
const CONDITION_SINGLE_COMBINED = 2
const CONDITION_MULTIPLE = 3

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

  const introMessageCount = introSequences[condition]?.length ?? 0

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
  const [highlightCurrentTopic, setHighlightCurrentTopic] = useState(false)
  const [responseStatus, setResponseStatus] = useState('')
  const [showStartOverlay, setShowStartOverlay] = useState(true)
  const [showSceneLoading, setShowSceneLoading] = useState(false)
  const [starting, setStarting] = useState(false)
  const [showThinkingBubble, setShowThinkingBubble] = useState(false)
  const [finishing, setFinishing] = useState(false)

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

      // If intro already completed, show topics and current-topic highlight
      setShowTopics(session.introDone ?? false)
      setHighlightCurrentTopic(session.introDone ?? false)
    } catch (error) {
      console.error('Could not restore session:', error)
    }
  }, [SESSION_KEY])

  useEffect(() => {
    if (!started) return

    async function loadTopicState() {
      try {
        const response = await fetch(
          `${BASE_URL}/jordan/state/${participantId}`,
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
            `${BASE_URL}/logs/save-conversation-state`,
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

    // Reveal topics 8.7 seconds into the first intro
    setTimeout(() => {
      setShowTopics(true)
    }, 8700)

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

    setHighlightCurrentTopic(true)
  }

  useEffect(() => {
    if (!started || !charactersReady || showStartOverlay || showSceneLoading)
      return
    if (conversationStartedRef.current) return
    if (messages.length > 0) return

    conversationStartedRef.current = true

    async function startConversation() {
      setIsResponding(true)

      // Brief pause after the scene finishes settling
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Start generating Topic 1 while the prerecorded intro plays
      const conversationStartPromise = fetch(`${BASE_URL}/jordan/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participant_id: participantId,
          conversation_history: [],
          topic_history_start: introMessageCount,
          condition,
        }),
      })
      try {
        // Play the prerecorded introduction while Topic 1 generates
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
        const response = await conversationStartPromise

        // Then begin Topic 1
        if (!response.ok) {
          throw new Error(`Conversation start failed: ${response.status}`)
        }

        const data = await response.json()

        console.log('Conversation started:', data)

        const newTopicState = {
          current_topic_index: data.current_topic_index,
          conversation_complete: data.conversation_complete,
          phase: data.phase,
          topics: data.topics,
        }

        setTopicState(newTopicState)

        // Log starting conversation state to database
        try {
          const stateResponse = await fetch(
            `${BASE_URL}/logs/save-conversation-state`,
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

        if (!isSingleAgent) {
          playGesture('jordanLookAtAlex')
        }

        await speakWithLipsync(
          data.alex_reply,
          'doctor',
          null,
          null,
          setAlexSubtitle,
        )

        setAlexSubtitle('')

        // Conversational follow-up for c=2 and c=3
        if (condition !== CONDITION_SINGLE_INFO) {
          setMessages((previous) => [
            ...previous,
            {
              from: conversationalSpeaker,
              text: data.jordan_reply,
            },
          ])

          if (condition === CONDITION_SINGLE_COMBINED) {
            await speakWithLipsync(
              data.jordan_reply,
              'doctor',
              null,
              null,
              setAlexSubtitle,
            )

            setAlexSubtitle('')
          } else {
            playGesture('alexLookAtJordan')

            await speakWithLipsync(
              data.jordan_reply,
              'companion',
              null,
              null,
              setJordanSubtitle,
            )

            setJordanSubtitle('')
          }
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

    if (!isSingleAgent) {
      playGesture('alexLookAtJordan')
      playGesture('jordanLookAtAlex')
    }

    setIsResponding(true)
    setShowThinkingBubble(true)

    try {
      // 1. Send user message to Jordan
      const response = await fetch(`${BASE_URL}/jordan/turn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participant_id: participantId,
          user_message: trimmed,
          conversation_history: messages,
          condition,
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
          phase: data.phase,
          topics: data.topics,
        }

        setTopicState(newTopicState)

        // Log topic completion without blocking the conversation
        fetch(`${BASE_URL}/logs/log-topic-covered`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            participant_id: participantId,
            topic_number: data.completed_topic_number,
          }),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(
                `Topic completion logging failed: ${response.status}`,
              )
            }

            console.log('Topic completion logged')
          })
          .catch((error) => {
            console.error('Could not log topic completion:', error)
          })

        // Save updated conversation state without blocking the conversation
        fetch(`${BASE_URL}/logs/save-conversation-state`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            participant_id: participantId,
            state: newTopicState,
          }),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(
                `Saving conversation state failed: ${response.status}`,
              )
            }

            console.log('Updated conversation state logged:', newTopicState)
          })
          .catch((error) => {
            console.error('Could not log updated conversation state:', error)
          })
      }

      // If we advanced to another topic, Alex introduces it first,
      // then Jordan asks for the user's perspective
      if (data.topic_advanced && data.prepare_next_topic) {
        setShowThinkingBubble(false)
        setResponseStatus('Preparing next topic')

        const nextTopicResponse = await fetch(
          `${BASE_URL}/jordan/prepare-next-topic`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              participant_id: participantId,
              conversation_history: [
                ...messages,
                {
                  from: 'user',
                  text: trimmed,
                },
              ],
              condition,
            }),
          },
        )

        if (!nextTopicResponse.ok) {
          throw new Error(
            `Preparing next topic failed: ${nextTopicResponse.status}`,
          )
        }

        const nextTopicData = await nextTopicResponse.json()

        setResponseStatus('')

        // Alex introduces the next topic
        setMessages((previous) => [
          ...previous,
          {
            from: 'Alex',
            text: nextTopicData.alex_reply,
          },
        ])

        if (!isSingleAgent) {
          playGesture('jordanLookAtAlex')
        }

        setShowThinkingBubble(false)

        await speakWithLipsync(
          nextTopicData.alex_reply,
          'doctor',
          null,
          null,
          setAlexSubtitle,
        )

        setAlexSubtitle('')

        // Conversational follow-up for c=2 and c=3
        if (condition !== CONDITION_SINGLE_INFO) {
          setMessages((previous) => [
            ...previous,
            {
              from: conversationalSpeaker,
              text: nextTopicData.jordan_reply,
            },
          ])

          if (condition === CONDITION_SINGLE_COMBINED) {
            await speakWithLipsync(
              nextTopicData.jordan_reply,
              'doctor',
              null,
              null,
              setAlexSubtitle,
            )

            setAlexSubtitle('')
          } else {
            playGesture('alexLookAtJordan')

            setShowThinkingBubble(false)

            await speakWithLipsync(
              nextTopicData.jordan_reply,
              'companion',
              null,
              null,
              setJordanSubtitle,
            )

            setJordanSubtitle('')
          }
        }

        playGesture('stopAlexGesture')
        if (!isSingleAgent) {
          playGesture('stopCompanionGesture')
        }

        return
      }

      // 2. If Alex sent a direct reply, let Alex respond
      if (data.alex_reply) {
        setMessages((previous) => [
          ...previous,
          {
            from: 'Alex',
            text: data.alex_reply,
          },
        ])

        setShowThinkingBubble(false)

        await speakWithLipsync(
          data.alex_reply,
          'doctor',
          null,
          null,
          setAlexSubtitle,
        )

        setAlexSubtitle('')
        playGesture('stopAlexGesture')

        return
      }

      // 2. If Alex is needed, let Alex respond directly
      if (data.alex_info_needed) {
        const alexResponse = await fetch(`${BASE_URL}/alex/conversation-alex`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: trimmed,
            history: data.shared_history,
            earlier_memory: data.shared_memory,
            prior_topic_summaries: data.prior_topic_summaries,
            condition,
          }),
        })

        if (!alexResponse.ok) {
          throw new Error(`Alex request failed: ${alexResponse.status}`)
        }

        const alexData = await alexResponse.json()

        console.log('Alex response:', alexData)

        // Add Alex's response to chat
        setMessages((previous) => [
          ...previous,
          {
            from: 'Alex',
            text: alexData.answer,
          },
        ])

        // Start generating Jordan's follow-up while Alex speaks
        const jordanAfterAlexPromise =
          condition !== CONDITION_SINGLE_INFO
            ? fetch(`${BASE_URL}/jordan/after-alex`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  participant_id: participantId,
                  earlier_memory: data.shared_memory,
                  conversation_history: [
                    ...data.shared_history,
                    { from: 'user', text: trimmed },
                    { from: 'Alex', text: alexData.answer },
                  ],
                }),
              })
            : null

        if (!isSingleAgent) {
          playGesture('jordanLookAtAlex')
        }

        setShowThinkingBubble(false)

        // Alex speaks
        await speakWithLipsync(
          alexData.answer,
          'doctor',
          null,
          null,
          setAlexSubtitle,
        )

        setAlexSubtitle('')

        // Conversational follow-up for c=2 and c=3
        if (jordanAfterAlexPromise) {
          const jordanAfterAlexResponse = await jordanAfterAlexPromise

          if (!jordanAfterAlexResponse.ok) {
            throw new Error(
              `Jordan after Alex request failed: ${jordanAfterAlexResponse.status}`,
            )
          }

          const jordanAfterAlexData = await jordanAfterAlexResponse.json()

          console.log('Jordan after Alex:', jordanAfterAlexData)

          setMessages((previous) => [
            ...previous,
            {
              from: conversationalSpeaker,
              text: jordanAfterAlexData.jordan_reply,
            },
          ])

          if (condition === CONDITION_SINGLE_COMBINED) {
            setShowThinkingBubble(false)
            await speakWithLipsync(
              jordanAfterAlexData.jordan_reply,
              'doctor',
              null,
              null,
              setAlexSubtitle,
            )

            setAlexSubtitle('')
          } else {
            playGesture('alexLookAtJordan')

            setShowThinkingBubble(false)
            await speakWithLipsync(
              jordanAfterAlexData.jordan_reply,
              'companion',
              null,
              null,
              setJordanSubtitle,
            )

            setJordanSubtitle('')
          }
        }

        playGesture('stopAlexGesture')
        if (!isSingleAgent) {
          playGesture('stopCompanionGesture')
        }

        return
      }

      // 3. Otherwise, conversational response
      setMessages((previous) => [
        ...previous,
        {
          from: conversationalSpeaker,
          text: data.jordan_reply,
        },
      ])

      if (condition === CONDITION_SINGLE_COMBINED) {
        setShowThinkingBubble(false)
        await speakWithLipsync(
          data.jordan_reply,
          'doctor',
          null,
          null,
          setAlexSubtitle,
        )

        setAlexSubtitle('')
      } else {
        playGesture('alexLookAtJordan')

        setShowThinkingBubble(false)
        await speakWithLipsync(
          data.jordan_reply,
          'companion',
          null,
          null,
          setJordanSubtitle,
        )

        setJordanSubtitle('')
      }

      playGesture('stopAlexGesture')
      if (!isSingleAgent) {
        playGesture('stopCompanionGesture')
      }
    } catch (error) {
      console.error('Conversation error:', error)
    } finally {
      setShowThinkingBubble(false)
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
      // 1. Save final conversation state
      if (topicState) {
        const stateResponse = await fetch(
          `${BASE_URL}/logs/save-conversation-state`,
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
                  You are about to talk about your 3 selected topics with two
                  virtual characters: <strong>Alex</strong> and{' '}
                  <strong>Jordan</strong>!
                </p>
              ) : (
                <p>
                  You are about to talk about your 3 selected topics with a
                  virtual character: <strong>Alex</strong>!
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
                <span className="notice">Remember:</span>{' '}
                {!isSingleAgent ? (
                  <strong>
                    Please interact with the virtual characters as the person
                    described in the pre-survey.
                  </strong>
                ) : (
                  <strong>
                    Please interact with the virtual character as the person
                    described in the pre-survey.
                  </strong>
                )}{' '}
                You've been diagnosed with cancer, and your oncologist suggested
                this site to help you learn about clinical trials as a possible
                option, before exploring any specific trials.
              </p>
              <p>
                <span className="notice">Completing the activity:</span>{' '}
                {!isSingleAgent ? (
                  <strong>
                    After the virtual characters walk you through the 3 topics,
                    a Finish Button will appear in the top right corner of your
                    screen.
                  </strong>
                ) : (
                  <strong>
                    After the virtual character walks you through the 3 topics,
                    a Finish Button will appear in the top right corner of your
                    screen.
                  </strong>
                )}{' '}
                You may continue asking as many or as few questions as you'd
                like until you feel you've experienced how the website can help
                someone learn about clinical trial participation.
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

        {topicState?.phase === 'wrapup' && (
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
              'Finish'
            )}

            <span className="icon">
              <FontAwesomeIcon icon={faArrowRight} size="xs" />
            </span>
          </button>
        )}
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
            'Finish'
          )}

          <span className="icon">
            <FontAwesomeIcon icon={faArrowRight} size="xs" />
          </span>
        </button>

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
              <TopicProgress
                topicState={topicState}
                showTopics={showTopics}
                highlightCurrentTopic={highlightCurrentTopic}
              />

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
              isResponding={isResponding}
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

function TopicProgress({ topicState, showTopics, highlightCurrentTopic }) {
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

        {topicState.topics.map((topic, index) => {
          const statusClass =
            topic.status === 'active' && !highlightCurrentTopic
              ? ''
              : topic.status

          return (
            <div
              key={topic.topic}
              className={`topic-progress-item ${statusClass}`}
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
          )
        })}
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
