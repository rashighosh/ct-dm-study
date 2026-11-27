import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import '../css/IntroWalkthrough.css'
import logo from '../assets/logo-transparent.png'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import alexImage from '../assets/character-images/alex.png'
import jordan1Image from '../assets/character-images/jordan1.png'
import jordan2Image from '../assets/character-images/jordan2.png'
import jordan3Image from '../assets/character-images/jordan3.png'
import jordan4Image from '../assets/character-images/jordan4.png'
import {
  faCircleArrowLeft,
  faCircleArrowRight,
} from '@fortawesome/free-solid-svg-icons'

const BASE_URL = 'http://127.0.0.1:8000'

const CONDITION_NAMES = {
  1: 'Single Info Only',
  2: 'Single Combined',
  3: 'Multiple',
}

const INTRO_PAGES = {
  // CONDITION 1 — Baseline (Information Only)
  // CONDITION 1 — Baseline (Information Only)
  1: [
    {
      title: 'Understanding Clinical Trial Participation',
      description:
        'Considering clinical trials as a treatment option can raise many questions. This website is designed to help you learn more about clinical trial participation.',
    },
    {
      title: 'Learning with a Virtual Character',
      description:
        "You'll interact with an AI-powered virtual character who provides information about clinical trial participation. You can ask questions in your own words to learn more about the topics presented.",
    },
    {
      title: 'The Conversation at a Glance',
      description:
        "First, the virtual character will introduce themselves and their role. Then, you'll explore three topics related to clinical trial participation. For each topic, you'll receive information and have the opportunity to ask your own questions.",
    },
    {
      title: 'The Virtual Information Guide',
      description:
        'The character you will interact with is your virtual information guide. This character is designed to draw from trusted medical sources curated by health communication experts to provide relevant, evidence-based information.',
      showInformationGuide: true,
    },
  ],

  // CONDITION 2 — Single Combined
  2: [
    {
      title: 'Information that Matters to You',
      description:
        'Considering clinical trials as a treatment option raises different questions for everyone. This website is designed to focus on what matters to you in order to provide information that addresses your needs, concerns, and priorities.',
    },
    {
      title: 'Talking it Through with a Virtual Character',
      description:
        "You'll interact with an AI-powered virtual character about what's on your mind regarding clinical trial participation. Sharing your perspectives and asking questions in your own words will help the virtual character find information that's relevant and useful for you.",
    },
    {
      title: 'The Conversation at a Glance',
      description:
        "First, the virtual character will introduce themselves and their role. Then, you'll share what's on your mind, and they'll suggest three topics for you to explore. For each topic, you can ask questions you'd like answered or just share your thoughts, concerns, and circumstances to help the character provide information that's relevant to you.",
    },
    {
      title: 'The Virtual Information Guide',
      description:
        'The character you will interact with is your virtual information guide. This character is designed to draw from trusted medical sources curated by health communication experts to provide relevant, evidence-based information. The character will also help you share your health-related perspectives and experiences so that you can play a role in shaping the direction of the conversation.',
      showInformationGuide: true,
    },
  ],

  // CONDITION 3 — Multiple Distributed
  3: [
    {
      title: 'Information that Matters to You',
      description:
        'Considering clinical trials as a treatment option raises different questions for everyone. This website is designed to focus on what matters to you in order to provide information that addresses your needs, concerns, and priorities.',
    },
    {
      title: 'Talking it Through with Virtual Characters',
      description:
        "You'll interact with AI-powered virtual characters about what's on your mind regarding clinical trial participation. Sharing your perspectives and asking questions in your own words will help the virtual characters find information that's relevant and useful for you.",
    },
    {
      title: 'The Conversation at a Glance',
      description:
        "First, the virtual characters will introduce themselves and their roles. Then, you'll share what's on your mind, and they'll suggest three topics for you to explore. For each topic, you can ask questions you'd like answered or just share your thoughts, concerns, and circumstances to help the characters provide information that's relevant to you.",
    },
    {
      title: 'The Virtual Information Guide',
      description:
        'One of the characters you will interact with is your virtual information guide. This character is designed to draw from trusted medical sources curated by health communication experts to provide relevant, evidence-based information.',
      showInformationGuide: true,
    },
    {
      title: 'The Virtual Companion',
      description:
        'The other character you will interact with is the virtual companion. This character is designed to help you share your health-related perspectives and experiences so that you can play a role in shaping the direction of the conversation. Since this character is focused on getting to know your needs, you can choose which virtual companion you would like below.',
      showCompanions: true,
    },
  ],
}

const COMPANION_OPTIONS = [
  { id: 'jordan1', image: jordan1Image },
  { id: 'jordan2', image: jordan2Image },
  { id: 'jordan3', image: jordan3Image },
  { id: 'jordan4', image: jordan4Image },
]

