export interface CrisisHotline {
  country: string;
  countryCode: string;
  name: string;
  phone: string;
  textLine?: string;
  chatUrl?: string;
  website?: string;
  hours: string;
  languages: string[];
}

export interface SafetyPlanStep {
  id: string;
  title: string;
  description: string;
  placeholder: string;
}

export const CRISIS_HOTLINES: CrisisHotline[] = [
  {
    country: "United States",
    countryCode: "US",
    name: "988 Suicide & Crisis Lifeline",
    phone: "988",
    textLine: "Text HOME to 741741",
    chatUrl: "https://988lifeline.org/chat/",
    website: "https://988lifeline.org",
    hours: "24/7",
    languages: ["English", "Spanish"]
  },
  {
    country: "United Kingdom",
    countryCode: "GB",
    name: "Samaritans",
    phone: "116 123",
    textLine: "Text SHOUT to 85258",
    chatUrl: "https://www.samaritans.org/how-we-can-help/contact-samaritan/",
    website: "https://www.samaritans.org",
    hours: "24/7",
    languages: ["English"]
  },
  {
    country: "Turkey",
    countryCode: "TR",
    name: "Sağlık Bakanlığı ALO 182",
    phone: "182",
    website: "https://www.saglik.gov.tr",
    hours: "24/7",
    languages: ["Turkish"]
  },
  {
    country: "Canada",
    countryCode: "CA",
    name: "Talk Suicide Canada",
    phone: "1-833-456-4566",
    textLine: "Text 45645",
    chatUrl: "https://talksuicide.ca/",
    website: "https://talksuicide.ca",
    hours: "24/7",
    languages: ["English", "French"]
  },
  {
    country: "Australia",
    countryCode: "AU",
    name: "Lifeline Australia",
    phone: "13 11 14",
    textLine: "Text 0477 13 11 14",
    chatUrl: "https://www.lifeline.org.au/crisis-chat/",
    website: "https://www.lifeline.org.au",
    hours: "24/7",
    languages: ["English"]
  },
  {
    country: "Germany",
    countryCode: "DE",
    name: "Telefonseelsorge",
    phone: "0800 111 0 111",
    chatUrl: "https://online.telefonseelsorge.de/",
    website: "https://www.telefonseelsorge.de",
    hours: "24/7",
    languages: ["German"]
  },
  {
    country: "France",
    countryCode: "FR",
    name: "S.O.S Amitié",
    phone: "09 72 39 40 50",
    chatUrl: "https://www.sos-amitie.com/",
    website: "https://www.sos-amitie.com",
    hours: "24/7",
    languages: ["French"]
  },
  {
    country: "Netherlands",
    countryCode: "NL",
    name: "113 Zelfmoordpreventie",
    phone: "113",
    chatUrl: "https://www.113.nl/",
    website: "https://www.113.nl",
    hours: "24/7",
    languages: ["Dutch"]
  },
  {
    country: "Japan",
    countryCode: "JP",
    name: "TELL Lifeline",
    phone: "03-5774-0992",
    chatUrl: "https://telljp.com/lifeline/",
    website: "https://telljp.com",
    hours: "9am-11pm",
    languages: ["English", "Japanese"]
  },
  {
    country: "India",
    countryCode: "IN",
    name: "iCALL",
    phone: "9152987821",
    website: "https://icallhelpline.org",
    hours: "Mon-Sat 8am-10pm",
    languages: ["English", "Hindi"]
  },
  {
    country: "Brazil",
    countryCode: "BR",
    name: "CVV - Centro de Valorização da Vida",
    phone: "188",
    chatUrl: "https://www.cvv.org.br/",
    website: "https://www.cvv.org.br",
    hours: "24/7",
    languages: ["Portuguese"]
  },
  {
    country: "Spain",
    countryCode: "ES",
    name: "Teléfono de la Esperanza",
    phone: "717 003 717",
    website: "https://telefonodelaesperanza.org",
    hours: "24/7",
    languages: ["Spanish"]
  },
  {
    country: "International",
    countryCode: "INT",
    name: "Befrienders Worldwide",
    phone: "Find local number",
    chatUrl: "https://www.befrienders.org/find-a-helpline",
    website: "https://www.befrienders.org",
    hours: "Varies by location",
    languages: ["Multiple"]
  },
  {
    country: "International",
    countryCode: "INT",
    name: "International Association for Suicide Prevention",
    phone: "Find local resources",
    website: "https://www.iasp.info/resources/Crisis_Centres/",
    hours: "Varies by location",
    languages: ["Multiple"]
  }
];

