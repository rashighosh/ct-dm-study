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
  faPenToSquare,
} from '@fortawesome/free-solid-svg-icons'
import {
  initCompanionCharacter,
  initDoctorCharacter,
  speakWithLipsyncStatic,
} from '../character.js'
import logo from '../assets/logo-transparent.png'
import { logNotesReview } from '../api/logging.js'

export default function NotesReview() {
  const companionRef = useRef(null)
  const doctorRef = useRef(null)
  const navigate = useNavigate()
  const { state } = useLocation()

  const [selectedGoalCards, setSelectedGoalCards] = useState([])
  const [showResourceCard, setShowResourceCard] = useState(false)
  const [speakingCharacter, setSpeakingCharacter] = useState(null)
  const [selectedResources, setSelectedResources] = useState([])
  const [showContinue, setShowContinue] = useState(false)
  const [audioReady, setAudioReady] = useState(false)
  const goalObjects = state?.goalObjects || []
  const goalLabels = state?.goalLabels || []
  const goalNotes = state?.goalNotes || {}
  const coveredGoals = new Set(state?.coveredGoals || [])
  const proactivity = state?.proactivity || 'collaborative'
  const condition = state?.condition || ''
  const participantId = state?.participantId || 'test-id'

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

  const noteReviewItems = goalObjects.map((goal) => ({
    id: goal.id,
    title: goal.title,
    covered: coveredGoals.has(goal.id),
    notes: goalNotes[goal.id] || [],
  }))

  const noteResources = noteReviewItems.flatMap((goal) =>
    goal.notes.flatMap((note) =>
      (note.sources || []).map((source, index) => ({
        id: `${goal.id}-${note.id}-${source.id || index}`,
        goalId: goal.id,
        goalTitle: goal.title,
        noteId: note.id,
        noteText: note.text,
        title: source.title || source.source || source.file || 'Trusted source',
        source: source.source || null,
        file: source.file || null,
        url: source.url || null,
        content: source.content || null,
        relevance_explanation: source.relevance_explanation || null,
        type: 'note-source',
      })),
    ),
  )

  const alexResources = [
    {
      id: 'clinicaltrials-gov',
      title: 'Browse clinical trials',
      notes: [
        {
          id: 'clinicaltrials-gov-note',
          text: 'A public database where you can search for clinical trials.',
          sources: [
            {
              id: 'clinicaltrials-gov-source',
              title: 'ClinicalTrials.gov',
              url: 'https://clinicaltrials.gov/',
            },
          ],
        },
      ],
      type: 'alex',
    },
    {
      id: 'nci-clinical-trials-search',
      title: 'Browse cancer clinical trials',
      notes: [
        {
          id: 'nci-clinical-trials-search-note',
          text: 'A National Cancer Institute page where you can search for cancer clinical trials.',
          sources: [
            {
              id: 'nci-clinical-trials-search-source',
              title: 'NCI-supported cancer clinical trials',
              url: 'https://www.cancer.gov/research/participate/clinical-trials-search',
            },
          ],
        },
      ],
      type: 'alex',
    },
  ]

  const allResources = [...noteResources, ...alexResources]

  const selectedNoteObjects = noteReviewItems.filter((goal) =>
    selectedGoalCards.includes(goal.id),
  )

  function toggleGoalCard(goalId) {
    setSelectedGoalCards((prev) =>
      prev.includes(goalId)
        ? prev.filter((id) => id !== goalId)
        : [...prev, goalId],
    )
  }

  function toggleAlexResource(resourceId) {
    setSelectedResources((prev) =>
      prev.includes(resourceId)
        ? prev.filter((id) => id !== resourceId)
        : [...prev, resourceId],
    )
  }

  const notesTitle =
    proactivity === 'active'
      ? 'Your conversation notes'
      : "Jordan's notes from your goals"

  const notesDescription =
    proactivity === 'active'
      ? "These are the notes you saved while talking with Dr. Alex. Choose any notes you'd like to receive, along with their attached sources."
      : "Jordan saved these notes based on the goals you explored with Alex. Choose any notes you'd like to receive, along with their attached sources."

  const selectedResourceObjects = alexResources.filter((resource) =>
    selectedResources.includes(resource.id),
  )

  async function handleContinueToPostSurvey() {
    try {
      await logNotesReview(
        state?.participantId,
        selectedNoteObjects,
        selectedResourceObjects,
        noteReviewItems,
        alexResources,
      )

      window.location.href =
        `https://ufl.qualtrics.com/jfe/form/SV_5d3HxZpa1fP1r2S` +
        `?id=${encodeURIComponent(participantId)}` +
        `&c=${encodeURIComponent(condition)}`
    } catch (err) {
      console.error(err)
    }
  }

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
                  <div className="nr-notes-review-list">
                    {alexResources.map((resource) => {
                      const selected = selectedResources.includes(resource.id)

                      return (
                        <button
                          key={resource.id}
                          type="button"
                          className={`nr-goal-card nr-goal-card-selectable nr-goal-card-selectable-alex ${
                            selected
                              ? 'nr-goal-card-selected nr-goal-card-selected-alex'
                              : ''
                          }`}
                          onClick={() => toggleAlexResource(resource.id)}
                        >
                          <div className="nr-goal-header">
                            <h2>{resource.title}</h2>

                            <span
                              className={`nr-select-checkbox ${
                                selected
                                  ? 'nr-select-checkbox-checked nr-select-checkbox-alex'
                                  : ''
                              }`}
                            >
                              {selected && <FontAwesomeIcon icon={faCheck} />}
                            </span>
                          </div>

                          <div className="nr-notes">
                            {resource.notes.map((note) => (
                              <div key={note.id} className="nr-note">
                                <div className="nr-goal-note-header">
                                  <FontAwesomeIcon icon={faPenToSquare} />
                                  <span>Note:</span>
                                </div>

                                <p>{note.text}</p>

                                <div className="nr-note-source-list">
                                  <div className="nr-goal-note-header">
                                    <FontAwesomeIcon icon={faLink} />
                                    <span>Source Included:</span>
                                  </div>

                                  <div className="nr-note-sources">
                                    {note.sources.map((source) => (
                                      <div
                                        key={source.id}
                                        className="nr-note-source"
                                      >
                                        <span>{source.title}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </button>
                      )
                    })}
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
                  <h2>{notesTitle}</h2>
                  <p>{notesDescription}</p>

                  <div className="nr-notes-review-list">
                    {noteReviewItems.map((goal) => {
                      const selected = selectedGoalCards.includes(goal.id)

                      return (
                        <button
                          key={goal.id}
                          type="button"
                          className={`nr-goal-card nr-goal-card-selectable nr-goal-card-selectable-jordan ${selected ? 'nr-goal-card-selected' : ''}`}
                          onClick={() => toggleGoalCard(goal.id)}
                        >
                          <div className="nr-goal-header">
                            <h2>{goal.title}</h2>

                            <span
                              className={`nr-select-checkbox ${
                                selected ? 'nr-select-checkbox-checked' : ''
                              }`}
                            >
                              {selected && <FontAwesomeIcon icon={faCheck} />}
                            </span>
                          </div>

                          {goal.notes.length > 0 ? (
                            <div className="nr-notes">
                              {goal.notes.map((note) => (
                                <div key={note.id} className="nr-note">
                                  <div className="nr-goal-note-header">
                                    <FontAwesomeIcon icon={faPenToSquare} />{' '}
                                    <span>Note:</span>
                                  </div>
                                  <p>{note.text}</p>
                                  <div className="nr-note-source-list">
                                    <div className="nr-goal-note-header">
                                      <FontAwesomeIcon icon={faLink} />{' '}
                                      <span>Sources Included:</span>
                                    </div>
                                    {note.sources?.length > 0 && (
                                      <div className="nr-note-sources">
                                        {note.sources.map((source, index) => (
                                          <div
                                            key={`${goal.id}-${note.id}-${source.id || index}`}
                                            className="nr-note-source"
                                          >
                                            <span>
                                              {source.title ||
                                                source.source ||
                                                source.file ||
                                                `Source ${index + 1}`}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="nr-empty-note">
                              No notes were saved for this goal.
                            </p>
                          )}
                        </button>
                      )
                    })}
                  </div>
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
          onClick={handleContinueToPostSurvey}
        >
          Continue to Post Survey
          <FontAwesomeIcon icon={faArrowRight} />
        </button>
      )}
    </main>
  )
}
