import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import logo from '../assets/logo-transparent.png'
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
  faFileLines,
  faCommentDots,
} from '@fortawesome/free-solid-svg-icons'
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
  "Gotcha! Let me make sure I'm getting this right by quickly saying that back to you."

const ALEX_TOPIC_FILLER = `Alright, thank you for sharing those thoughts. Based on what you shared and the information available to me, I have identified a few topics that you might find relevant.`

const ALEX_TOPIC_SELECTION_INSTRUCTIONS =
  'You can keep these suggestions or change any of them using the options below. ' +
  "Once you're satisfied with your selections, click Continue to start exploring these topics."

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
  const requestedCompanion = searchParams.get('companion')
  const selectedCompanion = [
    'jordan1',
    'jordan2',
    'jordan3',
    'jordan4',
  ].includes(requestedCompanion)
    ? requestedCompanion
    : 'jordan1'
  const companionAudioPrefix = ['jordan1', 'jordan2'].includes(
    selectedCompanion,
  )
    ? 'companion-female'
    : 'companion-male'

  function resolveCompanionAudioPath(path) {
    return path.replace(
      '/intro-voices/companion-',
      `/intro-voices/${companionAudioPrefix}-`,
    )
  }

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
  const [showChatInput, setShowChatInput] = useState(false)
  const [waitingForFirstTopic, setWaitingForFirstTopic] = useState(false)
  const canStart = entryLogged && Object.values(startChecks).every(Boolean)
  const [showTopics, setShowTopics] = useState(false)
  const [completedAlexIntroTopic, setCompletedAlexIntroTopic] = useState(null)
  const [isResponding, setIsResponding] = useState(false)
  const [highlightCurrentTopic, setHighlightCurrentTopic] = useState(false)
  const [responseStatus, setResponseStatus] = useState('')
  const [showStartOverlay, setShowStartOverlay] = useState(true)
  const [showSceneLoading, setShowSceneLoading] = useState(false)
  const [starting, setStarting] = useState(false)
  const [showThinkingBubble, setShowThinkingBubble] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [showResourceChoice, setShowResourceChoice] = useState(false)
  const [showResourceOption, setShowResourceOption] = useState(false)
  const [showDiscussionOption, setShowDiscussionOption] = useState(false)
  const [showClosingInstructions, setShowClosingInstructions] = useState(false)
  const [discussionQuestions, setDiscussionQuestions] = useState([])
  const [alexMaterialOverview, setAlexMaterialOverview] = useState('')
  const [jordanMaterialOverview, setJordanMaterialOverview] = useState('')

  const alexMaterialSpeechRef = useRef(null)
  const jordanMaterialSpeechRef = useRef(null)
  const [showDiscussionQuestions, setShowDiscussionQuestions] = useState(false)
  const [selectedNextSteps, setSelectedNextSteps] = useState({
    questions: false,
    resources: false,
  })
  const [showDeliveryChoice, setShowDeliveryChoice] = useState(false)

  const [selectedDelivery, setSelectedDelivery] = useState({
    questions: false,
    resources: false,
  })
  const [resourceChoice, setResourceChoice] = useState(null)
  const [showSurveyButton, setShowSurveyButton] = useState(false)
  const [suggestedResources, setSuggestedResources] = useState([])
  const [shuffledResources] = useState(() => shuffleArray(RESOURCES))
  const displayedResources =
    condition === CONDITION_SINGLE_INFO
      ? shuffledResources
      : suggestedResources.slice(0, 3)
  const [openedResources, setOpenedResources] = useState([])
  const openedResourcesRef = useRef([])
  const resourceLoggingQueueRef = useRef(Promise.resolve())
  const transcriptLoggingQueueRef = useRef(Promise.resolve())
  const [previewResource, setPreviewResource] = useState(null)
  const [activeSpeaker, setActiveSpeaker] = useState(null)
  const [focusedCharacter, setFocusedCharacter] = useState(
    condition === CONDITION_MULTIPLE ? 'Jordan' : 'Alex',
  )
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
      setCompletedAlexIntroTopic(session.completedAlexIntroTopic ?? null)

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
      // Restore the chat panel based on conversation progress.
      setShowChatInput(
        session.showSurveyButton
          ? false
          : session.showDeliveryChoice ||
              session.showResourceChoice ||
              session.showTopicSelection ||
              (condition === CONDITION_SINGLE_INFO
                ? restoredTopicState?.phase === 'topics'
                : session.introDone === true || restoredIntroIndex >= 7),
      )

      setShowResourceChoice(session.showResourceChoice ?? false)
      setShowClosingInstructions(session.showResourceChoice ?? false)

      setShowResourceOption(session.showResourceChoice ?? false)

      setShowDiscussionOption(
        (session.showResourceChoice ?? false) &&
          (session.discussionQuestions ?? []).length > 0,
      )

      setDiscussionQuestions(session.discussionQuestions ?? [])
      setAlexMaterialOverview(session.alexMaterialOverview ?? '')
      setJordanMaterialOverview(session.jordanMaterialOverview ?? '')

      setShowDiscussionQuestions(session.showDiscussionQuestions ?? false)

      setSelectedNextSteps(
        session.selectedNextSteps ?? {
          questions: false,
          resources: false,
        },
      )

      setShowDeliveryChoice(session.showDeliveryChoice ?? false)

      setSelectedDelivery(
        session.selectedDelivery ?? {
          questions: false,
          resources: false,
        },
      )

      setResourceChoice(session.resourceChoice ?? null)
      setShowSurveyButton(session.showSurveyButton ?? false)
      setSuggestedResources(
        (session.suggestedResourceIds ?? [])
          .map((id) => {
            const resource = RESOURCES.find((r) => r.id === id)

            if (!resource) return null

            return {
              ...resource,
              explanation: session.suggestedResourceExplanations?.[id] ?? '',
            }
          })
          .filter(Boolean),
      )

      const restoredOpened = session.openedResourceIds ?? []
      openedResourcesRef.current = restoredOpened
      setOpenedResources(restoredOpened)

      // Only reveal topic-related UI once the topic phase begins.
      const topicsStarted = restoredTopicState?.phase === 'topics'

      const hasSelectedTopics = (session.availableTopics ?? []).length === 3

      setShowTopics(
        !restoredTopicState?.conversation_complete &&
          (topicsStarted || hasSelectedTopics),
      )
      setHighlightCurrentTopic(topicsStarted)
    } catch (error) {
      console.error('Could not restore session:', error)
    } finally {
      setSessionRestored(true)
    }
  }, [SESSION_KEY])

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
      completedAlexIntroTopic,
      introDone,
      introNextIndex,
      openingResponseDone,
      openingComplete,
      awaitingTopicElaboration,
      availableTopics,
      selectedTopics,
      showTopicSelection,
      showResourceChoice,
      discussionQuestions,
      alexMaterialOverview,
      jordanMaterialOverview,
      showDiscussionQuestions,
      selectedNextSteps,
      showDeliveryChoice,
      selectedDelivery,
      resourceChoice,
      showSurveyButton,
      suggestedResourceIds: suggestedResources.map((resource) => resource.id),
      suggestedResourceExplanations: Object.fromEntries(
        suggestedResources.map((resource) => [
          resource.id,
          resource.explanation ?? '',
        ]),
      ),
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
    completedAlexIntroTopic,
    introDone,
    introNextIndex,
    openingResponseDone,
    openingComplete,
    awaitingTopicElaboration,
    availableTopics,
    selectedTopics,
    showTopicSelection,
    showResourceChoice,
    discussionQuestions,
    alexMaterialOverview,
    jordanMaterialOverview,
    showDiscussionQuestions,
    selectedNextSteps,
    showDeliveryChoice,
    selectedDelivery,
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
            initCompanionCharacter(companionRef.current, selectedCompanion),
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
    // Stop the intro after the current audio segment finishes.
    skipIntroRef.current = true

    // Don't reveal the chat yet. The intro must finish first.
    // Otherwise, the user can interact while isResponding is still true.
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
          resolveCompanionAudioPath(intro.audio),
          resolveCompanionAudioPath(intro.timestamps),
          intro.character,
          true,
          setSubtitle,
          () => {
            playIntroVisualCues(intro)
            // Reveal the chat panel during Alex's opening question.
            if (
              condition === CONDITION_SINGLE_COMBINED &&
              intro.audio ===
                '/intro-voices/doctor-audio-ALEX_INTRO_1_COMBINED_4.mp3'
            ) {
              setShowChatInput(true)
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
                  setTimeout(() => {
                    playGesture('jordanLookAtAlex')
                  }, 3000)
                } else {
                  // Jordan faces forward while Alex looks at Jordan
                  setTimeout(() => {
                    playGesture('stopCompanionGesture')
                  }, 1500)
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

    const needsInfoOnlyTopicPreparation =
      condition === CONDITION_SINGLE_INFO &&
      introDone &&
      !showTopicSelection &&
      !topicState &&
      !showResourceChoice &&
      !showDeliveryChoice &&
      !showSurveyButton

    const needsInfoOnlyTopicIntro =
      condition === CONDITION_SINGLE_INFO &&
      introDone &&
      topicState?.phase === 'topics' &&
      completedAlexIntroTopic !== topicState.current_topic_index

    if (introDone && !needsInfoOnlyTopicPreparation && !needsInfoOnlyTopicIntro)
      return

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

          if (skipIntroRef.current) {
            setShowChatInput(true)
          }

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

        // Condition 1: Resume the active topic or prepare topic selection.
        if (condition === CONDITION_SINGLE_INFO) {
          if (needsInfoOnlyTopicIntro) {
            await handleStartAlexTopic(
              true,
              null,
              topicState.current_topic_index,
            )
          } else {
            await startTopicPreparation([])
          }
        }
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
    showTopicSelection,
    topicState,
    completedAlexIntroTopic,
    showResourceChoice,
    showDeliveryChoice,
    showSurveyButton,
  ])

  function handleTopicChange(index, newTopicId) {
    setSelectedTopics((previous) =>
      previous.map((topicId, i) => (i === index ? newTopicId : topicId)),
    )
  }

  async function prepareAlexTopicResponse() {
    const response = await fetch(`${BASE_URL}/study/alex-topic-response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        participant_id: participantId,
      }),
    })

    if (!response.ok) {
      throw new Error(`Alex topic response failed: ${response.status}`)
    }

    const data = await response.json()

    const prepared = await prepareSpeech(data.alex_reply, 'doctor')

    return { data, prepared }
  }

  async function handleStartAlexTopic(
    force = false,
    responsePromise = null,
    topicIndex = topicState?.current_topic_index,
  ) {
    if ((isResponding && !force) || (focusedCharacter === 'Alex' && !force))
      return

    setFocusedCharacter('Alex')
    // Alex continues thinking for another 1.5 seconds.
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setAwaitingTopicElaboration(false)
    setIsResponding(true)
    setResponseStatus('Preparing information')

    try {
      const { data, prepared } = await (responsePromise ??
        prepareAlexTopicResponse())

      console.log('Alex topic response:', data)

      // Save Alex's response in the transcript.
      setMessages((previous) => [
        ...previous,
        {
          from: 'Alex',
          text: data.alex_reply,
        },
      ])

      setResponseStatus('')

      // Alex faces forward.
      playGesture('stopAlexGesture')

      if (condition === CONDITION_MULTIPLE) {
        playGesture('jordanLookAtAlex')
        swivelJordanTowardAlex(true)
      }

      setActiveSpeaker('Alex')

      try {
        await playPreparedSpeech({
          prepared,
          onSubtitle: setAlexSubtitle,
        })
        // Allow topic advancement once Alex finishes speaking.
        setCompletedAlexIntroTopic(topicIndex)
      } finally {
        if (condition === CONDITION_MULTIPLE) {
          swivelJordanTowardAlex(false)
          playGesture('stopCompanionGesture')
        }

        setActiveSpeaker(null)
        setAlexSubtitle('')
      }
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

    // Log the participant's final confirmed topic selections.
    fetch(`${BASE_URL}/logs/log-selected-topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        participant_id: participantId,
        selected_topics: [...selectedTopics],
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Selected topics logging failed: ${response.status}`)
        }
      })
      .catch((error) => {
        console.error('Could not log selected topics:', error)
      })

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

      // Transition directly from topic selection to chat input.
      setShowTopicSelection(false)
      setShowTopics(true)
      setHighlightCurrentTopic(true)
      setShowChatInput(true)

      // Condition 1 begins directly with factual information.
      // Condition 3 begins with needs elicitation.
      if (condition === CONDITION_SINGLE_INFO) {
        await handleStartAlexTopic(true, null, data.current_topic_index)
      } else {
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
          {
            from: conversationalSpeaker,
            text: openingData.jordan_reply,
          },
        ])

        if (condition === CONDITION_MULTIPLE) {
          playGesture('alexLookAtJordan')
        }

        await speakWithHighlight(
          openingData.jordan_reply,
          isSingleAgent ? 'doctor' : 'companion',
          isSingleAgent ? setAlexSubtitle : setJordanSubtitle,
        )

        setAlexSubtitle('')
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

  async function handleConversationClosing(data = {}) {
    setShowTopics(false)
    setHighlightCurrentTopic(false)
    setAwaitingTopicElaboration(false)
    setResponseStatus('')
    setShowThinkingBubble(false)
    setShowQuestions(false)

    // Hide the conversation input area.
    setShowChatInput(false)
    setShowClosingInstructions(false)

    try {
      // Prepare Alex's personalized resource recommendations.
      const alexClosingPromise =
        condition !== CONDITION_SINGLE_INFO
          ? fetch(`${BASE_URL}/study/alex-closing`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                participant_id: participantId,
                history: messages.filter(
                  (message) => message.from !== 'system',
                ),
              }),
            })
              .then(async (response) => {
                if (!response.ok) {
                  throw new Error(`Alex closing failed: ${response.status}`)
                }

                const data = await response.json()

                setAlexMaterialOverview(data.spoken_overview)

                alexMaterialSpeechRef.current = prepareSpeech(
                  data.spoken_overview,
                  'doctor',
                ).catch((error) => {
                  console.error(
                    'Could not prepare Alex material overview:',
                    error,
                  )
                  return null
                })

                return data
              })
              .catch((error) => {
                console.error('Could not prepare Alex closing:', error)
                return null
              })
          : null

      // Prepare Jordan's closing response while Alex speaks.
      const jordanClosingPromise =
        condition !== CONDITION_SINGLE_INFO
          ? fetch(`${BASE_URL}/study/jordan-closing`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                participant_id: participantId,
                history: messages.filter(
                  (message) => message.from !== 'system',
                ),
              }),
            })
              .then(async (response) => {
                if (!response.ok) {
                  throw new Error(`Jordan closing failed: ${response.status}`)
                }

                const data = await response.json()

                const combinedOverview =
                  `${data.reflection} ${data.spoken_overview}`.trim()

                setJordanMaterialOverview(combinedOverview)

                jordanMaterialSpeechRef.current = prepareSpeech(
                  combinedOverview,
                  isSingleAgent ? 'doctor' : 'companion',
                ).catch((error) => {
                  console.error(
                    'Could not prepare Jordan material overview:',
                    error,
                  )
                  return null
                })

                return { data }
              })
              .catch((error) => {
                console.error('Could not prepare Jordan closing:', error)
                return null
              })
          : null

      // Prepare a general resource overview for Condition 1.
      if (condition === CONDITION_SINGLE_INFO) {
        const overview =
          'Here are some credible resources that provide additional information about clinical trial participation. ' +
          'You can click on any resource to preview it and explore whichever ones interest you.'

        setAlexMaterialOverview(overview)

        alexMaterialSpeechRef.current = prepareSpeech(overview, 'doctor').catch(
          (error) => {
            console.error('Could not prepare resource overview:', error)
            return null
          },
        )
      }

      // Alex invites the participant to explore additional resources.
      // Alex concludes the conversation and introduces resources.
      const alexClosingInvitation =
        "Alright, we've now explored all three of your selected topics. " +
        'Our conversation today is just one step in understanding clinical trial participation. ' +
        'I realize that you may have additional questions or areas you wish to learn more about. ' +
        (condition === CONDITION_SINGLE_INFO
          ? 'There are several credible resources available that can help you learn more about clinical trial participation. '
          : 'Based on our conversation, I have identified a few credible resources that may be relevant to you. ') +
        'If you are interested, you can select the option below to view them.'

      setMessages((previous) => [
        ...previous,
        { from: 'Alex', text: alexClosingInvitation },
      ])

      playGesture('stopAlexGesture')

      if (!isSingleAgent) {
        playGesture('jordanLookAtAlex')
      }

      setShowResourceChoice(true)

      setTimeout(() => {
        setShowChatInput(true)
        setShowResourceOption(true)
      }, 10000)

      await speakWithHighlight(alexClosingInvitation, 'doctor', setAlexSubtitle)

      setAlexSubtitle('')

      if (condition === CONDITION_SINGLE_INFO) {
        setShowClosingInstructions(true)
      }

      if (!isSingleAgent) {
        playGesture('stopCompanionGesture')
      }

      // Deliver Jordan's prepared closing reflection.
      if (jordanClosingPromise) {
        const result = await jordanClosingPromise

        if (result) {
          const { data } = result

          const jordanClosingInvitation =
            "And you know, sometimes it's helpful to have a few questions in mind so you know what to look into next. " +
            (isSingleAgent
              ? 'Thinking back on some of the things you shared with me today, '
              : 'Thinking back on some of the things you shared with us today, ') +
            "I've come up with a few questions that might be helpful for you personally. " +
            'You could look into them on your own or even talk them through with a friend, a family member, or your healthcare provider. ' +
            "Feel free to check these out too if you're curious!"

          // Store the personalized discussion questions.
          setDiscussionQuestions(data.discussion_questions ?? [])
          // Log Jordan's generated discussion questions.
          setMessages((previous) => [
            ...previous,
            {
              from: 'system',
              event: 'discussion_questions_generated',
              questions: data.discussion_questions ?? [],
              timestamp: new Date().toISOString(),
            },
          ])

          // Invite the participant to view their personalized questions.
          setMessages((previous) => [
            ...previous,
            { from: conversationalSpeaker, text: jordanClosingInvitation },
          ])

          if (!isSingleAgent) {
            playGesture('stopCompanionGesture')
            playGesture('alexLookAtJordan')
          }

          setTimeout(() => {
            setShowDiscussionOption(true)
          }, 10000)

          await speakWithHighlight(
            jordanClosingInvitation,
            isSingleAgent ? 'doctor' : 'companion',
            isSingleAgent ? setAlexSubtitle : setJordanSubtitle,
          )

          setAlexSubtitle('')
          setJordanSubtitle('')
          playGesture('stopAlexGesture')
          setShowClosingInstructions(true)
        }
      }

      // Retrieve Alex's personalized resource recommendations.
      if (alexClosingPromise) {
        const closingData = await alexClosingPromise

        if (closingData) {
          const recommendations = (closingData.recommended_resources ?? [])
            .map((recommendation) => {
              const resource = RESOURCES.find(
                (r) => r.id === recommendation.resource_id,
              )

              if (!resource) return null

              return {
                ...resource,
                explanation: recommendation.explanation,
              }
            })
            .filter(Boolean)

          setSuggestedResources(recommendations)

          // Log Alex's personalized resource recommendations.
          fetch(`${BASE_URL}/logs/log-recommended-resources`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              participant_id: participantId,
              recommended_resources: closingData.recommended_resources,
            }),
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error(
                  `Resource recommendation logging failed: ${response.status}`,
                )
              }
            })
            .catch((error) => {
              console.error('Could not log recommended resources:', error)
            })

          // Log Alex's personalized resource recommendations.
          setMessages((previous) => [
            ...previous,
            {
              from: 'system',
              event: 'resource_recommendations_generated',
              recommendations: closingData.recommended_resources,
              timestamp: new Date().toISOString(),
            },
          ])

          console.log('Alex recommended resources:', recommendations)
        }
      }

      // Log completion of the conversational portion.
      fetch(`${BASE_URL}/logs/log-conversation-finished`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participant_id: participantId,
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(
              `Conversation completion logging failed: ${response.status}`,
            )
          }
        })
        .catch((error) => {
          console.error('Could not log conversation completion:', error)
        })
    } catch (error) {
      console.error('Closing conversation error:', error)
    } finally {
      setActiveSpeaker(null)
      setAlexSubtitle('')
      setJordanSubtitle('')

      playGesture('stopAlexGesture')

      if (!isSingleAgent) {
        playGesture('stopCompanionGesture')
      }

      // Always allow the participant to continue.
      setShowResourceChoice(true)
      setShowChatInput(true)
      // Ensure Alex's option is visible when closing finishes.
      setShowResourceOption(true)
    }
  }

  async function handleNextTopic() {
    if (isResponding || !topicState || topicState.conversation_complete) return

    // Shared study flow — all three conditions
    if (
      condition === CONDITION_SINGLE_INFO ||
      condition === CONDITION_SINGLE_COMBINED ||
      condition === CONDITION_MULTIPLE
    ) {
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

        // Log completion of the previous topic.
        fetch(`${BASE_URL}/logs/log-topic-covered`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            participant_id: participantId,
            topic_number: topicState.current_topic_index + 1,
          }),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(
                `Topic completion logging failed: ${response.status}`,
              )
            }
          })
          .catch((error) => {
            console.error('Could not log topic completion:', error)
          })

        setTopicState({
          current_topic_index: data.current_topic_index,
          conversation_complete: data.conversation_complete,
          phase: data.phase,
          topics: data.topics,
        })

        // Begin the closing conversation after the final topic.
        if (data.conversation_complete) {
          await handleConversationClosing(data)
          return
        }

        // Condition 1: Proceed directly to factual information.
        if (condition === CONDITION_SINGLE_INFO) {
          await handleStartAlexTopic(true, null, data.current_topic_index)
          return
        }

        // Reset to the conversational role for the new topic.
        setFocusedCharacter(conversationalSpeaker)
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
            from: conversationalSpeaker,
            text: openingData.jordan_reply,
          },
        ])

        if (condition === CONDITION_MULTIPLE) {
          playGesture('stopCompanionGesture')
          playGesture('alexLookAtJordan')
        }

        await speakWithHighlight(
          openingData.jordan_reply,
          isSingleAgent ? 'doctor' : 'companion',
          isSingleAgent ? setAlexSubtitle : setJordanSubtitle,
        )

        setAlexSubtitle('')
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
  }

  async function startTopicPreparation(conversationHistory) {
    setIsResponding(true)
    setResponseStatus('Preparing topics')
    playGesture('thinkingDoctor')

    try {
      const alexFillerMessage = {
        from: 'Alex',
        text: ALEX_TOPIC_FILLER,
      }

      const isInfoOnly = condition === CONDITION_SINGLE_INFO

      const topicPreparationHistory = isInfoOnly
        ? conversationHistory
        : [...conversationHistory, alexFillerMessage]

      if (!isInfoOnly) {
        setMessages((previous) => [...previous, alexFillerMessage])
      }
      // Start selecting the three topics in the background
      // while Alex delivers his scripted transition.
      const topicEndpoint =
        condition === CONDITION_SINGLE_INFO
          ? '/study/initialize-info-only'
          : '/study/prepare-topics'

      const responsePromise = fetch(`${BASE_URL}${topicEndpoint}`, {
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

      // Slide the input area away as Alex prepares to speak.
      setShowChatInput(false)

      // Alex faces forward while Jordan looks at him.
      playGesture('stopAlexGesture')

      if (condition === CONDITION_MULTIPLE) {
        playGesture('jordanLookAtAlex')
      }

      // Alex explains what he's about to do using prerecorded audio.
      setActiveSpeaker('Alex')

      if (condition === CONDITION_MULTIPLE) {
        swivelJordanTowardAlex(true)
      }

      try {
        if (!isInfoOnly) {
          await speakWithLipsyncStatic(
            STUDY_FILLER_AUDIO.alexTopic.audio,
            STUDY_FILLER_AUDIO.alexTopic.timestamps,
            'doctor',
            true,
            setAlexSubtitle,
          )
        }
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

      // Log Alex's original suggested topics.
      const suggestedTopicIds = (data.selected_topics ?? []).map(
        (topic) => topic.id,
      )

      if (suggestedTopicIds.length === 3) {
        fetch(`${BASE_URL}/logs/log-suggested-topics`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            participant_id: participantId,
            suggested_topics: suggestedTopicIds,
          }),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(
                `Suggested topics logging failed: ${response.status}`,
              )
            }
          })
          .catch((error) => {
            console.error('Could not log suggested topics:', error)
          })
      }

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

          setAlexSubtitle('')
          playGesture('stopAlexGesture')
        }
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
        setShowTopicSelection(true)
        setShowChatInput(true)
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
    }

    console.log('Opening elicitation completed', {
      participantId,
      condition,
      additionalMessage,
    })

    setOpeningComplete(true)

    // Collect the participant's opening responses.
    const openingResponses = updatedMessages
      .filter((message) => message.from === 'user')
      .map((message) => message.text)

    // Find the generated opening summary following the filler.
    const fillerIndex = updatedMessages.findIndex(
      (message) => message.text === JORDAN_OPENING_FILLER,
    )

    const openingSummary =
      fillerIndex !== -1 ? updatedMessages[fillerIndex + 1]?.text || '' : ''

    // Log the completed opening elicitation.
    fetch(`${BASE_URL}/logs/log-opening-completed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        participant_id: participantId,
        opening_responses: openingResponses,
        opening_summary: openingSummary,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Opening logging failed: ${response.status}`)
        }
      })
      .catch((error) => {
        console.error('Could not log opening elicitation:', error)
      })

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

    setIsResponding(true)

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

        playGesture(isCombined ? 'thinkingDoctor' : 'thinking')

        // Give the participant a moment before responding.
        await new Promise((resolve) => setTimeout(resolve, 3000))

        if (isCombined) {
          playGesture('stopAlexGesture')

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
              resolveCompanionAudioPath(STUDY_FILLER_AUDIO.jordanOpening.audio),
              resolveCompanionAudioPath(
                STUDY_FILLER_AUDIO.jordanOpening.timestamps,
              ),
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
        const followUp = isCombined
          ? `Did I get that right? Is there anything else you’d like to add before I suggest some topics based on what you’ve shared?`
          : `Did I get that right? Anything else you’d like to add before we see what topics Doctor Alex suggests based on what you’ve shared?`

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

      // Shared study flow — topic needs elicitation
      if (
        topicState?.phase === 'topics' &&
        ((condition === CONDITION_MULTIPLE && focusedCharacter === 'Jordan') ||
          (condition === CONDITION_SINGLE_COMBINED && awaitingTopicElaboration))
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
        // Prepare Alex's response and audio during Jordan's handoff.
        const alexResponsePromise = data.elicitation_complete
          ? prepareAlexTopicResponse()
          : null

        // Prevent an unhandled rejection while Jordan is speaking.
        alexResponsePromise?.catch(() => {})

        setMessages((previous) => [
          ...previous,
          {
            from: conversationalSpeaker,
            text: data.jordan_reply,
          },
        ])

        setShowThinkingBubble(false)

        if (condition === CONDITION_SINGLE_COMBINED) {
          await speakWithHighlight(data.jordan_reply, 'doctor', setAlexSubtitle)

          setAlexSubtitle('')

          if (data.elicitation_complete) {
            await handleStartAlexTopic(true, alexResponsePromise)
          }

          return
        }

        playGesture('stopCompanionGesture')

        if (data.elicitation_complete) {
          // Alex prepares information while Jordan wraps up.
          playGesture('thinkingDoctor')

          setActiveSpeaker('Jordan')

          try {
            await speakWithLipsync(
              data.jordan_reply,
              'companion',
              null,
              null,
              setJordanSubtitle,
            )

            setJordanSubtitle('')
            setActiveSpeaker(null)

            await handleStartAlexTopic(true, alexResponsePromise)
          } finally {
            playGesture('stopAlexGesture')
            setJordanSubtitle('')
            setActiveSpeaker(null)
          }
        } else {
          playGesture('alexLookAtJordan')

          await speakWithHighlight(
            data.jordan_reply,
            'companion',
            setJordanSubtitle,
          )

          setJordanSubtitle('')
          playGesture('stopAlexGesture')
        }

        return
      }

      // Shared study flow — Alex's ongoing factual conversation
      if (
        topicState?.phase === 'topics' &&
        (condition === CONDITION_SINGLE_INFO ||
          (condition === CONDITION_SINGLE_COMBINED &&
            !awaitingTopicElaboration) ||
          (condition === CONDITION_MULTIPLE && focusedCharacter === 'Alex'))
      ) {
        playGesture('thinkingDoctor')

        const thinkingDelay = new Promise((resolve) =>
          setTimeout(resolve, 3000),
        )

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

        await thinkingDelay

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

        if (condition === CONDITION_MULTIPLE) {
          playGesture('jordanLookAtAlex')
        }

        await speakWithHighlight(data.alex_reply, 'doctor', setAlexSubtitle)

        setAlexSubtitle('')

        if (condition === CONDITION_MULTIPLE) {
          playGesture('stopCompanionGesture')
        }

        return
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

  async function introduceMaterials(speaker, text, speechRef, revealMaterials) {
    const isAlex = speaker === 'Alex'
    const character = isAlex ? 'doctor' : 'companion'
    const setSubtitle = isAlex ? setAlexSubtitle : setJordanSubtitle

    try {
      // Use the audio prepared during the closing conversation.
      let prepared = await speechRef.current

      // Prepare audio if unavailable, such as after a refresh.
      if (!prepared && text) {
        prepared = await prepareSpeech(text, character)
      }

      if (!prepared || !text) return

      // Record the spoken overview in the transcript.
      setMessages((previous) => [...previous, { from: speaker, text }])

      setActiveSpeaker(speaker)

      if (isAlex) {
        playGesture('stopAlexGesture')

        if (!isSingleAgent) {
          playGesture('jordanLookAtAlex')
          swivelJordanTowardAlex(true)
        }
      } else {
        playGesture('stopCompanionGesture')
        playGesture('alexLookAtJordan')
        swivelAlexTowardJordan(true)
      }

      // Reveal the materials as the character begins speaking.
      revealMaterials()

      await playPreparedSpeech({
        prepared,
        onSubtitle: setSubtitle,
      })
    } catch (error) {
      console.error(`Could not introduce ${speaker}'s materials:`, error)
    } finally {
      // Ensure materials appear even if audio playback fails.
      revealMaterials()

      setSubtitle('')
      setActiveSpeaker(null)

      playGesture('stopAlexGesture')

      if (!isSingleAgent) {
        swivelAlexTowardJordan(false)
        swivelJordanTowardAlex(false)
        playGesture('stopCompanionGesture')
      }
    }
  }

  async function handleNextStepSelection() {
    if (isResponding) return

    const viewQuestions =
      selectedNextSteps.questions && discussionQuestions.length > 0

    const viewResources = selectedNextSteps.resources

    // Log the participant's confirmed next-step selections.
    fetch(`${BASE_URL}/logs/log-next-steps-selected`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        participant_id: participantId,
        questions_available: discussionQuestions.length > 0,
        questions_selected: viewQuestions,
        resources_selected: viewResources,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Next-step selection logging failed: ${response.status}`,
          )
        }

        console.log('Next-step selections logged successfully')
      })
      .catch((error) => {
        console.error('Could not log next-step selections:', error)
      })

    // Record the participant's confirmed selections.
    setMessages((previous) => [
      ...previous,
      {
        from: 'system',
        event: 'next_steps_selected',
        questions_available: discussionQuestions.length > 0,
        questions_selected: viewQuestions,
        resources_selected: viewResources,
        timestamp: new Date().toISOString(),
      },
    ])

    setIsResponding(true)

    // Slide the selection panel away.
    setShowChatInput(false)

    try {
      await new Promise((resolve) => setTimeout(resolve, 800))

      setShowResourceChoice(false)

      // Alex introduces the selected resources.
      if (viewResources) {
        await introduceMaterials(
          'Alex',
          alexMaterialOverview,
          alexMaterialSpeechRef,
          () => setResourceChoice('yes'),
        )
      } else {
        setResourceChoice('no')
      }

      // The supportive role introduces the selected discussion questions.
      if (viewQuestions) {
        await introduceMaterials(
          conversationalSpeaker,
          jordanMaterialOverview,
          jordanMaterialSpeechRef,
          () => setShowDiscussionQuestions(true),
        )
      } else {
        setShowDiscussionQuestions(false)
      }
    } finally {
      setSelectedDelivery({
        questions: false,
        resources: false,
      })

      const hasViewedMaterials = viewQuestions || viewResources

      setShowDeliveryChoice(hasViewedMaterials)
      setShowSurveyButton(!hasViewedMaterials)
      setShowChatInput(hasViewedMaterials)

      setIsResponding(false)
    }
  }

  function handleDeliverySelection() {
    if (isResponding) return

    const sendQuestions = showDiscussionQuestions && selectedDelivery.questions

    const sendResources = resourceChoice === 'yes' && selectedDelivery.resources

    // Construct the message for manual delivery through Prolific.
    let prolificMessage = null

    if (sendQuestions || sendResources) {
      const messageSections = [
        'Hello!',
        'Thank you for participating in our research study. As requested, here are the materials from your conversation.',
      ]

      if (sendResources) {
        const resourceText = displayedResources
          .map(
            (resource, index) =>
              `${index + 1}. ${resource.title}\n` +
              `Source: National Cancer Institute (NCI)\n` +
              resource.url,
          )
          .join('\n\n')

        messageSections.push('More Information Resources\n\n' + resourceText)
      }

      if (sendQuestions) {
        const questionText = discussionQuestions
          .slice(0, 3)
          .map((question, index) => `${index + 1}. ${question}`)
          .join('\n\n')

        messageSections.push(
          'Questions to Discuss with Others\n\n' + questionText,
        )
      }

      messageSections.push(
        'Thank you again for your time!\n\nThe Research Team',
      )

      prolificMessage = messageSections.join('\n\n')
    }

    // Save delivery preferences and the formatted message.
    fetch(`${BASE_URL}/logs/log-material-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        participant_id: participantId,
        questions_requested: sendQuestions,
        resources_requested: sendResources,
        prolific_message: prolificMessage,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Material delivery logging failed: ${response.status}`,
          )
        }
        console.log('Material delivery preferences saved')
      })
      .catch((error) => {
        console.error('Could not log material delivery:', error)
      })

    // Log the participant's confirmed delivery preferences.
    setMessages((previous) => [
      ...previous,
      {
        from: 'system',
        event: 'material_delivery_selected',
        questions_requested: sendQuestions,
        resources_requested: sendResources,
        timestamp: new Date().toISOString(),
      },
    ])

    setShowDeliveryChoice(false)
    setShowChatInput(false)
    setShowSurveyButton(true)
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
            <div className="title-area">
              <img src={logo} className="logo" alt="Study logo" />
              <p>Understanding Clinical Trials</p>
            </div>

            <hr />
            <h1>Get Ready to Meet the Virtual Characters</h1>

            <div className="mi-start-information">
              <p>
                As you go through the conversation, feel free to think about
                your own experiences with cancer and what you would want to
                understand about clinical trials! You can draw on questions
                you've had in the past, questions you have now, or things you
                might want to discuss with others in the future.
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

      {started &&
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
              display: 'flex',
            }}
          >
            Skip Intro (Dev)
          </button>
        )}

      <div className="mi-root main-interaction1">
        <div className="tool-header">
          <img src={logo} className="logo" alt="Study logo" />
          <h2>Understanding Clinical Trials</h2>
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
              <div
                className="mi-shared-stage-background"
                style={{
                  backgroundImage: `url(${stageBackground})`,
                }}
              />

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
                !awaitingTopicElaboration &&
                completedAlexIntroTopic === topicState.current_topic_index && (
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
                  {resourceChoice === 'yes' &&
                    displayedResources.length > 0 && (
                      <div className="closing-materials closing-materials-alex">
                        <h3>More Information Resources</h3>

                        {displayedResources.map((resource) => (
                          <div
                            key={resource.id}
                            className="closing-material-card"
                          >
                            <FontAwesomeIcon icon={faFileLines} />

                            <div>
                              <strong>{resource.title}</strong>
                              <span className="resource-source">
                                National Cancer Institute (NCI)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  {condition === CONDITION_SINGLE_COMBINED &&
                    showDiscussionQuestions &&
                    discussionQuestions.length > 0 && (
                      <div className="closing-materials closing-materials-jordan">
                        <h3>Questions to Discuss with Others</h3>

                        {discussionQuestions
                          .slice(0, 3)
                          .map((question, index) => (
                            <div key={index} className="closing-material-card">
                              <FontAwesomeIcon icon={faCommentDots} />
                              <span>{question}</span>
                            </div>
                          ))}
                      </div>
                    )}

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

                    {condition === CONDITION_MULTIPLE &&
                      showDiscussionQuestions &&
                      discussionQuestions.length > 0 && (
                        <div className="closing-materials closing-materials-jordan">
                          <h3>Questions to Discuss with Others</h3>

                          {discussionQuestions
                            .slice(0, 3)
                            .map((question, index) => (
                              <div
                                key={index}
                                className="closing-material-card"
                              >
                                <FontAwesomeIcon icon={faCommentDots} />
                                <span>{question}</span>
                              </div>
                            ))}
                        </div>
                      )}

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
              {showDeliveryChoice ? (
                <div className="full-input-area">
                  <div className="next-step-selection">
                    <h3>
                      Would you like to receive a copy of these materials?
                    </h3>

                    <p>
                      Select the materials you would like to receive through
                      Prolific after the study.
                    </p>

                    <div className="next-step-options">
                      {resourceChoice === 'yes' && (
                        <button
                          type="button"
                          className={`next-step-card resources alex ${
                            selectedDelivery.resources ? 'selected' : ''
                          }`}
                          aria-pressed={selectedDelivery.resources}
                          onClick={() => {
                            if (!selectedDelivery.resources) {
                              playGesture('thumbsupDoctorQuick')
                            }

                            setSelectedDelivery((previous) => ({
                              ...previous,
                              resources: !previous.resources,
                            }))
                          }}
                        >
                          <FontAwesomeIcon
                            icon={
                              selectedDelivery.resources ? faCheck : faFileLines
                            }
                          />
                          <strong>
                            Send me Doctor Alex's information resources
                          </strong>
                        </button>
                      )}

                      {showDiscussionQuestions && (
                        <button
                          type="button"
                          className={`next-step-card resources jordan ${
                            selectedDelivery.questions ? 'selected' : ''
                          }`}
                          aria-pressed={selectedDelivery.questions}
                          onClick={() => {
                            if (!selectedDelivery.questions) {
                              playGesture(
                                isSingleAgent
                                  ? 'thumbsupDoctorQuick'
                                  : 'thumbsupQuick',
                              )
                            }

                            setSelectedDelivery((previous) => ({
                              ...previous,
                              questions: !previous.questions,
                            }))
                          }}
                        >
                          <FontAwesomeIcon
                            icon={
                              selectedDelivery.questions
                                ? faCheck
                                : faCommentDots
                            }
                          />
                          <strong>
                            Send me{' '}
                            {isSingleAgent ? "Doctor Alex's" : "Jordan's"}{' '}
                            discussion questions
                          </strong>
                        </button>
                      )}
                    </div>

                    <div className="closing-button-area">
                      <button
                        type="button"
                        className="cssbuttons-io-button"
                        disabled={
                          isResponding ||
                          (!selectedDelivery.questions &&
                            !selectedDelivery.resources)
                        }
                        onClick={handleDeliverySelection}
                      >
                        Finish Conversation
                        <span className="icon">
                          <FontAwesomeIcon icon={faArrowRight} size="xs" />
                        </span>
                      </button>

                      <button
                        type="button"
                        className="skip-delivery-link"
                        disabled={
                          isResponding ||
                          selectedDelivery.questions ||
                          selectedDelivery.resources
                        }
                        onClick={handleDeliverySelection}
                      >
                        Click here to continue without selecting anything
                      </button>
                    </div>
                  </div>
                </div>
              ) : showResourceChoice ? (
                <div className="full-input-area">
                  <div className="next-step-selection">
                    <h3
                      className={`closing-instructions ${showClosingInstructions ? 'revealed' : ''}`}
                    >
                      Would you like to view the materials prepared for you?
                    </h3>

                    <p
                      className={`closing-instructions ${showClosingInstructions ? 'revealed' : ''}`}
                    >
                      {condition === CONDITION_SINGLE_INFO
                        ? 'You can choose to view the resources or continue without viewing them.'
                        : 'You can select either option, both, or continue without viewing them.'}
                    </p>
                    <div className="next-step-options">
                      <button
                        type="button"
                        disabled={
                          isResponding ||
                          (condition !== CONDITION_SINGLE_INFO &&
                            suggestedResources.length === 0)
                        }
                        className={`next-step-card alex
                          ${selectedNextSteps.resources ? 'selected' : ''}
                          ${showResourceOption ? 'option-visible' : 'option-hidden'}
                        `}
                        aria-pressed={selectedNextSteps.resources}
                        onClick={() => {
                          if (!selectedNextSteps.resources) {
                            playGesture('thumbsupDoctorQuick')
                          }

                          setSelectedNextSteps((previous) => ({
                            ...previous,
                            resources: !previous.resources,
                          }))
                        }}
                      >
                        <FontAwesomeIcon
                          icon={
                            selectedNextSteps.resources ? faCheck : faFileLines
                          }
                        />

                        <strong>View More Information Resources</strong>

                        <small class="alex">
                          Prepared by <b>Doctor Alex</b>
                        </small>
                      </button>
                      {condition !== CONDITION_SINGLE_INFO && (
                        <button
                          type="button"
                          disabled={
                            isResponding || discussionQuestions.length === 0
                          }
                          className={`next-step-card jordan
                            ${selectedNextSteps.questions ? 'selected' : ''}
                            ${showDiscussionOption ? 'option-visible' : 'option-hidden'}
                          `}
                          aria-pressed={selectedNextSteps.questions}
                          onClick={() => {
                            if (!selectedNextSteps.questions) {
                              playGesture(
                                isSingleAgent
                                  ? 'thumbsupDoctorQuick'
                                  : 'thumbsupQuick',
                              )
                            }

                            setSelectedNextSteps((previous) => ({
                              ...previous,
                              questions: !previous.questions,
                            }))
                          }}
                        >
                          <FontAwesomeIcon
                            icon={
                              selectedNextSteps.questions
                                ? faCheck
                                : faCommentDots
                            }
                          />

                          <strong>View Questions to Discuss with Others</strong>

                          <small className="jordan">
                            Prepared by{' '}
                            <b>{isSingleAgent ? 'Doctor Alex' : 'Jordan'}</b>
                          </small>
                        </button>
                      )}
                    </div>

                    <div
                      className={`closing-button-area closing-instructions ${showClosingInstructions ? 'revealed' : ''}`}
                    >
                      <button
                        type="button"
                        className="cssbuttons-io-button"
                        disabled={
                          isResponding ||
                          (!selectedNextSteps.questions &&
                            !selectedNextSteps.resources)
                        }
                        onClick={handleNextStepSelection}
                      >
                        View
                        <span className="icon">
                          <FontAwesomeIcon icon={faArrowRight} size="xs" />
                        </span>
                      </button>

                      <button
                        type="button"
                        className="skip-delivery-link"
                        disabled={
                          isResponding ||
                          selectedNextSteps.questions ||
                          selectedNextSteps.resources
                        }
                        onClick={handleNextStepSelection}
                      >
                        Click here to continue without selecting anything
                      </button>
                    </div>
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
                    isOpening={
                      (condition === CONDITION_SINGLE_COMBINED ||
                        condition === CONDITION_MULTIPLE) &&
                      !openingResponseDone &&
                      !openingComplete
                    }
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
  isOpening,
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
                : isOpening
                  ? "Share what's important to you when making health-related decisions ..."
                  : awaitingTopicElaboration
                    ? 'Share your experiences and perspectives...'
                    : 'Type your message...'
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
