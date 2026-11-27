// node scripts/generateIntroVoices.js
import fs from 'fs'

const BASE_URL = 'http://127.0.0.1:8000'

const ALEX_INTRO_1_SINGLE_1 = `Hello, I am Doctor Alex. I am an AI-powered virtual character designed to help you explore how clinical trials work so that you feel well-informed when determining whether taking part in one may be appropriate for you.`

const ALEX_INTRO_1_COMBINED_1 = `However, having reliable information is only part of the process. What information is most helpful depends on your individual needs and experiences. After all, you know your own experiences better than anyone else.`

const ALEX_INTRO_1_COMBINED_2 = `In addition to providing information, my role is to help you express your needs and perspectives. Throughout our conversation, I will ask about your experiences and what is important to you so that I can identify and share information that is relevant to you.`

const ALEX_INTRO_1_COMBINED_3 = `Now that I have introduced myself, I would like to hear a little about you.`

const ALEX_INTRO_1_COMBINED_4 = `When you think back on your healthcare experiences, what kinds of things were important to you when making health-related decisions?`

const ALEX_INTRO_1_COMBINED_5 = `Perhaps you can share things that helped you feel more certain, made decisions more difficult, or things you wish you had. Take your time and feel free to share whatever comes to mind.`

const ALEX_INTRO_1_MULTIPLE_1 = `Hello, I am Doctor Alex, and this is Jordan. We are AI-powered virtual characters designed to help you explore how clinical trials work so that you feel well-informed when determining whether taking part in one may be appropriate for you.`

const ALEX_INTRO_1_MULTIPLE_2 = `When considering a clinical trial, it is important to have accurate and reliable information. However, the amount of information available can be substantial, and it is not always clear which sources to consult or how to interpret what you find.`

const ALEX_INTRO_1_MULTIPLE_3 = `Hence, my goal is to assist you in navigating that information. My role is inspired by that of a healthcare provider who provides patients with medical information. I draw from a collection of trusted medical sources, such as the National Cancer Institute, curated specifically for this website. Using these sources, I provide clear, evidence-based answers to address your information needs.`

const JORDAN_INTRO_1_MULTIPLE_1 = `Thanks for kicking this off Doctor Alex! Now, the thing is, having reliable info is great, but what's most helpful really depends on what you need. After all, nobody knows your experiences better than you, and that's just as valuable as anything Doctor Alex can look up.`

const JORDAN_INTRO_1_MULTIPLE_2 = `That's where I come in! I'm here to make sure your story is heard. My role is inspired by patient navigators, who work alongside people to voice their needs.  During our chat, I'll ask about your experiences and perspectives so we can learn what's important to you -- and then, that'll help guide the info that Doctor Alex finds and shares with you.`

const JORDAN_INTRO_1_MULTIPLE_3 = `Alright, we've talked a lot at this point, so now let's hear a bit about you!`

const JORDAN_INTRO_1_MULTIPLE_4 = `When you think back on your healthcare experiences, what kinds of things were super important when making health-related decisions?`

const JORDAN_INTRO_1_MULTIPLE_5 = `Maybe you can share things that helped you feel more sure, made it harder, or things you wish you'd had. Take your time in thinking about this -- whatever comes to mind is a great place to start!`

const JORDAN_OPENING_FILLER =
  "Gotcha! Let me make sure I'm getting this right by quickly saying that back to you."

const ALEX_TOPIC_FILLER =
  'Thank you for sharing those thoughts. Let me review the information available to me and identify a few topics that may be most relevant to your concerns.'

const ALEX_TOPIC_SELECTION_INSTRUCTIONS =
  'You can keep these suggestions or change any of them using the options below. ' +
  "Once you're satisfied with your selections, click Continue to start exploring these topics."

// --------------------------------------------------------------------------
// Generate one intro function
// --------------------------------------------------------------------------

