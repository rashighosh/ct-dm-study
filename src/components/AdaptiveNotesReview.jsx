import { useLocation } from 'react-router'
import { useState } from 'react'
import '../css/AdaptiveNotesReview.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowRight,
  faBookmark,
  faDownload,
  faLightbulb,
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
  const isSingleCharacter = Number(condition) === 6

  const savedResources = state?.savedResources || []
  const mentalModel = state?.mentalModel || ''
  const openQuestions = state?.openQuestions || []

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
              Take a moment to review the big-picture understanding developed
              during your conversation and any sources you saved. You may need
              to scroll to see all the content.{' '}
              <strong>
                You can print this summary or save it as a PDF using the button
                below.
              </strong>{' '}
              When you are finished,{' '}
              <strong>
                <em>
                  click the button at the bottom of the page to continue to the
                  post survey.
                </em>
              </strong>
            </p>

            <button
              type="button"
              className="print-button"
              onClick={handlePrintSummary}
            >
              <FontAwesomeIcon icon={faDownload} />
              Print PDF
            </button>
          </div>

          <div
            className={`review-area ${
              isSingleCharacter ? 'single-character' : ''
            }`}
          >
            <section className="notes-review-section">
              <img
                src={alex}
                className="virtual-character"
                alt="Alex character"
              />

              <div className="notes-review-section-header sources">
                <FontAwesomeIcon icon={faBookmark} />
                <h2>Saved Sources</h2>
              </div>

              <div className="notes-review-resources">
                {savedResources.length > 0 ? (
                  savedResources.map((resource, index) => {
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
                            {resource.source && (
                              <span className="label">
                                Source:{' '}
                                <span className="detail">
                                  {resource.source}
                                </span>
                              </span>
                            )}

                            <span className="resource-title">
                              {resourceTitle}
                            </span>
                          </div>

                          {resource.url && (
                            <a
                              className="resource-url"
                              href={resource.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {resource.url}
                            </a>
                          )}
                        </div>
                      </article>
                    )
                  })
                ) : (
                  <article className="notes-review-resource notes-review-empty">
                    <FontAwesomeIcon icon={faBookmark} />

                    <div className="resource-details">
                      <span className="resource-title">
                        You did not save any sources during this conversation.
                      </span>

                      <span className="resource-url">
                        Alex’s saved sources would appear here.
                      </span>
                    </div>
                  </article>
                )}
              </div>
              {isSingleCharacter && (
                <>
                  <div className="notes-review-section-header notes">
                    <FontAwesomeIcon icon={faLightbulb} />
                    <h2>Your Big-Picture Understanding</h2>
                  </div>

                  <div className="notes-review-jordan-content">
                    {mentalModel ? (
                      <article className="notes-review-theme">
                        <div className="resource-details-theme">
                          <FontAwesomeIcon icon={faLightbulb} />

                          <div className="resource-details-header">
                            <p className="notes-review-theme-summary">
                              {mentalModel}
                            </p>
                          </div>
                        </div>
                      </article>
                    ) : (
                      <article className="notes-review-theme notes-review-empty">
                        <div className="resource-details-theme">
                          <FontAwesomeIcon icon={faLightbulb} />

                          <div className="resource-details-header">
                            <p className="notes-review-theme-summary">
                              A big-picture understanding was not created during
                              this conversation.
                            </p>
                          </div>
                        </div>
                      </article>
                    )}

                    {openQuestions.length > 0 && (
                      <section className="notes-review-open-questions">
                        <h3>Still to Confirm</h3>

                        <p>
                          These questions could not be answered using the
                          available general information and may depend on a
                          specific trial or individual situation.
                        </p>

                        <ul>
                          {openQuestions.map((question, index) => (
                            <li key={`${question}-${index}`}>{question}</li>
                          ))}
                        </ul>
                      </section>
                    )}
                  </div>
                </>
              )}
            </section>

            {!isSingleCharacter && (
              <section className="notes-review-section">
                <img
                  src={jordan}
                  className="virtual-character"
                  alt="Jordan character"
                />

                <div className="notes-review-section-header notes">
                  <FontAwesomeIcon icon={faLightbulb} />
                  <h2>Your Big-Picture Understanding</h2>
                </div>

                <div className="notes-review-jordan-content">
                  {mentalModel ? (
                    <article className="notes-review-theme">
                      <div className="resource-details-theme">
                        <FontAwesomeIcon icon={faLightbulb} />

                        <div className="resource-details-header">
                          <p className="notes-review-theme-summary">
                            {mentalModel}
                          </p>
                        </div>
                      </div>
                    </article>
                  ) : (
                    <article className="notes-review-theme notes-review-empty">
                      <div className="resource-details-theme">
                        <FontAwesomeIcon icon={faLightbulb} />

                        <div className="resource-details-header">
                          <p className="notes-review-theme-summary">
                            A big-picture understanding was not created during
                            this conversation.
                          </p>
                        </div>
                      </div>
                    </article>
                  )}

                  {openQuestions.length > 0 && (
                    <section className="notes-review-open-questions">
                      <h3>Still to Confirm</h3>

                      <p>
                        These questions could not be answered using the
                        available general information and may depend on a
                        specific trial or individual situation.
                      </p>

                      <ul>
                        {openQuestions.map((question, index) => (
                          <li key={`${question}-${index}`}>{question}</li>
                        ))}
                      </ul>
                    </section>
                  )}
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
          {isContinuing ? 'Continuing...' : 'Continue to Post Survey'}

          <span className="icon">
            <FontAwesomeIcon icon={faArrowRight} size="xs" />
          </span>
        </button>
      </div>
    </main>
  )
}
