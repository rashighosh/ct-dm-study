import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import logo from '../assets/logo-transparent.png'
import alex from '../assets/alex.png'
import jordan from '../assets/jordan.png'
import stageBackground from '../assets/bg.jpg'
import { RESOURCES } from '../data/resources.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPaperPlane,
  faVolume,
  faExpand,
  faArrowRight,
  faCheck,
  faClipboardList,
  faChevronRight,
  faStar,
} from '@fortawesome/free-solid-svg-icons'
import { faCircleCheck } from '@fortawesome/free-regular-svg-icons'
import {
  initCompanionCharacter,
  initDoctorCharacter,
  speakWithLipsync,
  speakWithLipsyncStatic,
  prepareSpeech,
  playPreparedSpeech,
  playGesture,
  startSwiping,
  stopSwiping,
  swivelAlexTowardJordan,
  swivelJordanTowardAlex,
} from '../character.js'
import '../css/Adaptive.css'
import introSequences from '../data/introSequences.json'
import SwipingCards from './SwipingCards'
import { INTRO_VISUAL_CUES } from '../data/introVisualCues'

const BASE_URL = 'http://127.0.0.1:8000'
// const BASE_URL =
//   'https://7bnfepvywhuc3ip5onitak3se40hivzn.lambda-url.us-east-1.on.aws'

const CONDITION_SINGLE_INFO = 1
const CONDITION_SINGLE_COMBINED = 2
const CONDITION_MULTIPLE = 3

const CONDITION_NAMES = {
  1: 'Single Info Only',
  2: 'Single Combined',
  3: 'Multiple',
}

const JORDAN_OPENING_FILLER =
  "Gotcha! Let me make sure I'm getting this right by quickly repeating that back to you."

const ALEX_TOPIC_FILLER =
  "I'll review the information available to me and identify a few topics that may be most relevant to your concerns."

const ALEX_TOPIC_SELECTION_INSTRUCTIONS =
  'You can keep these suggestions or change any of them using the options above. ' +
  "Once you're satisfied with your selections, click Continue to begin."

const STUDY_FILLER_AUDIO = {
  jordanOpening: {
    audio: '/intro-voices/companion-audio-JORDAN_OPENING_FILLER.mp3',
    timestamps: '/intro-voices/companion-timestamps-JORDAN_OPENING_FILLER.json',
  },
  alexTopic: {
    audio: '/intro-voices/doctor-audio-ALEX_TOPIC_FILLER.mp3',
    timestamps: '/intro-voices/doctor-timestamps-ALEX_TOPIC_FILLER.json',
  },
  alexInstructions: {
    audio: '/intro-voices/doctor-audio-ALEX_TOPIC_SELECTION_INSTRUCTIONS.mp3',
    timestamps:
      '/intro-voices/doctor-timestamps-ALEX_TOPIC_SELECTION_INSTRUCTIONS.json',
  },
}

const STUDY_TOPICS = [
  { id: 'cost', name: 'Costs of Participating' },
  { id: 'support', name: 'Getting Help with Participation' },
  { id: 'logistics', name: 'Transportation and Financial Support' },
  { id: 'doctor', name: 'Keeping My Doctor Informed' },
  { id: 'side_effects', name: 'Side Effects' },
  { id: 'quality', name: 'Quality of Care' },
]

