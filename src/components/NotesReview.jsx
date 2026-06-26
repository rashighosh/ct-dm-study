import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import '../css/NotesReview.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { initCompanionCharacter } from '../character.js'

export default function NotesReview() {
  const companionRef = useRef(null)
  const navigate = useNavigate()
  const { state } = useLocation()

  const goalLabels = state?.goalLabels || []
  const goalNotes = state?.goalNotes || {}
  const coveredGoals = new Set(state?.coveredGoals || [])

  useEffect(() => {
    initCompanionCharacter(companionRef.current)
  }, [])

  return (
    <main className="nr-root">
      <button className="nr-back-btn" onClick={() => navigate(-1)}>
        <FontAwesomeIcon icon={faArrowLeft} />
        Back
      </button>

      <section className="nr-card fade-in-up">
        <div className="nr-jordan-area">
          <div className="nr-jordan-avatar">
            <div
              className="virtual-companion"
              id="virtualcompanion-review"
              ref={companionRef}
            />
          </div>

          <div className="nr-header-text">
            <span className="nr-eyebrow">Jordan’s notes</span>
            <h1>Here’s what we covered</h1>
            <p>
              I kept track of your goals and saved notes from your conversation.
            </p>
          </div>
        </div>

        <div className="nr-notes-list">
          {goalLabels.map((label) => (
            <article
              key={label}
              className={`nr-goal-card ${
                coveredGoals.has(label) ? 'nr-goal-card-covered' : ''
              }`}
            >
              <div className="nr-goal-header">
                <h2>{label}</h2>

                {coveredGoals.has(label) && (
                  <span className="nr-covered-pill">
                    <FontAwesomeIcon icon={faCheck} />
                    Covered
                  </span>
                )}
              </div>

              {goalNotes[label]?.length > 0 ? (
                <div className="nr-notes">
                  {goalNotes[label].map((note) => (
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
      </section>
    </main>
  )
}
