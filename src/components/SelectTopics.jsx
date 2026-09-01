import React, { useEffect, useMemo, useState } from 'react'
import logo from '../assets/logo-transparent.png'
import '../css/SelectTopics.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { useNavigate, useSearchParams } from 'react-router'

// const BASE_URL = 'http://127.0.0.1:8000'
const BASE_URL =
  'https://7bnfepvywhuc3ip5onitak3se40hivzn.lambda-url.us-east-1.on.aws'

const TOPICS = [
  'What is a placebo?',
  'Will I have side effects on a clinical trial?',
  'What is standard treatment?',
  'Will I have to receive my care at a different clinic if I am on a clinical trial?',
  'Is there a clinical trial for everyone?',
  'Where can I find information about clinical trials?',
  'Will my own doctor know what happens to me when I am on a clinical trial?',
  'Will taking part in a clinical trial help me?',
  'Who pays for the cost of a clinical trial?',
  'Should I ask my doctor about clinical trials?',
  'Are clinical trials only used as a last resort?',
  'Are there ways to deal with transportation and financial issues?',
  'What is randomization?',
  "Is it safe to try new treatments that haven't been around for long?",
  'What will pharmaceutical or drug companies gain from a clinical trial?',
  'Can I trust the medical establishment?',
  'How would clinical trials affect my family?',
  'Will I get good care if I take part in a clinical trial?',
  'How long do I need to stay in a clinical trial?',
  'Are clinical trials appropriate for cancer patients?',
  'How is my privacy protected on a clinical trial?',
  'Will a clinical trial take up a lot of my time?',
  'Will I be able to handle being in a clinical trial?',
  'What will my doctor gain from this clinical trial research?',
  'Is taking part in a clinical trial voluntary?',
]

const MAX_TOPICS = 3

function shuffleArray(array) {
  const shuffled = [...array]

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled
}

export default function SelectTopics() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const participantId =
    searchParams.get('id') ||
    searchParams.get('PROLIFIC_PID') ||
    'test-participant'

  const condition = Number(searchParams.get('c') ?? 0)

  const SESSION_KEY = `studySession-${participantId}-${condition}`

  const [selectedTopics, setSelectedTopics] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function logConversationEntered() {
      try {
        const response = await fetch(`${BASE_URL}/log-conversation-entered`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            participant_id: participantId,
          }),
        })

        if (!response.ok) {
          throw new Error(
            `Conversation entry logging failed: ${response.status}`,
          )
        }

        const data = await response.json()

        console.log('Conversation entered logged:', data)
      } catch (error) {
        console.error('Could not log conversation entry:', error)
      }
    }

    logConversationEntered()
  }, [participantId])

  const topics = useMemo(() => shuffleArray(TOPICS), [])

  const handleTopicClick = (topic) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics((prev) =>
        prev.filter((selectedTopic) => selectedTopic !== topic),
      )
      return
    }

    if (selectedTopics.length < MAX_TOPICS) {
      setSelectedTopics((prev) => [...prev, topic])
    }
  }

  const handleContinue = async () => {
    if (selectedTopics.length !== MAX_TOPICS || saving) return

    try {
      setSaving(true)

      const response = await fetch(`${BASE_URL}/conversation/topics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participant_id: participantId,
          selected_topics: selectedTopics,
        }),
      })

      if (!response.ok) {
        throw new Error(`Saving topics failed: ${response.status}`)
      }

      const data = await response.json()

      console.log('Topics saved:', data)

      const logResponse = await fetch(`${BASE_URL}/log-selected-topics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participant_id: participantId,
          selected_topics: selectedTopics,
        }),
      })

      if (!logResponse.ok) {
        throw new Error(`Logging selected topics failed: ${logResponse.status}`)
      }

      const logData = await logResponse.json()

      console.log('Selected topics logged:', logData)

      // Save locally too so the frontend can access them immediately
      const existingSession = JSON.parse(
        sessionStorage.getItem(SESSION_KEY) || '{}',
      )

      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          ...existingSession,
          participantId,
          condition,
          selectedTopics,
        }),
      )

      // Preserve participant/condition query params
      navigate(`/conversation?${searchParams.toString()}`)
    } catch (error) {
      console.error('Could not save selected topics:', error)
      setSaving(false)
    }
  }

  return (
    <div className="select-topics-page">
      <div className="select-topics-logo-header">
        <img src={logo} className="logo" alt="Study logo" />
        <h2>Clinical Trials Education</h2>
        <h1>Chat with Virtual Characters</h1>
      </div>

      <main className="select-topics-container">
        <header className="select-topics-header">
          <p>
            Please select <b>{MAX_TOPICS} topics</b> from the options below that
            you would like to discuss with the virtual characters. <br />
            Then, click the <b>Continue</b> button at the bottom.
          </p>
        </header>

        <div className="select-topics-grid">
          {topics.map((topic) => {
            const isSelected = selectedTopics.includes(topic)

            const selectionLimitReached =
              selectedTopics.length >= MAX_TOPICS && !isSelected

            return (
              <button
                key={topic}
                type="button"
                className={`topic-option ${
                  isSelected ? 'topic-option-selected' : ''
                }`}
                onClick={() => handleTopicClick(topic)}
                disabled={selectionLimitReached}
                aria-pressed={isSelected}
              >
                <span
                  className={`topic-checkbox ${
                    isSelected ? 'topic-checkbox-selected' : ''
                  }`}
                  aria-hidden="true"
                >
                  {isSelected && <FontAwesomeIcon icon={faCheck} />}
                </span>

                <span className="topic-option-text">{topic}</span>
              </button>
            )
          })}
        </div>

        <footer className="select-topics-footer">
          <span className="select-topics-selection-summary">
            <div className="select-topics-status">
              <strong>{selectedTopics.length}</strong>
              <span> of {MAX_TOPICS} selected</span>
            </div>
          </span>

          <button
            type="button"
            className="cssbuttons-io-button"
            onClick={handleContinue}
            disabled={selectedTopics.length !== MAX_TOPICS || saving}
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
              'Continue'
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
