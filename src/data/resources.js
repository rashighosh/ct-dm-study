import {
  faFlask,
  faPeopleGroup,
  faFileLines,
  faCircleQuestion,
  faClipboardList,
  faBookOpen,
  faHeadset,
  faMagnifyingGlass,
} from '@fortawesome/free-solid-svg-icons'

export const RESOURCES = [
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