export default function IntroWalkthrough() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [currentPage, setCurrentPage] = useState(0)
  const [isFading, setIsFading] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [selectedCompanion, setSelectedCompanion] = useState(null)
  const [shuffledCompanions] = useState(() => {
    const shuffled = [...COMPANION_OPTIONS]

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    return shuffled
  })

  const condition = Number(searchParams.get('c') ?? 3)

  const participantId = searchParams.get('id') || 'navi-test'

  const entryLogPromiseRef = useRef(null)

  useEffect(() => {
    if (entryLogPromiseRef.current) return

    entryLogPromiseRef.current = fetch(
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
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Entry logging failed: ${response.status}`)
        }

        console.log('Conversation entry logged')
        return true
      })
      .catch((error) => {
        console.error('Could not log conversation entry:', error)
        entryLogPromiseRef.current = null
        return false
      })
  }, [participantId, condition])

  const introPages = INTRO_PAGES[condition] ?? INTRO_PAGES[3]
  const page = introPages[currentPage]
  const isLastPage = currentPage === introPages.length - 1
  const canContinue = !page.showCompanions || selectedCompanion !== null

  function changePage(nextPage) {
    if (isTransitioning || !canContinue) return

    setIsTransitioning(true)
    setIsFading(true)

    // Fade out the current page
    setTimeout(() => {
      setCurrentPage(nextPage)

      // Allow the new content to render before fading in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsFading(false)
          setIsTransitioning(false)
        })
      })
    }, 250)
  }

  async function handleNext() {
    if (isTransitioning || !canContinue) return

    if (isLastPage) {
      setIsTransitioning(true)

      const updatedParams = new URLSearchParams(searchParams)

      if (condition === 3 && selectedCompanion) {
        updatedParams.set('companion', selectedCompanion)

        try {
          const entryLogged = await entryLogPromiseRef.current

          if (!entryLogged) {
            throw new Error('Participant entry was not logged')
          }

          const response = await fetch(
            `${BASE_URL}/logs/log-companion-selected`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                participant_id: participantId,
                selected_companion: selectedCompanion,
              }),
            },
          )

          if (!response.ok) {
            throw new Error(`Companion logging failed: ${response.status}`)
          }

          console.log('Companion selection logged:', selectedCompanion)
        } catch (error) {
          console.error('Could not log companion selection:', error)
        }
      }

      navigate({
        pathname: '/',
        search: updatedParams.toString() ? `?${updatedParams.toString()}` : '',
      })
    } else {
      changePage(currentPage + 1)
    }
  }

  function handleBack() {
    if (currentPage > 0) {
      changePage(currentPage - 1)
    }
  }

  return (
    <div className="intro-walkthrough">
      <div
        className={`intro-walkthrough-content ${isFading ? 'fade-out' : ''}`}
      >
        <div className="title-area">
          <img src={logo} className="logo" alt="Study logo" />
          <p>Understanding Clinical Trials</p>
        </div>
        <hr />
        <h1>{page.title}</h1>
        <p className="description">{page.description}</p>
        {page.showInformationGuide && (
          <div className="character-preview-container">
            <img
              src={alexImage}
              alt="Virtual information guide"
              className="character-preview-image"
            />
          </div>
        )}

        {page.showCompanions && (
          <div className="character-preview-container">
            {shuffledCompanions.map((companion, index) => (
              <button
                key={companion.id}
                type="button"
                className={`companion-option ${
                  selectedCompanion === companion.id ? 'selected' : ''
                }`}
                onClick={() => setSelectedCompanion(companion.id)}
                aria-pressed={selectedCompanion === companion.id}
                aria-label={`Select virtual companion ${index + 1}`}
              >
                <img
                  src={companion.image}
                  alt={`Virtual companion ${index + 1}`}
                  className="character-preview-image"
                />
              </button>
            ))}
          </div>
        )}
        <div className="intro-walkthrough-navigation">
          {currentPage > 0 && (
            <button type="button" onClick={handleBack}>
              <FontAwesomeIcon icon={faCircleArrowLeft} />
              &nbsp; Back
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={!canContinue || isTransitioning}
          >
            {canContinue ? 'Continue' : 'Please select a character'}
            {canContinue && (
              <>
                &nbsp;
                <FontAwesomeIcon icon={faCircleArrowRight} />
              </>
            )}
          </button>
        </div>
      </div>

      <div className="intro-walkthrough-progress">
        {introPages.map((_, index) => (
          <span
            key={index}
            className={
              index === currentPage ? 'progress-dot active' : 'progress-dot'
            }
          />
        ))}
      </div>
    </div>
  )
}
