import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import '../css/IntroWalkthrough.css'
import logo from '../assets/logo-transparent.png'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCircleArrowLeft,
  faCircleArrowRight,
} from '@fortawesome/free-solid-svg-icons'

const INTRO_PAGES = [
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
]

export default function IntroWalkthrough() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [currentPage, setCurrentPage] = useState(0)
  const [isFading, setIsFading] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const page = INTRO_PAGES[currentPage]
  const isLastPage = currentPage === INTRO_PAGES.length - 1
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
        {INTRO_PAGES.map((_, index) => (
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
