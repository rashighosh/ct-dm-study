import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import '../css/NotesReview.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCheck,
  faArrowLeft,
  faArrowRight,
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
  const [resourcesRequested, setResourcesRequested] = useState(null)
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

  return (
    <main className="nr-root">
      <section className="nr-card fade-in-up">
        <div className="nr-header-text">
          <img src={logo} className="logo" alt="Study logo" />
          <h1>Thank you learning with us!</h1>
        </div>
        <div className="nr-jordan-area">
          <div className="characters-area">
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

            <div
              className={`nr-avatar nr-avatar-jordan ${
                speakingCharacter === 'jordan' ? 'nr-avatar-speaking' : ''
              } ${
                speakingCharacter === 'alex' ? 'nr-avatar-not-speaking' : ''
              }`}
            >
              {showResourceCard && (
                <div className="nr-resource-card">
                  <p>Would you like me to send the notes to the post-survey?</p>

                  <div className="nr-resource-actions">
                    <button
                      type="button"
                      className={`nr-choice-btn ${
                        resourcesRequested === true
                          ? 'nr-choice-btn-selected'
                          : ''
                      }`}
                      onClick={() => {
                        ;(setResourcesRequested(true),
                          setSpeakingCharacter(null))
                      }}
                    >
                      <FontAwesomeIcon icon={faCheck} />
                      Yes
                    </button>

                    <button
                      type="button"
                      className={`nr-choice-btn ${
                        resourcesRequested === false
                          ? 'nr-choice-btn-selected'
                          : ''
                      }`}
                      onClick={() => {
                        ;(setResourcesRequested(false),
                          setSpeakingCharacter(null))
                      }}
                    >
                      No thanks
                    </button>
                  </div>
                </div>
              )}
              <div
                className="virtual-companion"
                id="virtualcompanion-review"
                ref={companionRef}
              />
            </div>
          </div>

          {showContinue && resourcesRequested !== null && (
            <button
              type="button"
              className="nr-continue-btn"
              onClick={() => {
                const encodedHtml = encodeURIComponent(
                  JSON.stringify(
                    goalNotesHtml.replace(/\n/g, '').replace(/\s{2,}/g, ' '),
                  ),
                )

                window.location.href =
                  `https://ufl.qualtrics.com/jfe/form/SV_5d3HxZpa1fP1r2S` +
                  `?send_notes=${resourcesRequested}` +
                  `&goal_notes_html=${encodedHtml}`
              }}
            >
              Continue to Post Survey
              <FontAwesomeIcon icon={faArrowRight} />
            </button>
          )}
        </div>

        <div
          className={`nr-notes-shell ${showNotes ? 'nr-notes-shell-visible' : ''}`}
        >
          <div className="nr-notes-list">
            {goalObjects.map((goal) => (
              <article
                key={goal.id}
                className={`nr-goal-card ${
                  coveredGoals.has(goal.id) ? 'nr-goal-card-covered' : ''
                }`}
              >
                <div className="nr-goal-header">
                  <h2>{goal.title}</h2>

                  {coveredGoals.has(goal.id) && (
                    <span className="nr-covered-pill">
                      <FontAwesomeIcon icon={faCheck} />
                      Covered
                    </span>
                  )}
                </div>

                {goalNotes[goal.id]?.length > 0 ? (
                  <div className="nr-notes">
                    {goalNotes[goal.id].map((note) => (
                      <p key={note.id} className="nr-note">
                        {note.text}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="nr-empty-note">
                    No saved notes for this goal yet.
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
