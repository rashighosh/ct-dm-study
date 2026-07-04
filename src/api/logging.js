// const BASE_URL = 'http://127.0.0.1:8000/pilot'
const BASE_URL =
  'https://brcco3c42yqwcnqmvj4h2k2igu0fysxd.lambda-url.us-east-1.on.aws/pilot'

export async function logMainInteraction(participantId, transcript) {
  if (!participantId) return

  await fetch(`${BASE_URL}/log-main-interaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      participant_id: participantId,
      transcript: JSON.stringify(transcript),
    }),
  })
}

export async function logGoalSetting(participantId, payload) {
  if (!participantId) return

  await fetch(`${BASE_URL}/log-goal-setting`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      participant_id: participantId,
      goals: JSON.stringify(payload),
      timestamp: new Date().toISOString(),
    }),
  })
}

export async function logSession(participantId, condition, proactivity) {
  if (!participantId) return

  await fetch(`${BASE_URL}/log-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      participant_id: participantId,
      condition,
      proactivity,
      start_time: new Date().toISOString(),
    }),
  })
}

export async function logNotesReview(
  participantId,
  selectedNotes,
  selectedAlexResources,
  allNotes,
  allAlexResources,
) {
  if (!participantId) return

  await fetch(`${BASE_URL}/save-notes-review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      participant_id: participantId,
      selected_notes: selectedNotes,
      selected_alex_resources: selectedAlexResources,
      all_notes: allNotes,
      all_alex_resources: allAlexResources,
    }),
  })
}