async function generateOneIntro(name, text, character, companion = null) {
  console.log(`Generating ${name}...`)

  const res = await fetch(`${BASE_URL}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      character,
      companion,
    }),
  })

  if (!res.ok) {
    throw new Error(`Failed ${name}: ${res.status}`)
  }

  const { audio, timestamps } = await res.json()

  if (!audio || timestamps == null) {
    throw new Error(`Missing audio or timestamps for ${name}`)
  }

  const prefix =
    character === 'doctor'
      ? 'doctor'
      : ['jordan1', 'jordan2'].includes(companion)
        ? 'companion-female'
        : 'companion-male'

  fs.mkdirSync('public/intro-voices', { recursive: true })

  fs.writeFileSync(
    `public/intro-voices/${prefix}-audio-${name}.mp3`,
    Buffer.from(audio, 'base64'),
  )

  fs.writeFileSync(
    `public/intro-voices/${prefix}-timestamps-${name}.json`,
    JSON.stringify(timestamps, null, 2),
  )

  console.log(`✅ ${name}`)
}

// --------------------------------------------------------------------------
// Generate all intros function
// --------------------------------------------------------------------------

async function generateAllIntros() {
  const intros = [
    {
      name: 'ALEX_INTRO_1_MULTIPLE_1',
      text: ALEX_INTRO_1_MULTIPLE_1,
      character: 'doctor',
    },
    {
      name: 'ALEX_INTRO_1_MULTIPLE_2',
      text: ALEX_INTRO_1_MULTIPLE_2,
      character: 'doctor',
    },
    {
      name: 'ALEX_INTRO_1_MULTIPLE_3',
      text: ALEX_INTRO_1_MULTIPLE_3,
      character: 'doctor',
    },
    {
      name: 'JORDAN_INTRO_1_MULTIPLE_1',
      text: JORDAN_INTRO_1_MULTIPLE_1,
      character: 'companion',
    },
    {
      name: 'JORDAN_INTRO_1_MULTIPLE_2',
      text: JORDAN_INTRO_1_MULTIPLE_2,
      character: 'companion',
    },
    {
      name: 'JORDAN_INTRO_1_MULTIPLE_3',
      text: JORDAN_INTRO_1_MULTIPLE_3,
      character: 'companion',
    },
    {
      name: 'JORDAN_INTRO_1_MULTIPLE_4',
      text: JORDAN_INTRO_1_MULTIPLE_4,
      character: 'companion',
    },
    {
      name: 'JORDAN_INTRO_1_MULTIPLE_5',
      text: JORDAN_INTRO_1_MULTIPLE_5,
      character: 'companion',
    },
    {
      name: 'ALEX_TOPIC_FILLER',
      text: ALEX_TOPIC_FILLER,
      character: 'doctor',
    },
    {
      name: 'ALEX_TOPIC_SELECTION_INSTRUCTIONS',
      text: ALEX_TOPIC_SELECTION_INSTRUCTIONS,
      character: 'doctor',
    },
    {
      name: 'JORDAN_OPENING_FILLER',
      text: JORDAN_OPENING_FILLER,
      character: 'companion',
    },
  ]

  for (const intro of intros) {
    if (intro.character === 'companion') {
      // Generate female companion voice
      await generateOneIntro(intro.name, intro.text, intro.character, 'jordan1')

      // Generate male companion voice
      await generateOneIntro(intro.name, intro.text, intro.character, 'jordan3')
    } else {
      // Generate doctor voice
      await generateOneIntro(intro.name, intro.text, intro.character)
    }
  }

  console.log(
    '🎉 Done! All doctor and companion audio and timestamp files saved!',
  )
}

// --------------------------------------------------------------------------
// Choose what to run
// --------------------------------------------------------------------------

// generateAllIntros().catch((err) => {
//   console.error('❌ Intro generation failed:', err)
//   process.exitCode = 1
// })

// generateOneIntro(
//   'ALEX_INTRO_1_SINGLE_1',
//   ALEX_INTRO_1_SINGLE_1,
//   'doctor',
// ).catch((err) => {
//   console.error('❌ Intro generation failed:', err)
//   process.exitCode = 1
// })

async function generateCombinedIntros() {
  const intros = [
    ['ALEX_INTRO_1_COMBINED_1', ALEX_INTRO_1_COMBINED_1],
    ['ALEX_INTRO_1_COMBINED_2', ALEX_INTRO_1_COMBINED_2],
    ['ALEX_INTRO_1_COMBINED_3', ALEX_INTRO_1_COMBINED_3],
    ['ALEX_INTRO_1_COMBINED_4', ALEX_INTRO_1_COMBINED_4],
    ['ALEX_INTRO_1_COMBINED_5', ALEX_INTRO_1_COMBINED_5],
  ]

  for (const [name, text] of intros) {
    await generateOneIntro(name, text, 'doctor')
  }
}

generateCombinedIntros().catch((err) => {
  console.error('❌ Intro generation failed:', err)
  process.exitCode = 1
})
