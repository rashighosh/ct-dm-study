const BASE_URL = 'http://127.0.0.1:8000/pilot'
// const BASE_URL =
//   'https://brcco3c42yqwcnqmvj4h2k2igu0fysxd.lambda-url.us-east-1.on.aws/pilot'

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

const CONDITION_NAMES = {
  0: 'Single + Foraging',
  1: 'Single + Foraging + Sensemaking',
  2: 'Multiple + Foraging + Sensemaking',
}

export async function logSession(participantId, condition) {
  if (!participantId) return

  const conditionName =
    CONDITION_NAMES[condition] ?? `Unknown condition (${condition})`

  console.log('CONDITION IS', condition)
  console.log('CONDITION NAME IS', conditionName)
  console.log('ID IS', participantId)

  try {
    const response = await fetch(`${BASE_URL}/log-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participant_id: participantId,
        condition,
        condition_name: conditionName,
        start_time: new Date().toISOString(),
      }),
    })

    const data = await response.json().catch(() => null)

    console.log('log-session status:', response.status)
    console.log('log-session response:', data)

    if (!response.ok) {
      console.error('Failed to log session:', response.status, data)
    }
  } catch (err) {
    console.error('Network error calling log-session:', err)
  }
}

export async function logNotesReview(
  participantId,
  selectedNotes,
  selectedAlexResources,
  allNotes,
  allAlexResources,
) {
  if (!participantId) {
    throw new Error('participantId is required to save the notes review.')
  }

  const response = await fetch(`${BASE_URL}/save-notes-review`, {
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

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      data?.detail || `Failed to save notes review: ${response.status}`,
    )
  }

  return data
}

export async function incrementInteractionCount(
  participantId,
  field,
  amount = 1,
) {
  const response = await fetch(`${BASE_URL}/increment-interaction-count`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      participant_id: participantId,
      field,
      amount,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()

    throw new Error(
      `Failed to update ${field}: ${response.status} ${errorText}`,
    )
  }

  return response.json()
}

export async function logFinishButtonAppeared(participantId) {
  if (!participantId) {
    throw new Error(
      'participantId is required to log the finish button appearance.',
    )
  }

  const response = await fetch(`${BASE_URL}/log-finish-button-appeared`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      participant_id: participantId,
      appeared_at: new Date().toISOString(),
    }),
  })

  const responseText = await response.text()

  if (!response.ok) {
    throw new Error(
      `Finish button logging failed: ${response.status} ${responseText}`,
    )
  }

  return responseText ? JSON.parse(responseText) : null
}

export async function logIntroPart(participantId, introTranscript) {
  if (!participantId) return

  const response = await fetch(`${BASE_URL}/log-intro-part`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      participant_id: participantId,
      intro_part: JSON.stringify(introTranscript),
    }),
  })

  const result = await response.json().catch(() => null)

  console.log('[log-intro-part] status:', response.status)
  console.log('[log-intro-part] response:', result)

  if (!response.ok) {
    throw new Error(
      result?.detail ||
        result?.message ||
        `Failed to save intro: ${response.status}`,
    )
  }

  return result
}

export async function incrementConversationTurns(participantId) {
  if (!participantId) return

  const response = await fetch(`${BASE_URL}/increment-conversation-turns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      participant_id: participantId,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to increment conversation turns.')
  }

  return response.json()
}

export async function logIntroFinished(participantId) {
  if (!participantId) return

  const response = await fetch(`${BASE_URL}/log-intro-finished`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      participant_id: participantId,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to log intro completion.')
  }

  return response.json()
}

export async function logSummaryUrl(participantId, summaryUrl) {
  if (!participantId || !summaryUrl) {
    return {
      ok: false,
      error: 'Missing participant ID or summary URL',
    }
  }

  try {
    const response = await fetch(`${BASE_URL}/log-summary-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        participant_id: participantId,
        summary_url: summaryUrl,
      }),
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(
        data?.detail || `Summary URL logging failed: ${response.status}`,
      )
    }

    console.log('Summary URL saved:', data)

    return {
      ok: true,
      data,
    }
  } catch (error) {
    console.error('Could not save summary URL:', error)

    return {
      ok: false,
      error: error.message,
    }
  }
}

export async function logSummaryRequest(participantId, clicked_print_summary) {
  if (!participantId) {
    return {
      ok: false,
      error: 'Missing participant ID',
    }
  }

  try {
    const response = await fetch(`${BASE_URL}/log-summary-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        participant_id: participantId,
        clicked_print_summary: Boolean(clicked_print_summary),
      }),
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(
        data?.detail || `Summary request logging failed: ${response.status}`,
      )
    }

    console.log('Summary request saved:', data)

    return {
      ok: true,
      data,
    }
  } catch (error) {
    console.error('Could not save summary request:', error)

    return {
      ok: false,
      error: error.message,
    }
  }
}