export const CRISIS_KEYWORDS: string[] = [
  "suicide",
  "suicidal",
  "kill myself",
  "end my life",
  "end it all",
  "want to die",
  "wanna die",
  "don't want to live",
  "dont want to live",
  "self-harm",
  "self harm",
  "hurt myself",
  "cutting myself",
  "harm myself",
  "no reason to live",
  "better off dead",
  "can't go on",
  "cant go on",
  "ending it",
  "take my own life",
  "overdose",
  "jump off",
  "hang myself",
  "not worth living",
  "life is meaningless",
  "give up on life",
  "no hope left",
  "nothing to live for",
  "ending my suffering"
];

export function containsCrisisKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return CRISIS_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

export function detectCrisisLevel(text: string): 'none' | 'concern' | 'urgent' {
  const lowerText = text.toLowerCase();
  
  const urgentKeywords = [
    "kill myself",
    "end my life", 
    "suicide",
    "suicidal",
    "want to die",
    "take my own life",
    "overdose",
    "jump off",
    "hang myself"
  ];
  
  const concernKeywords = [
    "self-harm",
    "self harm",
    "hurt myself",
    "harm myself",
    "no reason to live",
    "better off dead",
    "not worth living",
    "no hope"
  ];
  
  if (urgentKeywords.some(keyword => lowerText.includes(keyword))) {
    return 'urgent';
  }
  
  if (concernKeywords.some(keyword => lowerText.includes(keyword))) {
    return 'concern';
  }
  
  return 'none';
}

export const SAFETY_PLAN_TEMPLATE: SafetyPlanStep[] = [
  {
    id: "warning-signs",
    title: "Warning Signs",
    description: "Thoughts, feelings, or situations that signal a crisis may be developing",
    placeholder: "e.g., Feeling hopeless, isolating from friends, trouble sleeping..."
  },
  {
    id: "coping-strategies",
    title: "Internal Coping Strategies",
    description: "Things I can do on my own to take my mind off problems without contacting another person",
    placeholder: "e.g., Taking a walk, listening to music, deep breathing exercises..."
  },
  {
    id: "social-distractions",
    title: "People & Places for Distraction",
    description: "People or social settings that can help distract from crisis thoughts",
    placeholder: "e.g., Coffee with friend, visiting library, calling family member..."
  },
  {
    id: "support-people",
    title: "People I Can Ask for Help",
    description: "Family members or friends I can contact when in crisis",
    placeholder: "e.g., Mom: 555-1234, Best friend Sarah: 555-5678..."
  },
  {
    id: "professionals",
    title: "Professionals & Agencies",
    description: "Healthcare providers, counselors, or crisis lines I can contact",
    placeholder: "e.g., Therapist Dr. Smith: 555-9999, Crisis line: 988..."
  },
  {
    id: "safe-environment",
    title: "Making My Environment Safe",
    description: "Steps to make my surroundings safer during a crisis",
    placeholder: "e.g., Remove or secure harmful items, stay in public places..."
  },
  {
    id: "reasons-to-live",
    title: "My Reasons for Living",
    description: "The most important things that give my life meaning",
    placeholder: "e.g., My children, my pet, future goals, people who love me..."
  }
];

export const COPING_STRATEGIES = [
  {
    category: "Breathing & Relaxation",
    strategies: [
      "4-7-8 breathing: Inhale for 4 seconds, hold for 7, exhale for 8",
      "Progressive muscle relaxation: Tense and release each muscle group",
      "Grounding exercise: Name 5 things you see, 4 you hear, 3 you touch, 2 you smell, 1 you taste",
      "Box breathing: Inhale 4 sec, hold 4 sec, exhale 4 sec, hold 4 sec"
    ]
  },
  {
    category: "Physical Activities",
    strategies: [
      "Take a walk in nature",
      "Do gentle stretching or yoga",
      "Run cold water over your wrists",
      "Hold an ice cube in your hand",
      "Jump up and down or do jumping jacks"
    ]
  },
  {
    category: "Distraction Techniques",
    strategies: [
      "Call or text a supportive friend",
      "Watch a favorite comfort movie or show",
      "Listen to uplifting or calming music",
      "Write in a journal about your feelings",
      "Do a creative activity like drawing or crafting"
    ]
  },
  {
    category: "Mindfulness & Self-Care",
    strategies: [
      "Practice self-compassion: speak to yourself as you would a friend",
      "Take a warm shower or bath",
      "Make yourself a cup of tea",
      "Cuddle with a pet or soft object",
      "Repeat a calming affirmation"
    ]
  },
  {
    category: "Cognitive Strategies",
    strategies: [
      "Remind yourself: 'This feeling is temporary'",
      "List 3 things you're grateful for",
      "Challenge negative thoughts with evidence",
      "Remember times you've overcome difficulties before",
      "Focus on getting through the next hour, not the whole day"
    ]
  }
];
