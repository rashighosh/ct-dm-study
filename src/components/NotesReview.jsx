import { useLocation } from 'react-router'
import { useState } from 'react'
import '../css/NotesReview.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowRight,
  faBookmark,
  faPenToSquare,
  faDownload,
} from '@fortawesome/free-solid-svg-icons'
import logo from '../assets/logo-transparent.png'
import alex from '../assets/alex.png'
import jordan from '../assets/jordan.png'
import { logSummaryRequest } from '../api/logging'

export default function NotesReview() {
  const { state } = useLocation()
  const [isContinuing, setIsContinuing] = useState(false)

  const participantId = state?.participantId || 'test-id'
  const condition = state?.condition ?? ''

  const savedResources = state?.savedResources || []

  const jordanConversationModel = state?.jordanConversationModel || {
    themes: [],
    latestConnection: null,
  }

  console.log('CONDITION IS', condition)

  const jordanThemes = jordanConversationModel.themes || []

  async function handlePrintSummary() {
    try {
      const result = await logSummaryRequest(participantId, true)

      if (!result.ok) {
        console.error('Could not log summary print:', result.error)
      }
    } catch (error) {
      console.error('Could not log summary print:', error)
    }

    window.print()
  }

  async function handleContinueToPostSurvey() {
    if (isContinuing) return

    setIsContinuing(true)

    window.location.href =
      `https://ufl.qualtrics.com/jfe/form/SV_1YA3FWgZ1TQuNIa` +
      `?id=${encodeURIComponent(participantId)}` +
      `&c=${encodeURIComponent(condition)}`
  }

  return (
    <main className="start-overlay">
      <div className="start-overlay-content notes-review-content">
        <div className="information-notes">
          <div className="header">
            <img src={logo} className="logo" alt="Study logo" />
            <h1>Summary</h1>
            <p>
              Take a moment to review the information you saved and the ideas
              organized during your conversation (you may have to scroll to see
              all the content).{' '}
              <strong>
                You can print this summary or save it as a PDF using the button
                below.
              </strong>{' '}
              When you're finished with this page, please{' '}
              <strong>
                <em>
                  click the button at the bottom of the page to continue to the
                  post survey.
                </em>
              </strong>
            </p>
            <p></p>
            <button
              type="button"
              className="print-button"
              onClick={handlePrintSummary}
            >
              <FontAwesomeIcon icon={faDownload} />
              Print PDF
            </button>
          </div>

          {condition !== 2 && (
            <img
              src={alex}
              className="virtual-character"
              alt="alex character"
            />
          )}

          <div className="review-area">
            {savedResources.length > 0 && (
              <section
                className={`notes-review-section ${condition === 0 ? 'single-character' : ''}`}
              >
                {condition === 2 && (
                  <img
                    src={alex}
                    className="virtual-character"
                    alt="alex character"
                  />
                )}

                <div className="notes-review-section-header sources">
                  <FontAwesomeIcon icon={faBookmark} />
                  <h2>Saved Sources</h2>
                </div>

                <div className="notes-review-resources">
                  {savedResources.map((resource, index) => {
                    const resourceKey =
                      resource.url ||
                      resource.title ||
                      resource.file ||
                      `saved-resource-${index}`

                    const resourceTitle =
                      resource.title ||
                      resource.file ||
                      resource.source ||
                      'Saved source'

                    return (
                      <article
                        className="notes-review-resource"
                        key={resourceKey}
                      >
                        <FontAwesomeIcon icon={faBookmark} />
                        <div className="resource-details">
                          <div className="section-area">
                            <span className="label">
                              Source:{' '}
                              {resource.source && (
                                <span className="detail">
                                  {resource.source}
                                </span>
                              )}
                            </span>

                            <span className="resource-title">
                              {resourceTitle}
                            </span>
                          </div>

                          {resource.url && (
                            <span className="resource-url">{resource.url}</span>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            )}

            {jordanThemes.length > 0 && (
              <section className="notes-review-section">
                {condition === 2 && (
                  <img
                    src={jordan}
                    className="virtual-character"
                    alt="jordan character"
                  />
                )}

                <div className="notes-review-section-header notes">
                  <FontAwesomeIcon icon={faPenToSquare} />
                  <h2>Notes From Your Exploration</h2>
                </div>

                <div className="notes-review-themes">
                  {jordanThemes.map((theme) => (
                    <article className="notes-review-theme" key={theme.id}>
                      <div className="resource-details-theme">
                        <FontAwesomeIcon icon={faPenToSquare} />

                        <div className="resource-details-header">
                          <h3>{theme.label}</h3>

                          {theme.summary && (
                            <p className="notes-review-theme-summary">
                              {theme.summary}
                            </p>
                          )}
                        </div>
                      </div>
                      {theme.details?.length > 0 && (
                        <ul className="notes-review-details">
                          {theme.details.map((detail) => (
                            <li key={detail.id}>{detail.text}</li>
                          ))}
                        </ul>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
        <button
          type="button"
          className="cssbuttons-io-button"
          onClick={handleContinueToPostSurvey}
          disabled={isContinuing}
        >
          {isContinuing ? 'Saving...' : 'Continue to Post Survey'}

          <span className="icon">
            <FontAwesomeIcon icon={faArrowRight} size="xs" />
          </span>
        </button>
      </div>
    </main>
  )
}
