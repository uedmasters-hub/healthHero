/**
 * English-source phrase catalog (PocketPills tx pattern).
 * Missing entries fall back to the English source.
 */

const NE = {
  /* Search chrome */
  Cancel: 'रद्द गर्नुहोस्',
  'Voice language': 'आवाज भाषा',
  'Stop listening': 'सुन्न बन्द गर्नुहोस्',
  'Speak in Nepali': 'नेपालीमा बोल्नुहोस्',
  'Speak in English': 'अंग्रेजीमा बोल्नुहोस्',
  'Stop voice search': 'आवाज खोज बन्द गर्नुहोस्',
  'Start voice search': 'आवाज खोज सुरु गर्नुहोस्',
  'Listening in English… speak, then pause': 'अंग्रेजीमा सुन्दै… बोल्नुहोस्, त्यसपछि रोक्नुहोस्',
  'Listening in Nepali… speak, then pause': 'नेपालीमा सुन्दै… बोल्नुहोस्, त्यसपछि रोक्नुहोस्',
  'Transcribing…': 'लेख्दै…',
  'Preparing microphone…': 'माइक्रोफोन तयार गर्दै…',
  'Loading voice model…': 'आवाज मोडेल लोड हुँदै…',
  'On-device voice is starting — Brave blocks cloud speech by design.': 'यन्त्रमै आवाज सुरु हुँदैछ — Brave ले क्लाउड आवाज रोक्छ।',
  'Couldn’t load the voice model. Check your connection and try again.': 'आवाज मोडेल लोड गर्न सकिएन। जडान जाँच्नुहोस्।',
  'Couldn’t transcribe that. Try again.': 'लेख्न सकिएन। फेरि प्रयास गर्नुहोस्।',
  'Clear search': 'खोज खाली गर्नुहोस्',
  'Recent searches': 'हालका खोजहरू',
  Suggestions: 'सुझावहरू',
  'No matches for': 'कुनै मिलान छैन',
  'Voice search isn’t available here — type to search instead.': 'आवाज खोज यहाँ उपलब्ध छैन — टाइप गरेर खोज्नुहोस्।',
  'Allow microphone access for this site, then tap the mic again.': 'माइक्रोफोन अनुमति दिनुहोस्, त्यसपछि फेरि ट्याप गर्नुहोस्।',
  'No microphone found. Check your input device.': 'माइक्रोफोन भेटिएन।',
  'Couldn’t reach speech service — try again, or type your search.': 'आवाज सेवामा पुग्न सकिएन — फेरि प्रयास गर्नुहोस् वा टाइप गर्नुहोस्।',
  'Voice search is unavailable right now — type to search instead.': 'अहिले आवाज खोज उपलब्ध छैन — टाइप गरेर खोज्नुहोस्।',
  'Voice search is blocked for this site. You can still type to search.': 'यो साइटका लागि आवाज खोज अवरुद्ध छ। टाइप गरेर खोज्न सकिन्छ।',
  'Mic is busy. Wait a moment, then try again.': 'माइक व्यस्त छ। केही क्षणपछि फेरि प्रयास गर्नुहोस्।',
  'Didn’t catch that — tap the mic and try again.': 'सुनिएन — फेरि प्रयास गर्नुहोस्।',
  'That voice language isn’t supported here. Try EN.': 'यो आवाज भाषा समर्थित छैन। EN प्रयास गर्नुहोस्।',
  'Couldn’t start listening. Tap the mic again.': 'सुन्न सुरु गर्न सकिएन। फेरि प्रयास गर्नुहोस्।',

  /* Contextual placeholders */
  'Search doctors, pharmacies, centres…': 'डाक्टर, फार्मेसी, केन्द्र खोज्नुहोस्…',
  'Search Doctor': 'डाक्टर खोज्नुहोस्',
  'Try "fever", "acne", or a doctor name…': '"ज्वरो", "दाद", वा डाक्टरको नाम…',
  'Search your care, visits, and records…': 'तपाईंको हेरचाह, भिजिट र रेकर्ड खोज्नुहोस्…',
  'Search pharmacies or medicines…': 'फार्मेसी वा औषधि खोज्नुहोस्…',
  'Search hospitals, clinics, and labs…': 'अस्पताल, क्लिनिक, ल्याब खोज्नुहोस्…',
  'Name, city or degree': 'नाम, शहर वा डिग्री',
  'Name or place': 'नाम वा स्थान',
  'Name or district': 'नाम वा जिल्ला',

  /* Result kinds */
  Doctor: 'डाक्टर',
  Specialty: 'विशेषज्ञता',
  Pharmacy: 'फार्मेसी',
  Facility: 'केन्द्र',
  Medicine: 'औषधि',
  Service: 'सेवा',
  Article: 'लेख',
  Appointment: 'अपोइन्टमेन्ट',
  Prescription: 'प्रेस्क्रिप्शन',
  'Lab report': 'ल्याब रिपोर्ट',
  Record: 'रेकर्ड',
}

export function translatePhrase(lang, english) {
  const source = String(english || '')
  if (!source) return ''
  if (lang !== 'ne') return source
  return NE[source] || source
}