const RESOURCE_PREVIEWS = {
  'featured-trials': '/resource-previews/featured-trials.pdf',
  'personal-stories': '/resource-previews/personal-stories.pdf',
  'sample-consent': '/resource-previews/sample-consent.pdf',
  'questions-to-ask': '/resource-previews/questions-to-ask.pdf',
  'details-checklist': '/resource-previews/details-checklist.pdf',
  'finding-guide': '/resource-previews/finding-guide.pdf',
  'nci-specialist': '/resource-previews/nci-specialist.pdf',
  'trial-search': '/resource-previews/trial-search.pdf',
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

function shuffleArray(array) {
  const shuffled = [...array]

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled
}

export default function MainInteraction() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const participantId = searchParams.get('id') || 'navi-test'

  const condition = Number(searchParams.get('c') ?? 3)

  const isSingleAgent =
    condition === CONDITION_SINGLE_INFO ||
    condition === CONDITION_SINGLE_COMBINED

  const conversationalSpeaker =
    condition === CONDITION_MULTIPLE ? 'Jordan' : 'Alex'

  const introMessageCount = introSequences[condition]?.length ?? 0

  const doctorRef = useRef(null)
  const companionRef = useRef(null)
  const textareaRef = useRef(null)
  const historyBodyRef = useRef(null)
  const conversationStartedRef = useRef(false)
  const introStartedRef = useRef(false)
  const skipIntroRef = useRef(false)
  const startFirstTopicResolverRef = useRef(null)

  const SESSION_KEY = `studySession-${participantId}-${condition}`
  const ENGAGEMENT_KEY = `${SESSION_KEY}-engaged-topics`

  const [engagedTopics, setEngagedTopics] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(ENGAGEMENT_KEY) || '[]')
    } catch {
      return []
    }
  })

  const [entryLogged, setEntryLogged] = useState(false)
  const [entryLogError, setEntryLogError] = useState(false)
  const entryLoggingRef = useRef(false)
  const [started, setStarted] = useState(false)
  const [sessionRestored, setSessionRestored] = useState(false)
  const [charactersReady, setCharactersReady] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [showQuestions, setShowQuestions] = useState(false)
  const [showQuestionsTab, setShowQuestionsTab] = useState(false)
  const [topicState, setTopicState] = useState(null)
  const hasEngagedCurrentTopic = engagedTopics.includes(
    topicState?.current_topic_index,
  )
  const [startChecks, setStartChecks] = useState({
    volume: false,
    browser: false,
  })
  const [alexSubtitle, setAlexSubtitle] = useState('')
  const [jordanSubtitle, setJordanSubtitle] = useState('')
  const [sentMessageAnimation, setSentMessageAnimation] = useState('')
  const [introDone, setIntroDone] = useState(false)
  const [introNextIndex, setIntroNextIndex] = useState(0)
  const [openingResponseDone, setOpeningResponseDone] = useState(false)
  const [openingComplete, setOpeningComplete] = useState(false)
  const [awaitingTopicElaboration, setAwaitingTopicElaboration] =
    useState(false)
  const [availableTopics, setAvailableTopics] = useState([])
  const [selectedTopics, setSelectedTopics] = useState([])
  const [showTopicSelection, setShowTopicSelection] = useState(false)
  const [showChatInput, setShowChatInput] = useState(
    condition !== CONDITION_MULTIPLE,
  )
  const [introInstruction, setIntroInstruction] = useState([])
  const [waitingForFirstTopic, setWaitingForFirstTopic] = useState(false)
  const canStart = entryLogged && Object.values(startChecks).every(Boolean)
  const [showTopics, setShowTopics] = useState(false)
  const [isResponding, setIsResponding] = useState(false)
  const [highlightCurrentTopic, setHighlightCurrentTopic] = useState(false)
  const [responseStatus, setResponseStatus] = useState('')
  const [showStartOverlay, setShowStartOverlay] = useState(true)
  const [showSceneLoading, setShowSceneLoading] = useState(false)
  const [starting, setStarting] = useState(false)
  const [showThinkingBubble, setShowThinkingBubble] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [showResourceChoice, setShowResourceChoice] = useState(false)
  const [resourceChoice, setResourceChoice] = useState(null)
  const [showSurveyButton, setShowSurveyButton] = useState(false)
  const [suggestedResources, setSuggestedResources] = useState([])
  const [shuffledResources] = useState(() => shuffleArray(RESOURCES))
  const displayedResources =
    condition === CONDITION_SINGLE_INFO
      ? shuffledResources
      : [
          ...suggestedResources,
          ...shuffledResources.filter(
            (resource) => !suggestedResources.some((r) => r.id === resource.id),
          ),
        ]
  const [openedResources, setOpenedResources] = useState([])
  const openedResourcesRef = useRef([])
  const resourceLoggingQueueRef = useRef(Promise.resolve())
  const transcriptLoggingQueueRef = useRef(Promise.resolve())
  const [previewResource, setPreviewResource] = useState(null)
  const [activeSpeaker, setActiveSpeaker] = useState(null)
  const [focusedCharacter, setFocusedCharacter] = useState('Jordan')
  const [introVisuals, setIntroVisuals] = useState({
    Alex: null,
    Jordan: null,
  })

  const introVisualTimersRef = useRef([])
  const [showSwipingCards, setShowSwipingCards] = useState(false)

  // Log participant entry before allowing the interaction to begin
  async function logConversationEntered() {
    if (entryLoggingRef.current || entryLogged) return

    entryLoggingRef.current = true
    setEntryLogError(false)

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
        throw new Error(`Conversation entry logging failed: ${response.status}`)
      }

      const data = await response.json()

      console.log('Conversation entered logged:', data)

      setEntryLogged(true)
    } catch (error) {
      console.error('Could not log conversation entry:', error)
      setEntryLogError(true)
    } finally {
      entryLoggingRef.current = false
    }
  }

  useEffect(() => {
    return () => {
      introVisualTimersRef.current.forEach(clearTimeout)
      introVisualTimersRef.current = []
    }
  }, [])

  // Log entry only for a new study session.
  // Participants resuming an existing session have already been logged.
  useEffect(() => {
    const savedSession = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}')

    if (savedSession.started === true) {
      console.log('Existing study session — skipping entry logging')
      setEntryLogged(true)
      return
    }

    logConversationEntered()
  }, [SESSION_KEY, participantId, condition])

  // Restore saved conversation history
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY)

      if (!saved) return

      const session = JSON.parse(saved)

      const restoredMessages = session.messages ?? []
      const restoredTopicState = session.topicState ?? null

      const restoredIntroIndex = session.introDone
        ? introMessageCount
        : Math.min(
            Math.max(Number(session.introNextIndex) || 0, 0),
            introMessageCount,
          )

      setMessages(restoredMessages)
      setTopicState(restoredTopicState)

      // Keep the start overlay visible until Begin is clicked again.
      // The saved "started" value still tells us whether this is a resume.
      setStarted(false)
      setIntroDone(session.introDone ?? false)
      setIntroNextIndex(restoredIntroIndex)

      setOpeningResponseDone(session.openingResponseDone ?? false)
      setOpeningComplete(session.openingComplete ?? false)
      setAwaitingTopicElaboration(session.awaitingTopicElaboration ?? false)
      setAvailableTopics(session.availableTopics ?? [])
      setSelectedTopics(session.selectedTopics ?? [])
      setShowTopicSelection(session.showTopicSelection ?? false)
      // Restore the chat panel based on intro progress.
      setShowChatInput(
        condition !== CONDITION_MULTIPLE ||
          session.introDone === true ||
          restoredIntroIndex >= 7,
      )

      // Restore opening instructions only if the user hasn't responded.
      const hasUserResponded = restoredMessages.some(
        (message) => message.from === 'user',
      )

      if (
        condition === CONDITION_MULTIPLE &&
        !hasUserResponded &&
        !session.openingComplete
      ) {
        const instructions = []

        if (restoredIntroIndex >= 7) {
          instructions.push(
            "What are your top 3 questions, concerns, or things you'd like to understand about clinical trials?",
          )
        }

        if (restoredIntroIndex >= 8 || session.introDone) {
          instructions.push(
            "Feel free to share what's on your mind! There are no right or wrong answers.",
          )
        }

        setIntroInstruction(instructions)
      } else {
        setIntroInstruction([])
      }
      setShowResourceChoice(session.showResourceChoice ?? false)
      setResourceChoice(session.resourceChoice ?? null)
      setShowSurveyButton(session.showSurveyButton ?? false)
      setSuggestedResources(
        (session.suggestedResourceIds ?? [])
          .map((id) => RESOURCES.find((resource) => resource.id === id))
          .filter(Boolean),
      )

      const restoredOpened = session.openedResourceIds ?? []
      openedResourcesRef.current = restoredOpened
      setOpenedResources(restoredOpened)

      // Only reveal topic-related UI once the topic phase begins.
      const topicsStarted = restoredTopicState?.phase === 'topics'

      const hasSelectedTopics = (session.availableTopics ?? []).length === 3

      setShowTopics(topicsStarted || hasSelectedTopics)
      setHighlightCurrentTopic(topicsStarted)
    } catch (error) {
      console.error('Could not restore session:', error)
    } finally {
      setSessionRestored(true)
    }
  }, [SESSION_KEY])

  useEffect(() => {
    if (!started || !topicState || condition === CONDITION_MULTIPLE) return
    async function loadTopicState() {
      try {
        const response = await fetch(
          `${BASE_URL}/jordan/state/${participantId}`,
        )

        if (!response.ok) {
          throw new Error(`Topic state request failed: ${response.status}`)
        }

        const data = await response.json()

        setTopicState(data)
      } catch (error) {
        console.error('Could not load topic state:', error)
      }
    }

    loadTopicState()
  }, [started, participantId])

  async function refreshSavedQuestions() {
    try {
      const response = await fetch(`${BASE_URL}/jordan/state/${participantId}`)

      if (!response.ok) {
        throw new Error(`Could not refresh questions: ${response.status}`)
      }

      const data = await response.json()
      setTopicState(data)
    } catch (error) {
      console.error('Could not refresh saved questions:', error)
    }
  }

  function logQuestionAdded(question, type, sourceText) {
    setMessages((previous) => [
      ...previous,
      {
        from: 'system',
        event: 'question_added',
        question,
        type,
        topic_index: topicState?.current_topic_index,
        source_message: sourceText,
        timestamp: new Date().toISOString(),
      },
    ])
  }

  function logQuestionListInteraction(action) {
    setMessages((previous) => [
      ...previous,
      {
        from: 'system',
        event: 'question_list_interaction',
        action,
        source: 'manual',
        topic_index: topicState?.current_topic_index,
        timestamp: new Date().toISOString(),
      },
    ])
  }

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

    transcriptLoggingQueueRef.current = transcriptLoggingQueueRef.current
      .catch(() => {})
      .then(() => saveConversationTranscript())
  }, [messages, participantId])

  // Save basic session information
  useEffect(() => {
    if (!sessionRestored) return

    const existingSession = JSON.parse(
      sessionStorage.getItem(SESSION_KEY) || '{}',
    )

    const session = {
      ...existingSession,
      participantId,
      condition,
      // Once a participant begins, keep that status across refreshes.
      started: existingSession.started === true || started,
      messages,
      topicState,
      introDone,
      introNextIndex,
      openingResponseDone,
      openingComplete,
      awaitingTopicElaboration,
      availableTopics,
      selectedTopics,
      showTopicSelection,
      showResourceChoice,
      resourceChoice,
      showSurveyButton,
      suggestedResourceIds: suggestedResources.map((resource) => resource.id),
      openedResourceIds: openedResources,
    }

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  }, [
    sessionRestored,
    SESSION_KEY,
    participantId,
    condition,
    started,
    messages,
    topicState,
    introDone,
    introNextIndex,
    openingResponseDone,
    openingComplete,
    awaitingTopicElaboration,
    availableTopics,
    selectedTopics,
    showTopicSelection,
    showResourceChoice,
    resourceChoice,
    showSurveyButton,
    suggestedResources,
    openedResources,
  ])

  // Initialize characters after Begin or when resuming a session
  useEffect(() => {
    if (!sessionRestored || !started) return

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
  }, [sessionRestored, started, isSingleAgent])

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

  async function speakWithHighlight(text, character, setSubtitle) {
    const speaker = character === 'doctor' ? 'Alex' : 'Jordan'

    setActiveSpeaker(speaker)

    if (condition === CONDITION_MULTIPLE) {
      if (speaker === 'Jordan') {
        playGesture('stopAlexGesture')
        swivelAlexTowardJordan(true)
      } else {
        playGesture('stopCompanionGesture')
        swivelJordanTowardAlex(true)
      }
    }

    try {
      await speakWithLipsync(text, character, null, null, setSubtitle)
    } finally {
      if (condition === CONDITION_MULTIPLE) {
        if (speaker === 'Jordan') {
          swivelAlexTowardJordan(false)
        } else {
          swivelJordanTowardAlex(false)
        }
      }

      setActiveSpeaker(null)
    }
  }

  function clearIntroVisuals() {
    // Cancel all pending visual timers
    introVisualTimersRef.current.forEach(clearTimeout)
    introVisualTimersRef.current = []

    setIntroVisuals({
      Alex: null,
      Jordan: null,
    })
  }

  function playIntroVisualCues(intro) {
    clearIntroVisuals()

    const cues = INTRO_VISUAL_CUES[intro.audio] || []
    const speaker = intro.character === 'doctor' ? 'Alex' : 'Jordan'

    cues.forEach((cue, index) => {
      const cueId = `${intro.audio}-${index}`

      // Show the cue
      const showTimer = setTimeout(() => {
        setIntroVisuals((previous) => ({
          ...previous,
          [speaker]: {
            ...cue,
            id: cueId,
            fadingOut: false,
          },
        }))
      }, cue.at * 1000)

      // Start fading out after the duration
      const fadeTimer = setTimeout(
        () => {
          setIntroVisuals((previous) => {
            if (previous[speaker]?.id !== cueId) return previous

            return {
              ...previous,
              [speaker]: {
                ...previous[speaker],
                fadingOut: true,
              },
            }
          })
        },
        (cue.at + cue.duration) * 1000,
      )

      // Remove the cue after 0.4s fade
      const removeTimer = setTimeout(
        () => {
          setIntroVisuals((previous) => {
            if (previous[speaker]?.id !== cueId) return previous

            return {
              ...previous,
              [speaker]: null,
            }
          })
        },
        (cue.at + cue.duration + 0.4) * 1000,
      )

      introVisualTimersRef.current.push(showTimer, fadeTimer, removeTimer)
    })
  }

  function handleSkipIntro() {
    skipIntroRef.current = true

    // Reveal the chat area.
    setShowChatInput(true)

    // Show Jordan's opening instructions.
    setIntroInstruction([
      "What are your top 3 questions, concerns, or things you'd like to understand about clinical trials?",
      "Feel free to share what's on your mind! There are no right or wrong answers.",
    ])
  }

  async function playCharacterIntro(startIndex = 0) {
    const introSequence = introSequences[condition]

    if (!introSequence) {
      throw new Error(`No intro sequence configured for condition ${condition}`)
    }

    for (let index = startIndex; index < introSequence.length; index++) {
      if (skipIntroRef.current) break

      const intro = introSequence[index]
      if (intro.beforeGesture) {
        playGesture(intro.beforeGesture)
      }

      // Add intro dialogue only if it isn't already in the transcript.
      // This prevents duplicates when replaying an interrupted segment.
      setMessages((previous) => {
        const alreadyAdded = previous.some(
          (message) =>
            message.from === intro.from && message.text === intro.text,
        )

        if (alreadyAdded) return previous

        return [
          ...previous,
          {
            from: intro.from,
            text: intro.text,
          },
        ]
      })

      const setSubtitle =
        intro.character === 'doctor' ? setAlexSubtitle : setJordanSubtitle

      setActiveSpeaker(intro.character === 'doctor' ? 'Alex' : 'Jordan')

      // Turn Alex toward Jordan during prerecorded Jordan dialogue.

      if (condition === CONDITION_MULTIPLE) {
        if (intro.character === 'companion') {
          swivelAlexTowardJordan(true)
        } else {
          swivelJordanTowardAlex(true)
        }
      }

      try {
        await speakWithLipsyncStatic(
          intro.audio,
          intro.timestamps,
          intro.character,
          true,
          setSubtitle,
          () => {
            playIntroVisualCues(intro)

            if (condition === CONDITION_MULTIPLE) {
              if (
                intro.audio ===
                '/intro-voices/companion-audio-JORDAN_INTRO_1_MULTIPLE_4.mp3'
              ) {
                setIntroInstruction([
                  "What are your top 3 questions, concerns, or things you'd like to understand about clinical trials?",
                ])
              } else if (
                intro.audio ===
                '/intro-voices/companion-audio-JORDAN_INTRO_1_MULTIPLE_5.mp3'
              ) {
                setIntroInstruction((previous) => {
                  const instruction =
                    "Feel free to share what's on your mind! There are no right or wrong answers."

                  return previous.includes(instruction)
                    ? previous
                    : [...previous, instruction]
                })
              }
            }

            if (condition === CONDITION_MULTIPLE) {
              const isJordanIntro4 =
                intro.audio ===
                '/intro-voices/companion-audio-JORDAN_INTRO_1_MULTIPLE_4.mp3'

              if (isJordanIntro4) {
                // Both characters look forward
                playGesture('stopAlexGesture')
                playGesture('stopCompanionGesture')

                // Slide up the chat panel
                setShowChatInput(true)
              } else if (index < 6) {
                if (intro.character === 'doctor') {
                  // Alex faces forward while Jordan looks at Alex
                  playGesture('stopAlexGesture')
                  playGesture('jordanLookAtAlex')
                } else {
                  // Jordan faces forward while Alex looks at Jordan
                  playGesture('stopCompanionGesture')
                  playGesture('alexLookAtJordan')
                }
              }
            }
          },
        )
      } finally {
        if (condition === CONDITION_MULTIPLE) {
          if (intro.character === 'companion') {
            swivelAlexTowardJordan(false)
          } else {
            swivelJordanTowardAlex(false)
          }
        }

        clearIntroVisuals()
        setActiveSpeaker(null)
      }

      setSubtitle('')

      // The segment finished successfully.
      // Save the next segment as our resume checkpoint.
      setIntroNextIndex(index + 1)
    }

    playGesture('stopAlexGesture')

    if (!isSingleAgent) {
      playGesture('stopCompanionGesture')
    }
  }

  useEffect(() => {
    if (
      !sessionRestored ||
      !started ||
      !charactersReady ||
      showStartOverlay ||
      showSceneLoading
    )
      return

    if (conversationStartedRef.current) return
    if (introDone) return

    conversationStartedRef.current = true

    async function startConversation() {
      setIsResponding(true)

      try {
        // Brief pause after the scene finishes loading
        await new Promise((resolve) => setTimeout(resolve, 1500))

        // Play the prerecorded introduction for the assigned condition
        if (!introDone && !introStartedRef.current) {
          introStartedRef.current = true

          await playCharacterIntro(introNextIndex)

          // Log when the introduction finishes
          try {
            const response = await fetch(
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

            if (!response.ok) {
              throw new Error(`Intro finish logging failed: ${response.status}`)
            }

            const data = await response.json()
            console.log('Intro finished logged:', data)
          } catch (error) {
            console.error('Could not log intro finish:', error)
          }

          setIntroDone(true)
        }

        // Introduction finished.
        // Participant can now respond to the opening question.
      } catch (error) {
        console.error('Could not start introduction:', error)
        introStartedRef.current = false
        conversationStartedRef.current = false
      } finally {
        setIsResponding(false)
      }
    }

    startConversation()
  }, [
    sessionRestored,
    started,
    charactersReady,
    showStartOverlay,
    showSceneLoading,
    participantId,
    condition,
    introNextIndex,
    introDone,
  ])

  function handleTopicChange(index, newTopicId) {
    setSelectedTopics((previous) =>
      previous.map((topicId, i) => (i === index ? newTopicId : topicId)),
    )
  }

  async function handleStartAlexTopic() {
    if (isResponding || focusedCharacter === 'Alex') return

    setIsResponding(true)
    setResponseStatus('Preparing information')

    try {
      const response = await fetch(`${BASE_URL}/study/alex-topic-intro`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participant_id: participantId,
        }),
      })

      if (!response.ok) {
        throw new Error(`Alex topic introduction failed: ${response.status}`)
      }

      const data = await response.json()

      console.log('Alex topic introduction:', data)

      // Switch the participant's focus to Alex.
      setFocusedCharacter('Alex')
      setAwaitingTopicElaboration(false)

      // Save Alex's introduction in the transcript.
      setMessages((previous) => [
        ...previous,
        {
          from: 'Alex',
          text: data.alex_reply,
        },
      ])

      setResponseStatus('')

      // Have Alex deliver the introduction.
      playGesture('stopAlexGesture')
      playGesture('jordanLookAtAlex')

      await speakWithHighlight(data.alex_reply, 'doctor', setAlexSubtitle)

      setAlexSubtitle('')
      playGesture('stopCompanionGesture')
    } catch (error) {
      console.error('Could not start Alex topic:', error)
      alert('Could not load the topic information. Please try again.')
    } finally {
      setIsResponding(false)
      setResponseStatus('')
    }
  }

  async function handleConfirmTopics() {
    if (
      isResponding ||
      selectedTopics.length !== 3 ||
      new Set(selectedTopics).size !== 3
    ) {
      return
    }

    setIsResponding(true)
    setResponseStatus('Starting conversation')

    try {
      // Initialize the confirmed topics in the backend.
      const response = await fetch(`${BASE_URL}/study/confirm-topics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participant_id: participantId,
          condition,
          selected_topics: selectedTopics,
        }),
      })

      if (!response.ok) {
        throw new Error(`Topic confirmation failed: ${response.status}`)
      }

      const data = await response.json()

      console.log('Topics initialized:', data)

      // Save the original recommendations and final selections.
      const originalTopicIds = availableTopics.map((topic) => topic.id)

      const changed = selectedTopics.some(
        (id, index) => id !== originalTopicIds[index],
      )

      setMessages((previous) => [
        ...previous,
        {
          from: 'system',
          event: 'topics_confirmed',
          original_topics: originalTopicIds,
          selected_topics: [...selectedTopics],
          changed,
          timestamp: new Date().toISOString(),
        },
      ])

      // Update the frontend's active topic state.
      setTopicState({
        current_topic_index: data.current_topic_index,
        conversation_complete: data.conversation_complete,
        phase: data.phase,
        topics: data.topics,
      })

      // Switch from editable cards to the progress bar.
      setShowTopicSelection(false)
      setShowTopics(true)
      setHighlightCurrentTopic(true)

      // Jordan begins the first topic by referencing the
      // participant's earlier concern.
      if (condition === CONDITION_MULTIPLE) {
        const openingResponse = await fetch(`${BASE_URL}/study/topic-opening`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            participant_id: participantId,
          }),
        })

        if (!openingResponse.ok) {
          throw new Error(`Topic opening failed: ${openingResponse.status}`)
        }

        const openingData = await openingResponse.json()
        console.log('Jordan topic opening:', openingData)

        setMessages((previous) => [
          ...previous,
          { from: 'Jordan', text: openingData.jordan_reply },
        ])

        playGesture('alexLookAtJordan')

        await speakWithHighlight(
          openingData.jordan_reply,
          'companion',
          setJordanSubtitle,
        )

        setJordanSubtitle('')
        playGesture('stopAlexGesture')
        setAwaitingTopicElaboration(true)
      }
    } catch (error) {
      console.error('Could not confirm topics:', error)

      // Leave the topic cards visible so participants can retry.
      alert('Could not start the conversation. Please try again.')
    } finally {
      setIsResponding(false)
      setResponseStatus('')
    }
  }

  function handleStartFirstTopic() {
    if (!waitingForFirstTopic || !startFirstTopicResolverRef.current) return

    setWaitingForFirstTopic(false)
    setHighlightCurrentTopic(true)

    const resolve = startFirstTopicResolverRef.current
    startFirstTopicResolverRef.current = null
    resolve()
  }

  async function handleNextTopic() {
    if (isResponding || !topicState || topicState.conversation_complete) return

    // NEW STUDY FLOW — Condition 3
    if (condition === CONDITION_MULTIPLE) {
      setIsResponding(true)
      setResponseStatus('Preparing next topic')
      setShowQuestions(false)

      try {
        // Advance the active topic in the study backend.
        const response = await fetch(`${BASE_URL}/study/advance-topic`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            participant_id: participantId,
          }),
        })

        if (!response.ok) {
          throw new Error(`Topic advancement failed: ${response.status}`)
        }

        const data = await response.json()

        setTopicState({
          current_topic_index: data.current_topic_index,
          conversation_complete: data.conversation_complete,
          phase: data.phase,
          topics: data.topics,
        })

        // We'll implement the final closing sequence separately.
        if (data.conversation_complete) {
          setAwaitingTopicElaboration(false)
          setShowResourceChoice(true)
          return
        }

        // Reset to Jordan for the new topic.
        setFocusedCharacter('Jordan')
        setAwaitingTopicElaboration(false)

        // Generate Jordan's opening question using the evolving profile.
        const openingResponse = await fetch(`${BASE_URL}/study/topic-opening`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            participant_id: participantId,
          }),
        })

        if (!openingResponse.ok) {
          throw new Error(`Topic opening failed: ${openingResponse.status}`)
        }

        const openingData = await openingResponse.json()

        setResponseStatus('')

        setMessages((previous) => [
          ...previous,
          {
            from: 'Jordan',
            text: openingData.jordan_reply,
          },
        ])

        playGesture('stopCompanionGesture')
        playGesture('alexLookAtJordan')

        await speakWithHighlight(
          openingData.jordan_reply,
          'companion',
          setJordanSubtitle,
        )

        setJordanSubtitle('')
        playGesture('stopAlexGesture')

        // Participant can elaborate or choose to explore information.
        setAwaitingTopicElaboration(true)
      } catch (error) {
        console.error('Could not advance study topic:', error)
      } finally {
        setIsResponding(false)
        setResponseStatus('')
      }

      return
    }

    const conversationMessages = messages.filter(
      (message) => message.from !== 'system',
    )

    setIsResponding(true)
    setShowQuestions(false)
    setResponseStatus(
      topicState.current_topic_index === 2
        ? 'Finishing topics'
        : 'Preparing next topic',
    )

    try {
      const response = await fetch(`${BASE_URL}/jordan/advance-topic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participant_id: participantId,
          conversation_history: conversationMessages,
        }),
      })

      if (!response.ok) {
        throw new Error(`Topic advancement failed: ${response.status}`)
      }

      const data = await response.json()

      console.log('Topic advanced:', data)
      // Update the topic progress and conversation phase
      setTopicState({
        current_topic_index: data.current_topic_index,
        conversation_complete: data.conversation_complete,
        phase: data.phase,
        topics: data.topics,
      })

      // Log completion of the previous topic
      fetch(`${BASE_URL}/logs/log-topic-covered`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participant_id: participantId,
          topic_number: data.completed_topic_number,
        }),
      }).catch((error) => {
        console.error('Could not log topic completion:', error)
      })

      // Introduce the next topic only if one remains
      if (data.prepare_next_topic) {
        const nextTopicResponse = await fetch(
          `${BASE_URL}/jordan/prepare-next-topic`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              participant_id: participantId,
              conversation_history: conversationMessages,
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

        // Generate the conversational follow-up while Alex speaks.
        const followUpPromise =
          condition !== CONDITION_SINGLE_INFO
            ? fetch(`${BASE_URL}/jordan/after-alex`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  participant_id: participantId,
                  conversation_history: [
                    { from: 'Alex', text: nextTopicData.alex_reply },
                  ],
                  after_topic_intro: true,
                }),
              })
                .then(async (response) => {
                  if (!response.ok) {
                    throw new Error(
                      `Topic follow-up failed: ${response.status}`,
                    )
                  }
                  return response.json()
                })
                .then(
                  (data) => ({ data, error: null }),
                  (error) => ({ data: null, error }),
                )
            : null

        // Alex introduces the new topic
        setMessages((previous) => [
          ...previous,
          { from: 'Alex', text: nextTopicData.alex_reply },
        ])

        await speakWithHighlight(
          nextTopicData.alex_reply,
          'doctor',
          setAlexSubtitle,
        )

        setAlexSubtitle('')

        // Speak the follow-up once Alex has finished.
        if (followUpPromise) {
          const { data: followUpData, error: followUpError } =
            await followUpPromise

          if (followUpError) throw followUpError

          if (followUpData.jordan_reply) {
            setMessages((previous) => [
              ...previous,
              { from: conversationalSpeaker, text: followUpData.jordan_reply },
            ])

            await speakWithHighlight(
              followUpData.jordan_reply,
              condition === CONDITION_SINGLE_COMBINED ? 'doctor' : 'companion',
              condition === CONDITION_SINGLE_COMBINED
                ? setAlexSubtitle
                : setJordanSubtitle,
            )

            setAlexSubtitle('')
            setJordanSubtitle('')
          }
        }
      }

      // After the final topic, play the closing dialogue
      if (data.conversation_complete) {
        // Hide the finishing overlay before the characters speak
        setResponseStatus('')
        // Alex closes in all three conditions
        if (data.alex_reply) {
          setMessages((previous) => [
            ...previous,
            { from: 'Alex', text: data.alex_reply },
          ])

          await speakWithHighlight(data.alex_reply, 'doctor', setAlexSubtitle)

          setAlexSubtitle('')
        }

        // Conversational conditions: Jordan (or Alex) invites resources
        if (data.jordan_reply) {
          const speaker = condition === CONDITION_MULTIPLE ? 'Jordan' : 'Alex'

          const character =
            condition === CONDITION_MULTIPLE ? 'companion' : 'doctor'

          const setSubtitle =
            condition === CONDITION_MULTIPLE
              ? setJordanSubtitle
              : setAlexSubtitle

          if (condition === CONDITION_MULTIPLE) {
            playGesture('alexLookAtJordan')
          }

          setMessages((previous) => [
            ...previous,
            { from: speaker, text: data.jordan_reply },
          ])

          await speakWithHighlight(
            data.jordan_reply,
            condition === CONDITION_MULTIPLE ? 'companion' : 'doctor',
            setSubtitle,
          )

          setSubtitle('')
        }

        playGesture('stopAlexGesture')

        if (!isSingleAgent) {
          playGesture('stopCompanionGesture')
        }

        setShowResourceChoice(true)
      }
    } catch (error) {
      console.error('Could not advance topic:', error)
    } finally {
      setIsResponding(false)
      setResponseStatus('')
    }
  }

  async function startTopicPreparation(conversationHistory) {
    setIsResponding(true)
    setResponseStatus('Preparing topics')

    try {
      const alexFillerMessage = {
        from: 'Alex',
        text: ALEX_TOPIC_FILLER,
      }

      // Add Alex's scripted statement to the transcript.
      setMessages((previous) => [...previous, alexFillerMessage])

      // Include it in the history supplied to the backend.
      const topicPreparationHistory = [
        ...conversationHistory,
        alexFillerMessage,
      ]
      // Start selecting the three topics in the background
      // while Alex delivers his scripted transition.
      const responsePromise = fetch(`${BASE_URL}/study/prepare-topics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participant_id: participantId,
          condition,
          history: topicPreparationHistory,
        }),
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error(`Topic preparation failed: ${response.status}`)
        }

        const data = await response.json()

        const prepared = data.spoken_summary
          ? await prepareSpeech(data.spoken_summary, 'doctor')
          : null

        return { data, prepared }
      })

      setResponseStatus('')

      // Pause for 5 seconds before Alex starts speaking.
      // The backend continues preparing topics during this pause.
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Alex faces forward while Jordan looks at him.
      if (condition === CONDITION_MULTIPLE) {
        playGesture('stopAlexGesture')
        playGesture('jordanLookAtAlex')
      }

      // Alex explains what he's about to do using prerecorded audio.
      setActiveSpeaker('Alex')

      if (condition === CONDITION_MULTIPLE) {
        swivelJordanTowardAlex(true)
      }

      try {
        await speakWithLipsyncStatic(
          STUDY_FILLER_AUDIO.alexTopic.audio,
          STUDY_FILLER_AUDIO.alexTopic.timestamps,
          'doctor',
          true,
          setAlexSubtitle,
        )
      } finally {
        if (condition === CONDITION_MULTIPLE) {
          swivelJordanTowardAlex(false)
        }

        setActiveSpeaker(null)
        setAlexSubtitle('')
      }
      // Wait for the topic-selection result if needed.
      setResponseStatus('Preparing topics')

      // Wait for both topic recommendations and prepared audio.
      const { data, prepared } = await responsePromise

      console.log('Topic preparation response:', data)

      // Save Alex's original recommendations.
      setAvailableTopics(data.selected_topics ?? [])

      // Initialize the participant's editable selections.
      setSelectedTopics((data.selected_topics ?? []).map((topic) => topic.id))

      // Hide the regular progress bar during topic selection.
      setShowTopics(false)
      setHighlightCurrentTopic(false)
      setShowTopicSelection(false)

      if (data.spoken_summary) {
        // Add Alex's summary to the transcript.
        setMessages((previous) => [
          ...previous,
          {
            from: 'Alex',
            text: data.spoken_summary,
          },
        ])

        setResponseStatus('')

        let revealTimer = null
        let speechStarted = false

        // Reveal the cards 5 seconds after Alex begins speaking.
        const handleAlexSubtitle = (subtitle) => {
          setAlexSubtitle(subtitle)

          if (!speechStarted && subtitle) {
            speechStarted = true

            revealTimer = setTimeout(() => {
              setShowTopicSelection(true)
            }, 5000)
          }
        }

        try {
          // Alex faces forward while Jordan listens.
          if (condition === CONDITION_MULTIPLE) {
            playGesture('stopAlexGesture')
            playGesture('jordanLookAtAlex')
          }

          setActiveSpeaker('Alex')

          if (condition === CONDITION_MULTIPLE) {
            swivelJordanTowardAlex(true)
          }

          try {
            await playPreparedSpeech({
              prepared,
              onSubtitle: handleAlexSubtitle,
            })
          } finally {
            if (condition === CONDITION_MULTIPLE) {
              swivelJordanTowardAlex(false)
            }

            setActiveSpeaker(null)
          }
        } finally {
          // Clear any remaining timer.
          if (revealTimer) clearTimeout(revealTimer)

          // Ensure the cards appear even if Alex finishes early.
          setShowTopicSelection(true)
          setAlexSubtitle('')
          playGesture('stopAlexGesture')
        }
      } else {
        setShowTopicSelection(true)
      }

      // Explain that participants can change the suggested topics.
      setMessages((previous) => [
        ...previous,
        {
          from: 'Alex',
          text: ALEX_TOPIC_SELECTION_INSTRUCTIONS,
        },
      ])

      // Alex faces forward while Jordan looks at him.
      if (condition === CONDITION_MULTIPLE) {
        playGesture('stopAlexGesture')
        playGesture('jordanLookAtAlex')
      }

      setActiveSpeaker('Alex')
      if (condition === CONDITION_MULTIPLE) {
        swivelJordanTowardAlex(true)
      }

      try {
        await speakWithLipsyncStatic(
          STUDY_FILLER_AUDIO.alexInstructions.audio,
          STUDY_FILLER_AUDIO.alexInstructions.timestamps,
          'doctor',
          true,
          setAlexSubtitle,
        )
      } finally {
        if (condition === CONDITION_MULTIPLE) {
          swivelJordanTowardAlex(false)
        }
        setActiveSpeaker(null)
        setAlexSubtitle('')

        // Both characters return to facing the participant.
        playGesture('stopAlexGesture')

        if (condition === CONDITION_MULTIPLE) {
          playGesture('stopCompanionGesture')
        }
      }
    } catch (error) {
      console.error('Could not prepare topics:', error)
      setOpeningComplete(false)
    } finally {
      setIsResponding(false)
      setResponseStatus('')
    }
  }

  function handleOpeningContinue(additionalMessage = null) {
    if (isResponding || openingComplete) return

    const text = additionalMessage?.trim()

    // Include any additional message in the conversation history
    const updatedMessages = text
      ? [...messages, { from: 'user', text }]
      : messages

    if (text) {
      setMessages(updatedMessages)
      setInput('')
      setIntroInstruction([])
    }

    console.log('Opening elicitation completed', {
      participantId,
      condition,
      additionalMessage,
    })

    setOpeningComplete(true)

    // Move to the next stage with the full conversation history
    startTopicPreparation(updatedMessages)
  }

  async function handleSend(event) {
    event.preventDefault()

    const trimmed = input.trim()

    const conversationMessages = messages.filter(
      (message) => message.from !== 'system',
    )

    if (!trimmed || isResponding) return

    // After the opening response, another message moves to the next stage
    if (
      (condition === CONDITION_SINGLE_COMBINED ||
        condition === CONDITION_MULTIPLE) &&
      openingResponseDone &&
      !openingComplete
    ) {
      handleOpeningContinue(trimmed)
      return
    }

    setIntroInstruction([])

    // Slide the question list closed when the user sends a message
    setShowQuestions(false)

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

    let questionAdded = false

    try {
      // Opening needs elicitation — only the first user message
      if (
        (condition === CONDITION_SINGLE_COMBINED ||
          condition === CONDITION_MULTIPLE) &&
        !openingResponseDone
      ) {
        const isCombined = condition === CONDITION_SINGLE_COMBINED

        const fillerMessage = {
          from: isCombined ? 'Alex' : 'Jordan',
          text: JORDAN_OPENING_FILLER,
        }

        // Record the scripted dialogue in the transcript.
        setMessages((previous) => [...previous, fillerMessage])

        // Include it in the history sent to the LLM.
        const openingHistory = [
          ...messages,
          { from: 'user', text: trimmed },
          fillerMessage,
        ]
        // Generate the LLM response, then prepare its audio in the background.
        const responsePromise = fetch(`${BASE_URL}/study/opening-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            participant_id: participantId,
            condition,
            message: trimmed,
            history: openingHistory,
          }),
        }).then(async (response) => {
          if (!response.ok) {
            throw new Error(`Study request failed: ${response.status}`)
          }

          const data = await response.json()

          const prepared = await prepareSpeech(
            data.response,
            isCombined ? 'doctor' : 'companion',
          )

          return { data, prepared }
        })

        const fillerSpeaker = isCombined ? 'doctor' : 'companion'
        const fillerSubtitle = isCombined ? setAlexSubtitle : setJordanSubtitle

        setShowThinkingBubble(false)

        playGesture('thinking')

        // Give the participant a moment before responding.
        await new Promise((resolve) => setTimeout(resolve, 3000))

        if (isCombined) {
          // In the single-agent condition, Alex speaks the filler.
          await speakWithHighlight(
            JORDAN_OPENING_FILLER,
            fillerSpeaker,
            fillerSubtitle,
          )
        } else {
          // Jordan faces forward while Alex looks at Jordan.
          playGesture('stopCompanionGesture')
          playGesture('alexLookAtJordan')

          // Jordan uses prerecorded audio.
          setActiveSpeaker('Jordan')
          playGesture('stopAlexGesture')
          swivelAlexTowardJordan(true)

          try {
            await speakWithLipsyncStatic(
              STUDY_FILLER_AUDIO.jordanOpening.audio,
              STUDY_FILLER_AUDIO.jordanOpening.timestamps,
              'companion',
              true,
              setJordanSubtitle,
            )
          } finally {
            swivelAlexTowardJordan(false)
            setActiveSpeaker(null)
          }
        }

        fillerSubtitle('')

        // Wait for the LLM response and prepared audio, if needed.
        const { data, prepared } = await responsePromise

        console.log('Study backend response:', data)

        const speaker = isCombined ? 'Alex' : 'Jordan'
        const character = isCombined ? 'doctor' : 'companion'
        const setSubtitle = isCombined ? setAlexSubtitle : setJordanSubtitle

        // Display response
        setMessages((previous) => [
          ...previous,
          {
            from: speaker,
            text: data.response,
          },
        ])

        // Play response using the appropriate character
        setShowThinkingBubble(false)

        if (!isCombined) {
          playGesture('alexLookAtJordan')
        }

        setActiveSpeaker(speaker)

        try {
          await playPreparedSpeech({
            prepared,
            onSubtitle: setSubtitle,
          })
        } finally {
          setActiveSpeaker(null)
        }

        // Clean up subtitles and gestures
        setSubtitle('')

        // Scripted follow-up
        const followUp =
          'Did I get that right? If that pretty much covers it, you can hit Continue! Or feel free to add anything else.'

        setMessages((previous) => [
          ...previous,
          { from: speaker, text: followUp },
        ])

        await speakWithHighlight(followUp, character, setSubtitle)

        setSubtitle('')

        if (isCombined) {
          playGesture('stopAlexGesture')
        } else {
          playGesture('stopCompanionGesture')
        }

        // Opening response finished — allow participant to continue
        setOpeningResponseDone(true)

        return
      }

      // NEW STUDY FLOW — Jordan's topic elicitation
      if (
        condition === CONDITION_MULTIPLE &&
        topicState?.phase === 'topics' &&
        focusedCharacter === 'Jordan'
      ) {
        const response = await fetch(`${BASE_URL}/study/jordan-topic-turn`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            participant_id: participantId,
            message: trimmed,
          }),
        })

        if (!response.ok) {
          throw new Error(`Jordan topic turn failed: ${response.status}`)
        }

        const data = await response.json()

        console.log('Updated user profile:', data.user_profile)

        setMessages((previous) => [
          ...previous,
          {
            from: 'Jordan',
            text: data.jordan_reply,
          },
        ])

        setShowThinkingBubble(false)

        playGesture('stopCompanionGesture')
        playGesture('alexLookAtJordan')

        await speakWithHighlight(
          data.jordan_reply,
          'companion',
          setJordanSubtitle,
        )

        setJordanSubtitle('')
        playGesture('stopAlexGesture')

        return
      }

      // NEW STUDY FLOW — Alex's ongoing factual conversation
      if (
        condition === CONDITION_MULTIPLE &&
        topicState?.phase === 'topics' &&
        focusedCharacter === 'Alex'
      ) {
        const response = await fetch(`${BASE_URL}/study/alex-topic-turn`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            participant_id: participantId,
            message: trimmed,
            history: conversationMessages,
          }),
        })

        if (!response.ok) {
          throw new Error(`Alex topic turn failed: ${response.status}`)
        }

        const data = await response.json()

        console.log('Alex topic response:', data)

        setMessages((previous) => [
          ...previous,
          {
            from: 'Alex',
            text: data.alex_reply,
          },
        ])

        setShowThinkingBubble(false)

        playGesture('stopAlexGesture')
        playGesture('jordanLookAtAlex')

        await speakWithHighlight(data.alex_reply, 'doctor', setAlexSubtitle)

        setAlexSubtitle('')
        playGesture('stopCompanionGesture')

        return
      }

      // OLD BACKEND — Conditions 1 and 2

      const response = await fetch(`${BASE_URL}/jordan/turn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participant_id: participantId,
          user_message: trimmed,
          conversation_history: conversationMessages,
          condition,
        }),
      })

      if (!response.ok) {
        throw new Error(`Conversation request failed: ${response.status}`)
      }

      const data = await response.json()
      // Count engagement once the backend accepts the user's message.
      if (topicState?.phase === 'topics') {
        const topicIndex = topicState.current_topic_index

        setEngagedTopics((previous) => {
          if (previous.includes(topicIndex)) return previous

          const updated = [...previous, topicIndex]
          sessionStorage.setItem(ENGAGEMENT_KEY, JSON.stringify(updated))
          return updated
        })
      }
      console.log('Captured question from Jordan turn:', {
        question: data.question_saved,
        type: data.question_type,
      })

      // Refresh the question list and log the captured question
      if (data.question_saved) {
        logQuestionAdded(data.question_saved, data.question_type, trimmed)

        await refreshSavedQuestions()
        questionAdded = true
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

        await speakWithHighlight(data.alex_reply, 'doctor', setAlexSubtitle)

        setAlexSubtitle('')
        playGesture('stopAlexGesture')

        return
      }

      // 2. If Alex is needed, let Alex respond directly
      if (data.alex_info_needed) {
        playGesture('stopAlexGesture')
        setShowThinkingBubble(false)
        setShowSwipingCards(true)
        startSwiping()
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
        stopSwiping()
        setShowSwipingCards(false)

        // Alex speaks
        await speakWithHighlight(alexData.answer, 'doctor', setAlexSubtitle)

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
          console.log('Captured question after Alex:', {
            question: jordanAfterAlexData.question_saved,
            type: jordanAfterAlexData.question_type,
          })

          // Refresh the list and log the captured question
          if (jordanAfterAlexData.question_saved) {
            logQuestionAdded(
              jordanAfterAlexData.question_saved,
              jordanAfterAlexData.question_type,
              trimmed,
            )

            await refreshSavedQuestions()
            questionAdded = true
          }

          setMessages((previous) => [
            ...previous,
            {
              from: conversationalSpeaker,
              text: jordanAfterAlexData.jordan_reply,
            },
          ])

          if (condition === CONDITION_SINGLE_COMBINED) {
            setShowThinkingBubble(false)
            await speakWithHighlight(
              jordanAfterAlexData.jordan_reply,
              'doctor',
              setAlexSubtitle,
            )

            setAlexSubtitle('')
          } else {
            playGesture('alexLookAtJordan')

            setShowThinkingBubble(false)
            await speakWithHighlight(
              jordanAfterAlexData.jordan_reply,
              'companion',
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
        await speakWithHighlight(data.jordan_reply, 'doctor', setAlexSubtitle)

        setAlexSubtitle('')
      } else {
        playGesture('alexLookAtJordan')

        setShowThinkingBubble(false)
        await speakWithHighlight(
          data.jordan_reply,
          'companion',
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
      await stopSwiping()
      setShowSwipingCards(false)
      setShowThinkingBubble(false)
      setIsResponding(false)
      setResponseStatus('')

      if (questionAdded) {
        setShowQuestions(true)
      }
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

      const savedSession = JSON.parse(
        sessionStorage.getItem(SESSION_KEY) || '{}',
      )

      // Only log the start for a brand-new session.
      if (!savedSession.started) {
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
          throw new Error(
            `Conversation start logging failed: ${response.status}`,
          )
        }

        const data = await response.json()
        console.log('Conversation started logged:', data)
      } else {
        console.log('Resuming existing study session')
      }

      setStarted(true)
    } catch (error) {
      console.error('Could not begin or resume conversation:', error)
      setStarting(false)
    }
  }

  async function handleResourceChoice(choice) {
    setResourceChoice(choice)
    setShowResourceChoice(false)

    if (choice === 'no') {
      const reply =
        'No problem! You can click the Continue to Post-Survey button whenever you’re ready.'

      const speaker = condition === CONDITION_MULTIPLE ? 'Jordan' : 'Alex'

      const character =
        condition === CONDITION_MULTIPLE ? 'companion' : 'doctor'

      const setSubtitle =
        condition === CONDITION_MULTIPLE ? setJordanSubtitle : setAlexSubtitle

      setIsResponding(true)

      try {
        setMessages((previous) => [...previous, { from: speaker, text: reply }])

        await speakWithHighlight(reply, character, setSubtitle)
        setSubtitle('')
        setShowSurveyButton(true)
      } catch (error) {
        console.error('Could not play resource decline response:', error)
        setShowSurveyButton(true)
      } finally {
        setIsResponding(false)
      }
    } else {
      setIsResponding(true)
      setResponseStatus('Preparing suggested resources')

      try {
        const response = await fetch(`${BASE_URL}/jordan/suggest-resources`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            participant_id: participantId,
          }),
        })

        if (!response.ok) {
          throw new Error(
            `Resource suggestion request failed: ${response.status}`,
          )
        }

        const data = await response.json()

        // Log recommended resources and their explanations
        try {
          const logResponse = await fetch(
            `${BASE_URL}/logs/log-recommended-resources`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                participant_id: participantId,
                recommended_resources:
                  condition === CONDITION_SINGLE_INFO
                    ? [{ status: 'viewed_resources' }]
                    : (data.resource_explanations ?? []),
              }),
            },
          )

          if (!logResponse.ok) {
            throw new Error(
              `Recommendation logging failed: ${logResponse.status}`,
            )
          }
        } catch (error) {
          console.error('Could not log recommended resources:', error)
        }

        const resources = data.resource_ids
          .map((id) => RESOURCES.find((resource) => resource.id === id))
          .filter(Boolean)

        setSuggestedResources(resources)

        const speaker = condition === CONDITION_MULTIPLE ? 'Jordan' : 'Alex'

        const character =
          condition === CONDITION_MULTIPLE ? 'companion' : 'doctor'

        const setSubtitle =
          condition === CONDITION_MULTIPLE ? setJordanSubtitle : setAlexSubtitle

        setResponseStatus('')

        const resourceInstructions =
          'Here are some resources you might be interested in exploring further. ' +
          "Click any resource to preview it. If you'd like the link to a resource, " +
          'you will be able to request a link to be sent to you on Prolific after the study.'

        const resourceExplanations = (data.resource_explanations ?? [])
          .map((resource) => resource.explanation.trim())
          .join(' ')

        const tailoredIntroduction =
          'Based on what you brought up during our conversation, ' +
          "I've highlighted a few resources that might be especially useful to you."

        const closingInstructions =
          "When you're done, click the green button in the top right corner " +
          'to continue to the post-survey.'

        const reply =
          condition === CONDITION_SINGLE_INFO
            ? [resourceInstructions, closingInstructions].join(' ')
            : [
                resourceInstructions,
                tailoredIntroduction,
                resourceExplanations,
                closingInstructions,
              ]
                .filter(Boolean)
                .join(' ')

        setMessages((previous) => [...previous, { from: speaker, text: reply }])

        await speakWithHighlight(reply, character, setSubtitle)

        setSubtitle('')
        setShowSurveyButton(true)

        if (condition !== CONDITION_SINGLE_INFO) {
          setShowQuestions(true)
        }
      } catch (error) {
        console.error('Could not get suggested resources:', error)

        // Restore the choice buttons so the participant can try again.
        setShowResourceChoice(true)
      } finally {
        setIsResponding(false)
        setResponseStatus('')
      }
    }
  }

  async function handleResourcePreview(resource) {
    setPreviewResource(resource)

    try {
      const response = await fetch(`${BASE_URL}/logs/log-resource-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participant_id: participantId,
          resource_id: resource.id,
        }),
      })

      if (!response.ok) {
        throw new Error(`Resource preview logging failed: ${response.status}`)
      }
    } catch (error) {
      console.error('Could not log resource preview:', error)
    }
  }

  function handleResourceOpen(resourceId) {
    // Toggle the resource on/off
    const updated = openedResourcesRef.current.includes(resourceId)
      ? openedResourcesRef.current.filter((id) => id !== resourceId)
      : [...openedResourcesRef.current, resourceId]

    openedResourcesRef.current = updated
    setOpenedResources(updated)

    // Log whether the participant requested or canceled the resource
    const event = updated.includes(resourceId) ? 'requested' : 'unrequested'

    resourceLoggingQueueRef.current = resourceLoggingQueueRef.current
      .then(async () => {
        const response = await fetch(
          `${BASE_URL}/logs/log-resource-request-event`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              participant_id: participantId,
              resource_id: resourceId,
              event,
            }),
          },
        )

        if (!response.ok) {
          throw new Error(
            `Resource request event logging failed: ${response.status}`,
          )
        }
      })
      .catch((error) => {
        console.error('Could not log resource request event:', error)
      })

    // Save updated selections sequentially
    resourceLoggingQueueRef.current = resourceLoggingQueueRef.current
      .then(async () => {
        const response = await fetch(
          `${BASE_URL}/logs/log-selected-resources`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              participant_id: participantId,
              selected_resources: updated,
            }),
          },
        )

        if (!response.ok) {
          throw new Error(`Resource logging failed: ${response.status}`)
        }
      })
      .catch((error) => {
        console.error('Could not log resource request:', error)
      })
  }

  async function handleFinish() {
    if (finishing) return
    try {
      setFinishing(true)

      // Wait for any pending transcript saves to finish
      await transcriptLoggingQueueRef.current

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

      // Wait for any pending resource-click logging to finish
      await resourceLoggingQueueRef.current

      // Save final list of opened resources
      const resourcesResponse = await fetch(
        `${BASE_URL}/logs/log-selected-resources`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            participant_id: participantId,
            selected_resources: openedResourcesRef.current,
          }),
        },
      )

      if (!resourcesResponse.ok) {
        throw new Error(
          `Final resource logging failed: ${resourcesResponse.status}`,
        )
      }

      // Log overall website completion
      const websiteFinishResponse = await fetch(
        `${BASE_URL}/logs/log-finished`,
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

      if (!websiteFinishResponse.ok) {
        throw new Error(
          `Website completion logging failed: ${websiteFinishResponse.status}`,
        )
      }

      // Redirect directly to the Qualtrics post-survey
      const postSurveyUrl = new URL(
        'https://ufl.qualtrics.com/jfe/form/SV_cDaUHMgdTcPpzoy',
      )

      postSurveyUrl.searchParams.set('id', participantId)
      postSurveyUrl.searchParams.set('c', String(condition))

      window.location.href = postSurveyUrl.toString()
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

            <h2>Understanding Clinical Trials</h2>
            {!isSingleAgent ? (
              <h1>Chat with Virtual Characters</h1>
            ) : (
              <h1>Chat with a Virtual Character</h1>
            )}

            <div className="mi-start-information">
              {!isSingleAgent ? (
                <p>
                  You're about to have a conversation about cancer clinical
                  trials with two AI-powered virtual characters:{' '}
                  <strong>Alex</strong> and <strong>Jordan</strong>!
                </p>
              ) : (
                <p>
                  You're about to have a conversation about cancer clinical
                  trials with an AI-powered virtual character:{' '}
                  <strong>Alex</strong>!
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
                During the conversation, feel free to think about your own
                experiences with cancer and what you would want to understand
                about clinical trials! You can draw on questions you've had in
                the past, questions you have now, or things you might want to
                discuss with others in the future.
              </p>

              <div className="mi-privacy-reminder">
                <strong>Friendly Privacy Reminder</strong>
                <p>
                  No microphone or voice input is used, only text input. This
                  study uses University of Florida AI models which have data
                  security requirements designed to protect sensitive
                  information. Still, for your privacy & security, please avoid
                  sharing identifying information such as your name, address, or
                  contact details.
                </p>
              </div>
            </div>

            <div className="mi-start-instructions">
              Please complete this short checklist to make sure you have the
              best experience. Then, click begin.{' '}
            </div>

            {entryLogError && !entryLogged && (
              <div className="mi-start-log-error">
                <p>
                  We're having trouble connecting to the study server. Please
                  try again.
                </p>

                <button type="button" onClick={logConversationEntered}>
                  Retry Connection
                </button>
              </div>
            )}

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

      {condition === CONDITION_MULTIPLE &&
        started &&
        !introDone &&
        !showStartOverlay &&
        !showSceneLoading &&
        ['localhost', '127.0.0.1'].includes(window.location.hostname) && (
          <button
            type="button"
            onClick={handleSkipIntro}
            style={{
              position: 'fixed',
              top: '80px',
              right: '20px',
              zIndex: 9999,
              padding: '10px 16px',
              background: '#333',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'none',
            }}
          >
            Skip Intro (Dev)
          </button>
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
          <>
            {showSurveyButton && (
              <button
                type="button"
                className="cssbuttons-io-button finish-button"
                onClick={handleFinish}
                disabled={finishing || isResponding}
              >
                {finishing ? 'Saving...' : 'Continue to Post-Survey'}

                <span className="icon">
                  <FontAwesomeIcon icon={faArrowRight} size="xs" />
                </span>
              </button>
            )}
          </>
        )}

        <main className="mi-main">
          <section className="mi-chat-card">
            <div
              className={`mi-chat-header mi-shared-character-stage ${
                charactersReady ? 'characters-ready' : 'characters-loading'
              } ${isSingleAgent ? 'single-agent' : ''}`}
            >
              {introInstruction.length > 0 && (
                <div className="mi-intro-instruction" role="note">
                  {introInstruction.map((instruction, index) => (
                    <div
                      key={index}
                      className="mi-intro-instruction-line"
                      style={{
                        animationDelay: `${index * 0.15}s`,
                      }}
                    >
                      {instruction}
                    </div>
                  ))}
                </div>
              )}

              <div
                className="mi-shared-stage-background"
                style={{
                  backgroundImage: `url(${stageBackground})`,
                }}
              />

              {openingResponseDone &&
                !openingComplete &&
                (condition === CONDITION_SINGLE_COMBINED ||
                  condition === CONDITION_MULTIPLE) &&
                !topicState?.conversation_complete && (
                  <button
                    type="button"
                    className="cssbuttons-io-button continue-intro-button"
                    disabled={isResponding}
                    onClick={() => handleOpeningContinue()}
                  >
                    Continue
                    <span className="icon">
                      <FontAwesomeIcon icon={faArrowRight} size="xs" />
                    </span>
                  </button>
                )}

              {waitingForFirstTopic ? (
                <button
                  type="button"
                  className="cssbuttons-io-button next-topic-button"
                  onClick={handleStartFirstTopic}
                >
                  Start First Topic
                  <span className="icon">
                    <FontAwesomeIcon icon={faArrowRight} size="xs" />
                  </span>
                </button>
              ) : (
                topicState?.phase === 'topics' &&
                introDone &&
                !showTopicSelection &&
                !awaitingTopicElaboration && (
                  <button
                    type="button"
                    className="cssbuttons-io-button next-topic-button"
                    disabled={isResponding}
                    onClick={handleNextTopic}
                  >
                    {topicState.current_topic_index === 2
                      ? 'Finish Topics'
                      : 'Next Topic'}

                    <span className="icon">
                      <FontAwesomeIcon icon={faArrowRight} size="xs" />
                    </span>
                  </button>
                )
              )}

              {started && (
                <div
                  className={`scene-loading-overlay ${
                    showSceneLoading ||
                    responseStatus === 'Preparing next topic' ||
                    responseStatus === 'Finishing topics' ||
                    responseStatus === 'Preparing suggested resources'
                      ? 'scene-loading-overlay-visible'
                      : ''
                  }`}
                >
                  <div className="response-status">
                    <span className="response-status-dots" aria-hidden="true">
                      <span>.</span>
                      <span>.</span>
                      <span>.</span>
                    </span>
                    <span>{responseStatus || 'Getting ready'}</span>
                  </div>
                </div>
              )}

              <div
                onClick={() => {
                  if (
                    condition === CONDITION_MULTIPLE &&
                    topicState?.phase === 'topics' &&
                    focusedCharacter === 'Jordan' &&
                    !awaitingTopicElaboration &&
                    !isResponding
                  ) {
                    setFocusedCharacter('Alex')
                  }
                }}
                className={`mi-character-zone mi-character-zone-alex ${
                  activeSpeaker === 'Jordan' ||
                  (condition === CONDITION_MULTIPLE &&
                    topicState?.phase === 'topics' &&
                    focusedCharacter === 'Jordan' &&
                    activeSpeaker !== 'Alex') ||
                  (condition === CONDITION_MULTIPLE &&
                    awaitingTopicElaboration &&
                    focusedCharacter !== 'Alex') ||
                  (condition === CONDITION_MULTIPLE && showQuestions)
                    ? 'character-dimmed'
                    : ''
                } ${activeSpeaker === 'Alex' ? 'character-speaking' : ''}`}
              >
                <div className="mi-character-content">
                  <div
                    className="virtual-doctor"
                    id="virtualdoctor"
                    ref={doctorRef}
                  />

                  {introVisuals.Alex && (
                    <div
                      key={introVisuals.Alex.id}
                      className={`intro-visual-cue intro-visual-cue-alex ${
                        introVisuals.Alex.fadingOut
                          ? 'intro-visual-fade-out'
                          : ''
                      }`}
                      aria-hidden="true"
                    >
                      <div className="intro-visual-icons">
                        {(
                          introVisuals.Alex.icons || [introVisuals.Alex.icon]
                        ).map((icon, index) => (
                          <div
                            key={index}
                            className="intro-visual-icon"
                            style={{
                              animationDelay: `${index * (introVisuals.Alex.stagger ?? 0.3)}s, ${index * (introVisuals.Alex.stagger ?? 0.3) + 0.35}s`,
                            }}
                          >
                            <FontAwesomeIcon icon={icon} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {condition === CONDITION_MULTIPLE &&
                    awaitingTopicElaboration && (
                      <button
                        type="button"
                        className="alex-transition-bubble"
                        disabled={isResponding}
                        onClick={handleStartAlexTopic}
                      >
                        Explore information
                      </button>
                    )}

                  {showSwipingCards && <SwipingCards />}
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
                      <div className="subtitle-name-pill subtitle-name-pill-alex">
                        Alex
                      </div>
                      {alexSubtitle}
                    </div>
                  )}
                </div>
              </div>
              {!showTopicSelection && (
                <TopicProgress
                  topicState={topicState}
                  availableTopics={selectedTopics
                    .map((id) => STUDY_TOPICS.find((topic) => topic.id === id))
                    .filter(Boolean)}
                  showTopics={showTopics}
                  highlightCurrentTopic={highlightCurrentTopic}
                />
              )}
              {(condition === CONDITION_SINGLE_COMBINED ||
                condition === CONDITION_MULTIPLE) && (
                <div
                  className={`questions-drawer ${
                    showQuestions ? 'questions-drawer-open' : ''
                  } ${showQuestionsTab ? 'questions-drawer-visible' : ''}`}
                >
                  <button
                    type="button"
                    className="questions-tab"
                    onClick={() => {
                      logQuestionListInteraction(
                        showQuestions ? 'closed' : 'opened',
                      )
                      setShowQuestions((previous) => !previous)
                    }}
                    aria-label={
                      showQuestions
                        ? 'Close my questions and concerns'
                        : 'Open my questions and concerns'
                    }
                    aria-expanded={showQuestions}
                    title="My Questions & Concerns"
                  >
                    <FontAwesomeIcon icon={faClipboardList} />
                    Open Tailored Question List
                  </button>

                  <div className="questions-panel">
                    <div className="questions-panel-header">
                      <div>
                        <FontAwesomeIcon icon={faClipboardList} />
                        <h2>Tailored Question List</h2>
                      </div>

                      <button
                        type="button"
                        className="questions-panel-close"
                        onClick={() => {
                          logQuestionListInteraction('closed')
                          setShowQuestions(false)
                        }}
                        aria-label="Close questions panel"
                      >
                        ×
                      </button>
                    </div>

                    <div className="questions-panel-body">
                      {topicState?.topics?.some(
                        (topic) =>
                          topic.personally_situated_questions?.length > 0,
                      ) ? (
                        topicState.topics.map((topic, index) => {
                          const questions =
                            topic.personally_situated_questions || []

                          if (questions.length === 0) return null

                          return (
                            <section className="questions-topic" key={index}>
                              <h3>{topic.topic}</h3>

                              <ul>
                                {questions.map((item, questionIndex) => (
                                  <li key={questionIndex}>{item.question}</li>
                                ))}
                              </ul>
                            </section>
                          )
                        })
                      ) : (
                        <p className="questions-empty">
                          No questions or concerns saved yet. As you chat, we'll
                          keep track of things you may want to revisit later.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!isSingleAgent && (
                <div
                  onClick={() => {
                    if (
                      condition === CONDITION_MULTIPLE &&
                      topicState?.phase === 'topics' &&
                      !isResponding
                    ) {
                      setFocusedCharacter('Jordan')
                    }
                  }}
                  className={`mi-character-zone mi-character-zone-jordan ${
                    condition === CONDITION_MULTIPLE && showQuestions
                      ? 'character-speaking'
                      : activeSpeaker === 'Alex' ||
                          (condition === CONDITION_MULTIPLE &&
                            topicState?.phase === 'topics' &&
                            focusedCharacter === 'Alex' &&
                            activeSpeaker !== 'Jordan')
                        ? 'character-dimmed'
                        : ''
                  } ${
                    activeSpeaker === 'Jordan' ||
                    (condition === CONDITION_MULTIPLE &&
                      awaitingTopicElaboration &&
                      focusedCharacter === 'Jordan')
                      ? 'character-speaking'
                      : ''
                  }`}
                >
                  <div className="mi-character-content">
                    <div
                      className="virtual-companion"
                      id="virtualcompanion"
                      ref={companionRef}
                    />

                    {introVisuals.Jordan && (
                      <div
                        key={introVisuals.Jordan.id}
                        className={`intro-visual-cue intro-visual-cue-jordan ${
                          introVisuals.Jordan.fadingOut
                            ? 'intro-visual-fade-out'
                            : ''
                        }`}
                        aria-hidden="true"
                      >
                        <div className="intro-visual-icons">
                          {(
                            introVisuals.Jordan.icons || [
                              introVisuals.Jordan.icon,
                            ]
                          ).map((icon, index) => (
                            <div
                              key={index}
                              className="intro-visual-icon"
                              style={{
                                animationDelay: `${index * (introVisuals.Jordan.stagger ?? 0.3)}s, ${index * (introVisuals.Jordan.stagger ?? 0.3) + 0.35}s`,
                              }}
                            >
                              <FontAwesomeIcon icon={icon} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

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
                        <div className="subtitle-name-pill subtitle-name-pill-jordan">
                          Jordan
                        </div>
                        {jordanSubtitle}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div
              className={`mi-bottom-panel ${
                showChatInput ? '' : 'mi-bottom-panel-hidden'
              } ${showTopicSelection ? 'mi-bottom-panel-topic-selection' : ''}`}
            >
              {resourceChoice === 'yes' ? (
                <div className="full-input-area">
                  <div className="suggested-resources">
                    <div className="suggested-resources-list">
                      {displayedResources.map((resource) => {
                        const isRecommended =
                          condition !== CONDITION_SINGLE_INFO &&
                          suggestedResources.some((r) => r.id === resource.id)

                        const isRequested = openedResources.includes(
                          resource.id,
                        )

                        return (
                          <button
                            key={resource.id}
                            type="button"
                            disabled={isResponding}
                            className={`suggested-resource-card ${
                              isRecommended ? 'resource-recommended' : ''
                            }`}
                            onClick={() => handleResourcePreview(resource)}
                          >
                            <FontAwesomeIcon icon={resource.icon} />

                            <div className="suggested-resource-info">
                              <strong>{resource.title}</strong>

                              {isRecommended && (
                                <div className="resource-recommended-label">
                                  Recommended
                                </div>
                              )}

                              {isRequested && (
                                <span className="resource-opened-label">
                                  Requested
                                </span>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : showResourceChoice ? (
                <div className="full-input-area">
                  <div className="resource-choice-buttons">
                    <button
                      type="button"
                      className="cssbuttons-io-button"
                      disabled={isResponding}
                      onClick={() => handleResourceChoice('yes')}
                    >
                      Yes, show me
                    </button>

                    <button
                      type="button"
                      className="cssbuttons-io-button"
                      disabled={isResponding}
                      onClick={() => handleResourceChoice('no')}
                    >
                      No, thanks
                    </button>
                  </div>
                </div>
              ) : showTopicSelection ? (
                <div className="full-input-area">
                  <div className="topic-selection">
                    <h3>Confirm Your Topics</h3>
                    <p>
                      Alex suggested these three topics. You can keep them or
                      change any of them.
                    </p>

                    <div className="topic-selection-cards">
                      {selectedTopics.map((topicId, index) => (
                        <div className="topic-selection-card" key={index}>
                          <label htmlFor={`topic-choice-${index}`}>
                            Topic {index + 1}
                          </label>

                          <select
                            id={`topic-choice-${index}`}
                            value={topicId}
                            disabled={isResponding}
                            onChange={(event) =>
                              handleTopicChange(index, event.target.value)
                            }
                          >
                            {STUDY_TOPICS.map((topic) => (
                              <option
                                key={topic.id}
                                value={topic.id}
                                disabled={
                                  selectedTopics.includes(topic.id) &&
                                  topic.id !== topicId
                                }
                              >
                                {topic.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="cssbuttons-io-button"
                      disabled={isResponding || selectedTopics.length !== 3}
                      onClick={handleConfirmTopics}
                      style={{ margin: '18px auto 0' }}
                    >
                      Start!
                      <span className="icon">
                        <FontAwesomeIcon icon={faArrowRight} size="xs" />
                      </span>
                    </button>
                  </div>
                </div>
              ) : topicState?.phase === 'wrapup' ? (
                <div className="full-input-area" />
              ) : (
                <div className="full-input-area">
                  <ChatInput
                    input={input}
                    textareaRef={textareaRef}
                    onChange={setInput}
                    onSubmit={handleSend}
                    onHandleKeyDown={handleKeyDown}
                    sentMessageAnimation={sentMessageAnimation}
                    isResponding={isResponding}
                    awaitingTopicElaboration={awaitingTopicElaboration}
                  />

                  {condition === CONDITION_MULTIPLE &&
                    awaitingTopicElaboration && (
                      <div className="jordan-ask-transition">
                        <span className="jordan-ask-keyboard-hint">
                          Enter to send · Shift + Enter for newline
                        </span>
                      </div>
                    )}
                </div>
              )}
            </div>
          </section>
        </main>
        {showHistory && (
          <HistoryModal
            messages={messages}
            onClose={() => setShowHistory(false)}
            historyBodyRef={historyBodyRef}
          />
        )}
        {previewResource && (
          <div
            className="resource-preview-overlay"
            onClick={() => setPreviewResource(null)}
          >
            <div
              className="resource-preview-modal"
              role="dialog"
              aria-modal="true"
              aria-label={`Preview: ${previewResource.title}`}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="resource-preview-header">
                <h2>[Preview] {previewResource.title}</h2>

                <button
                  type="button"
                  className="resource-preview-close"
                  onClick={() => setPreviewResource(null)}
                  aria-label="Close resource preview"
                >
                  ×
                </button>
              </div>

              <div className="resource-preview-content">
                {RESOURCE_PREVIEWS[previewResource.id]?.endsWith('.pdf') ? (
                  <iframe
                    title={previewResource.title}
                    src={RESOURCE_PREVIEWS[previewResource.id]}
                  />
                ) : (
                  <img
                    src={RESOURCE_PREVIEWS[previewResource.id]}
                    alt={previewResource.title}
                  />
                )}
              </div>

              <div className="resource-preview-footer">
                <p>
                  Interested in keeping this resource? You can click the button
                  to request this link to be messaged to you on Prolific after
                  the study.
                </p>

                <button
                  type="button"
                  className={`resource-request-button ${
                    openedResources.includes(previewResource.id)
                      ? 'resource-requested'
                      : ''
                  }`}
                  aria-pressed={openedResources.includes(previewResource.id)}
                  onClick={() => handleResourceOpen(previewResource.id)}
                >
                  {openedResources.includes(previewResource.id)
                    ? '☑ Requested — click to undo'
                    : 'Request link after study'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function TopicProgress({
  topicState,
  availableTopics,
  showTopics,
  highlightCurrentTopic,
}) {
  const isPreview = topicState?.phase !== 'topics'

  const displayState = {
    current_topic_index: isPreview ? 0 : (topicState.current_topic_index ?? 0),

    topics: (isPreview ? availableTopics : topicState.topics).map(
      (topic, index) => ({
        topic: topic.name || topic.topic,
        status: isPreview
          ? 'upcoming'
          : index < topicState.current_topic_index
            ? 'completed'
            : index === topicState.current_topic_index
              ? 'active'
              : 'upcoming',
      }),
    ),
  }

  if (!displayState?.topics?.length) return null

  const currentTopicIndex = displayState.current_topic_index

  return (
    <div
      className={`topic-progress ${
        showTopics ? 'topic-progress-visible' : 'topic-progress-hidden'
      }`}
    >
      <div
        className="topic-progress-list"
        style={{
          '--topic-count': displayState.topics.length,
          '--progress':
            displayState.topics.length > 1
              ? currentTopicIndex / (displayState.topics.length - 1)
              : 0,
        }}
      >
        <div className="topic-progress-line" />
        <div className="topic-progress-line-fill" />

        {displayState.topics.map((topic, index) => {
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
  awaitingTopicElaboration,
}) {
  return (
    <>
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
                : awaitingTopicElaboration
                  ? "Share what's important to you so Jordan can help you figure out what information you'd want to know ..."
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

      {!awaitingTopicElaboration && (
        <p>Press enter to send, or Shift + Enter for newline</p>
      )}
    </>
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
            messages
              .filter((message) => message.from !== 'system')
              .map((message, index) => (
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
