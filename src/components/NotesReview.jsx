import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import '../css/NotesReview.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCheck,
  faArrowLeft,
  faArrowRight,
  faLink,
  faUserDoctor,
  faHeart,
} from '@fortawesome/free-solid-svg-icons'
import {
  initCompanionCharacter,
  initDoctorCharacter,
  speakWithLipsyncStatic,
} from '../character.js'
import logo from '../assets/logo-transparent.png'

export default function NotesReview() {
  const companionRef = useRef(null)
  const doctorRef = useRef(null)
  const navigate = useNavigate()
  const { state } = useLocation()

  const [showNotes, setShowNotes] = useState(false)
  const [showResourceCard, setShowResourceCard] = useState(false)
  const [speakingCharacter, setSpeakingCharacter] = useState(null)
  const [selectedResources, setSelectedResources] = useState([])
  const [showContinue, setShowContinue] = useState(false)
  const [audioReady, setAudioReady] = useState(false)
  const goalObjects = state?.goalObjects || []
  const goalLabels = state?.goalLabels || []
  const goalNotes = state?.goalNotes || {}
  const coveredGoals = new Set(state?.coveredGoals || [])

  useEffect(() => {
    if (!audioReady) return

    let cancelled = false

    async function runFarewell() {
      await new Promise((resolve) => setTimeout(resolve, 500))
      if (cancelled) return

      await initDoctorCharacter(doctorRef.current)
      await initCompanionCharacter(companionRef.current)

      setSpeakingCharacter('alex')

      await speakWithLipsyncStatic(
        '/intro-voices/doctor-alexEnding.mp3',
        '/intro-voices/doctor-alexEnding-timestamps.json',
        'doctor',
      )

      if (cancelled) return

      setSpeakingCharacter('jordan')

      setTimeout(() => setShowNotes(true), 1000)
      setTimeout(() => setShowResourceCard(true), 3000)

      await speakWithLipsyncStatic(
        '/intro-voices/companion-jordanEnding.mp3',
        '/intro-voices/companion-jordanEnding-timestamps.json',
        'companion',
      )

      setSpeakingCharacter(null)

      if (cancelled) return

      setShowContinue(true)
    }

    runFarewell().catch(console.error)

    return () => {
      cancelled = true
    }
  }, [audioReady])

  if (!audioReady) {
    return (
      <div className="start-overlay">
        <div className="start-overlay-content">
          <h2>One last thing!</h2>
          <p>Click below to enable audio for Dr. Alex and Jordan's farewell.</p>

          <button
            className="cssbuttons-io-button"
            onClick={() => setAudioReady(true)}
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  const notesPayload = goalObjects.map((goal) => ({
    id: goal.id,
    title: goal.title,
    covered: coveredGoals.has(goal.id),
    notes: (goalNotes[goal.id] || []).map((note) => note.text),
  }))

  const escapeHtml = (value) =>
    String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;')

  const goalNotesHtml = goalObjects
    .map((goal) => {
      const notes = goalNotes[goal.id] || []

      return `
      <div>
        <h3>${escapeHtml(goal.title)}</h3>
        ${
          notes.length > 0
            ? `<ul>${notes
                .map((note) => `<li>${escapeHtml(note.text)}</li>`)
                .join('')}</ul>`
            : `<p><em>No saved notes for this goal.</em></p>`
        }
      </div>
    `
    })
    .join('')

  const jordanResources = goalObjects
    .filter(
      (goal) => coveredGoals.has(goal.id) || goalNotes[goal.id]?.length > 0,
    )
    .map((goal) => ({
      id: `jordan-${goal.id}`,
      title: `Source links related to: ${goal.title}`,
      source: 'Suggested by Jordan',
      description:
        goalNotes[goal.id]?.[0]?.text ||
        'Based on one of the goals you explored with Dr. Alex.',
      url: '',
      type: 'jordan',
    }))

  const alexResources = [
    {
      id: 'clinicaltrials-gov',
      title: 'Search ClinicalTrials.gov',
      source: 'Recommended by Dr. Alex',
      description:
        'A public database where you can search for clinical studies.',
      url: 'https://clinicaltrials.gov/',
      type: 'alex',
    },
    {
      id: 'nci-clinical-trials-search',
      title: 'Browse NCI-supported cancer clinical trials',
      source: 'Recommended by Dr. Alex',
      description:
        'A National Cancer Institute page for finding cancer clinical trials.',
      url: 'https://www.cancer.gov/research/participate/clinical-trials-search',
      type: 'alex',
    },
  ]

  const allResources = [...jordanResources, ...alexResources]

  function toggleResource(id) {
    setSelectedResources((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    )
  }

  const selectedResourceObjects = allResources.filter((resource) =>
    selectedResources.includes(resource.id),
  )

  return (
    <main className="nr-root">
      <section className="nr-card fade-in-up">
        <div className="nr-header-text">
          <img src={logo} className="logo" alt="Study logo" />
          <h1>Thank you for learning with us!</h1>
          <p className="nr-page-instruction">
            Select any resources you’d like to receive (optional). They’ll be
            shared with you at the end of the post-survey. Then, click the
            'Continue to Post Survey' button in the top right corner.
          </p>
        </div>
        <div className="nr-characters-area">
          <div className="characters-area">
            <div className="nr-alex-area">
              <div
                className={`nr-avatar nr-avatar-alex ${
                  speakingCharacter === 'alex' ? 'nr-avatar-speaking' : ''
                } ${
                  speakingCharacter === 'jordan' ? 'nr-avatar-not-speaking' : ''
                }`}
              >
                <div
                  className="virtual-doctor"
                  id="virtualdoctor-review"
                  ref={doctorRef}
                />
              </div>
              {showResourceCard && (
                <div className="nr-resource-card">
                  <h2>Dr. Alex's recommended sources</h2>
                  <p>
                    These links provide next steps to start looking for clinical
                    trials!
                  </p>
                  <div className="nr-resource-list">
                    {alexResources.map((resource) => (
                      <button
                        key={resource.id}
                        type="button"
                        className={`nr-resource-option-alex ${
                          selectedResources.includes(resource.id)
                            ? 'nr-resource-option-selected-alex'
                            : ''
                        }`}
                        onClick={() => toggleResource(resource.id)}
                      >
                        <span className="nr-resource-icon nr-resource-icon-alex">
                          <FontAwesomeIcon icon={faUserDoctor} />
                        </span>

                        <span className="nr-resource-copy">
                          <strong>{resource.title}</strong>
                        </span>

                        {selectedResources.includes(resource.id) && (
                          <FontAwesomeIcon
                            className="nr-resource-check"
                            icon={faCheck}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="nr-jordan-area">
              <div
                className={`nr-avatar nr-avatar-jordan ${
                  speakingCharacter === 'jordan' ? 'nr-avatar-speaking' : ''
                } ${
                  speakingCharacter === 'alex' ? 'nr-avatar-not-speaking' : ''
                }`}
              >
                <div
                  className="virtual-companion"
                  id="virtualcompanion-review"
                  ref={companionRef}
                />
              </div>
              {showResourceCard && (
                <div className="nr-resource-card">
                  <h2>Jordan's sources based on your goals</h2>
                  <p>
                    These are links to resources Dr. Alex used during your
                    conversation to address your goals.
                  </p>

                  {jordanResources.length > 0 && (
                    <>
                      <div className="nr-resource-list">
                        {jordanResources.slice(0, 2).map((resource) => (
                          <button
                            key={resource.id}
                            type="button"
                            className={`nr-resource-option ${
                              selectedResources.includes(resource.id)
                                ? 'nr-resource-option-selected'
                                : ''
                            }`}
                            onClick={() => toggleResource(resource.id)}
                          >
                            <span className="nr-resource-icon nr-resource-icon-jordan">
                              <FontAwesomeIcon icon={faHeart} />
                            </span>

                            <span className="nr-resource-copy">
                              <strong>{resource.title}</strong>
                            </span>

                            {selectedResources.includes(resource.id) && (
                              <FontAwesomeIcon
                                className="nr-resource-check"
                                icon={faCheck}
                              />
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      {showContinue && (
        <button
          type="button"
          className="nr-continue-btn"
          onClick={() => {
            const encodedHtml = encodeURIComponent(
              JSON.stringify(
                goalNotesHtml.replace(/\n/g, '').replace(/\s{2,}/g, ' '),
              ),
            )
            const encodedResources = encodeURIComponent(
              JSON.stringify(selectedResourceObjects),
            )

            window.location.href =
              `https://ufl.qualtrics.com/jfe/form/SV_5d3HxZpa1fP1r2S` +
              `?selected_resources=${encodedResources}` +
              `&goal_notes_html=${encodedHtml}`
          }}
        >
          Continue to Post Survey
          <FontAwesomeIcon icon={faArrowRight} />
        </button>
      )}
    </main>
  )
}
