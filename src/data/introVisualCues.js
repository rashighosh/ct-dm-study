import {
  faCommentNodes,
  faStethoscope,
  faClipboardList,
  faHeartCircleCheck,
  faUser,
  faFileLines,
  faCheck,
  faGlobe,
  faMagnifyingGlass,
  faQuestion,
  faDatabase,
  faNotesMedical,
  faUserCheck,
  faCircleCheck,
  faFileCircleCheck,
  faHandHoldingHeart,
  faUsers,
  faEarthAmericas,
  faHeart,
  faCircleExclamation,
  faCommentDots,
  faLightbulb,
  faBullhorn,
  faArrowRight,
  faRobot,
} from '@fortawesome/free-solid-svg-icons'

export const INTRO_VISUAL_CUES = {
  // DR. ALEX
  '/intro-voices/doctor-audio-ALEX_INTRO_1_MULTIPLE_1.mp3': [
    {
      at: 2.5,
      duration: 2.5,
      icons: [faCommentNodes, faRobot],
      stagger: 0.5,
    },
    {
      at: 5,
      duration: 2,
      icons: [faStethoscope, faClipboardList],
      stagger: 0.3,
    },
    {
      at: 7.5,
      duration: 3,
      icons: [faUser, faHeartCircleCheck],
      stagger: 0.3,
    },
  ],
  '/intro-voices/doctor-audio-ALEX_INTRO_1_MULTIPLE_2.mp3': [
    {
      at: 2.5,
      duration: 3,
      icons: [faFileLines, faCheck],
      stagger: 0.3,
    },
    {
      at: 6,
      duration: 6,
      icons: [faMagnifyingGlass, faQuestion],
      stagger: 0.5,
    },
  ],
  '/intro-voices/doctor-audio-ALEX_INTRO_1_MULTIPLE_3.mp3': [
    {
      at: 10.5,
      duration: 6,
      icons: [faDatabase, faNotesMedical, faUserCheck],
      stagger: 0.5,
    },
    {
      at: 18.5,
      duration: 3,
      icons: [faUser, faArrowRight, faFileCircleCheck],
      stagger: 0.3,
    },
  ],
  '/intro-voices/companion-audio-JORDAN_INTRO_1_MULTIPLE_1.mp3': [
    {
      at: 5,
      duration: 2.5,
      icons: [faFileCircleCheck, faHandHoldingHeart],
      stagger: 0.5,
    },
    {
      at: 10.5,
      duration: 2.5,
      icons: [faHandHoldingHeart, faMagnifyingGlass],
      stagger: 0.5,
    },
  ],
  '/intro-voices/companion-audio-JORDAN_INTRO_1_MULTIPLE_2.mp3': [
    {
      at: 8.5,
      duration: 1.5,
      icons: [faHandHoldingHeart, faCommentDots],
      stagger: 0.3,
    },
    {
      at: 11,
      duration: 1.5,
      icons: [faUser, faLightbulb],
      stagger: 0.5,
    },
    {
      at: 13,
      duration: 3,
      icons: [faUser, faArrowRight, faFileLines],
      stagger: 0.3,
    },
  ],
  '/intro-voices/companion-audio-JORDAN_INTRO_1_MULTIPLE_3.mp3': [],
  '/intro-voices/companion-audio-JORDAN_INTRO_1_MULTIPLE_4.mp3': [],
  '/intro-voices/companion-audio-JORDAN_INTRO_1_MULTIPLE_5.mp3': [],
}
