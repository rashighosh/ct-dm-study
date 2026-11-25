import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import '../css/IntroWalkthrough.css'
import logo from '../assets/logo-transparent.png'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import CompanionPreview from './CompanionPreview'
import {
  faCircleArrowLeft,
  faCircleArrowRight,
} from '@fortawesome/free-solid-svg-icons'

const INTRO_PAGES = {
  // CONDITION 1 — Baseline (Information Only)
  1: [
    {
      title: 'Understanding Clinical Trial Participation',
      description:
        'Considering clinical trials as a treatment option can raise many questions. This website is designed to help you learn more about clinical trial participation and explore information relevant to you.',
    },
    {
      title: 'Learning with a Virtual Character',
      description:
        "You'll interact with an AI-powered virtual character who provides information about clinical trial participation. You can ask questions in your own words to learn more about the topics presented.",
    },
    {
      title: 'The Conversation at a Glance',
      description:
        "First, the virtual character will introduce themselves and their role. Then, you'll explore topics related to clinical trial participation and have the opportunity to ask your own questions.",
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

export default function IntroWalkthrough() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [currentPage, setCurrentPage] = useState(0)
  const [isFading, setIsFading] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const condition = Number(searchParams.get('c') ?? 3)

  const introPages = INTRO_PAGES[condition] ?? INTRO_PAGES[3]
  const isLastPage = currentPage === introPages.length - 1
  function changePage(nextPage) {
    if (isTransitioning) return

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

  function handleNext() {
    if (isTransitioning) return

    if (isLastPage) {
      navigate({
        pathname: '/',
        search: searchParams.toString() ? `?${searchParams.toString()}` : '',
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
        {page.showCompanions && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '35px',
              margin: '20px 0',
            }}
          >
            <CompanionPreview model="/character-models/test.glb" body="M" />
          </div>
        )}
        <div className="intro-walkthrough-navigation">
          {currentPage > 0 && (
            <button type="button" onClick={handleBack}>
              <FontAwesomeIcon icon={faCircleArrowLeft} />
              &nbsp; Back
            </button>
          )}

          <button type="button" onClick={handleNext}>
            Continue &nbsp;
            <FontAwesomeIcon icon={faCircleArrowRight} />
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
