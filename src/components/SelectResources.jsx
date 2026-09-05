import React, { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import logo from '../assets/logo-transparent.png'
import '../css/SelectResources.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCheck,
  faArrowRight,
  faFlask,
  faPeopleGroup,
  faFileLines,
  faCircleQuestion,
  faClipboardList,
  faBookOpen,
  faHeadset,
  faMagnifyingGlass,
} from '@fortawesome/free-solid-svg-icons'

const BASE_URL = 'http://127.0.0.1:8000'
// const BASE_URL =
//   'https://7bnfepvywhuc3ip5onitak3se40hivzn.lambda-url.us-east-1.on.aws'

const RESOURCES = [
  {
    id: 'featured-trials',
    title: 'See examples of real clinical trials',
    description:
      'Explore featured clincal trials from the National Cancer Institute.',
    url: 'https://www.cancer.gov/research/infrastructure/clinical-trials/featured',
    icon: faFlask,
  },
  {
    id: 'personal-stories',
    title: 'Read personal stories',
    description:
      'Hear about experiences from people who have participated in cancer research.',
    url: 'https://www.cancer.gov/research/participate/stories',
    icon: faPeopleGroup,
  },
  {
    id: 'sample-consent',
    title: 'See a sample consent form',
    description:
      'See the kind of information participants may receive before deciding whether to join a study.',
    url: 'https://www.cancer.gov/research/participate/articles/sample-informed-consent-form',
    icon: faFileLines,
  },
  {
    id: 'questions-to-ask',
    title: 'See questions you could ask',
    description:
      'Review questions you may want to ask a doctor or research team about a clinical trial.',
    url: 'https://www.cancer.gov/research/participate/clinical-trials/why-participate#questions-to-ask-before-joining-a-clinical-trial',
    icon: faCircleQuestion,
  },
  {
    id: 'details-checklist',
    title: 'Get ready to look for a trial',
    description:
      'See what information about your cancer may be useful when looking for clinical trials.',
    url: 'https://www.cancer.gov/research/participate/clinical-trials-search/steps/detailschecklist.pdf',
    icon: faClipboardList,
  },
  {
    id: 'finding-guide',
    title: 'Learn how to find clinical trials',
    description:
      'Read a step-by-step guide to finding clinical trials from the National Cancer Institute.',
    url: 'https://www.cancer.gov/research/participate/clinical-trials-search/help',
    icon: faBookOpen,
  },
  {
    id: 'nci-specialist',
    title: 'Talk with an NCI specialist',
    description:
      'Get help and cancer information from a trained National Cancer Institute specialist.',
    url: 'https://www.cancer.gov/contact',
    icon: faHeadset,
  },
  {
    id: 'trial-search',
    title: 'Search for clinical trials',
    description:
      'Search the National Cancer Institute database for cancer clinical trials.',
    url: 'https://www.cancer.gov/research/participate/clinical-trials-search',
    icon: faMagnifyingGlass,
  },
]

export default function SelectResources() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const participantId =
    searchParams.get('id') ||
    searchParams.get('PROLIFIC_PID') ||
    'test-participant'

  const condition = Number(searchParams.get('c') ?? 0)

  const [selectedResources, setSelectedResources] = useState([])
  const [saving, setSaving] = useState(false)

  const selectedResourceObjects = useMemo(
    () =>
      RESOURCES.filter((resource) => selectedResources.includes(resource.id)),
    [selectedResources],
  )

  const handleResourceClick = (resourceId) => {
    setSelectedResources((prev) =>
      prev.includes(resourceId)
        ? prev.filter((id) => id !== resourceId)
        : [...prev, resourceId],
    )
  }

  const handleContinue = async () => {
    if (saving) return

    try {
      setSaving(true)

      // 1. Save selected resources
      const resourcesResponse = await fetch(
        `${BASE_URL}/logs/log-selected-resources`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            participant_id: participantId,
            selected_resources: selectedResources,
          }),
        },
      )

      if (!resourcesResponse.ok) {
        throw new Error(
          `Selected resources logging failed: ${resourcesResponse.status}`,
        )
      }

      const resourcesData = await resourcesResponse.json()
      console.log('Selected resources logged:', resourcesData)

      // 2. Log completion of the website
      const finishResponse = await fetch(`${BASE_URL}/logs/log-finished`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participant_id: participantId,
        }),
      })

      if (!finishResponse.ok) {
        throw new Error(
          `Website finish logging failed: ${finishResponse.status}`,
        )
      }

      const finishData = await finishResponse.json()
      console.log('Website finished logged:', finishData)

      // 3. TODO: redirect to post-study survey
      // window.location.href = 'YOUR_POST_SURVEY_URL'
    } catch (error) {
      console.error('Could not finish resource selection:', error)
      setSaving(false)
    }
  }

  return (
    <div className="select-resources-page">
      <div className="select-resources-logo-header">
        <img src={logo} className="logo" alt="Study logo" />
        <h2>Clinical Trials Education</h2>
        <h1>Next Steps & Resources</h1>
      </div>

      <main className="select-resources-container">
        <header className="select-resources-header">
          <h2>What would you like to explore next?</h2>
          <p>
            Now that you've learned about clinical trials with the virtual
            character(s),{' '}
            <b>
              please indicate which resources, if any, you would feel ready or
              interested to explore on your own
            </b>
            . Links to the resources you select will be provided in the
            post-study survey so you can save them and return to them later.
          </p>
        </header>

        <div className="select-resources-grid">
          {RESOURCES.map((resource) => {
            const isSelected = selectedResources.includes(resource.id)

            return (
              <button
                key={resource.id}
                type="button"
                className={`resource-option ${
                  isSelected ? 'resource-option-selected' : ''
                }`}
                onClick={() => handleResourceClick(resource.id)}
                aria-pressed={isSelected}
              >
                <span
                  className={`resource-checkbox ${
                    isSelected ? 'resource-checkbox-selected' : ''
                  }`}
                  aria-hidden="true"
                >
                  {isSelected ? (
                    <FontAwesomeIcon icon={faCheck} />
                  ) : (
                    <FontAwesomeIcon icon={resource.icon} />
                  )}
                </span>

                <span className="resource-option-content">
                  <span className="resource-option-title">
                    {resource.title}
                  </span>
                  <span className="resource-option-description">
                    {resource.description}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        <footer className="select-resources-footer">
          <span className="select-resources-selection-summary">
            {selectedResources.length === 0 ? (
              'No resources selected'
            ) : (
              <>
                <strong>{selectedResources.length}</strong>{' '}
                {selectedResources.length === 1
                  ? 'resource selected'
                  : 'resources selected'}
              </>
            )}
          </span>

          <button
            type="button"
            className="cssbuttons-io-button"
            onClick={handleContinue}
            disabled={saving}
          >
            {saving ? (
              <span className="button-loading">
                Saving
                <span className="button-loading-dots" aria-hidden="true">
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </span>
              </span>
            ) : (
              'Continue to Survey'
            )}

            <span className="icon">
              <FontAwesomeIcon icon={faArrowRight} size="xs" />
            </span>
          </button>
        </footer>
      </main>
    </div>
  )
}
