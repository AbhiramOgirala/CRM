import { useState, useEffect, useRef, useCallback } from 'react';

// ── Global singleton state ────────────────────────────────────────────────────
let _currentUtterance = null;
let _subscribers = new Set();

function notifySubscribers() {
  _subscribers.forEach(fn => fn());
}

// ── Voice cache ───────────────────────────────────────────────────────────────
let _voices = [];
let _voicesLoaded = false;

function loadVoices() {
  _voices = window.speechSynthesis.getVoices();
  if (_voices.length > 0) _voicesLoaded = true;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useTextToSpeech() {
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const idRef = useRef(Symbol()); // unique id per hook instance

  useEffect(() => {
    if (!isSupported) return;

    // Subscribe to global state changes
    const update = () => {
      const speaking = _currentUtterance !== null && window.speechSynthesis.speaking;
      setIsSpeaking(speaking && _currentUtterance?._hookId === idRef.current);
    };
    _subscribers.add(update);

    // Load voices
    loadVoices();
    if (!_voicesLoaded) {
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        loadVoices();
      });
    }

    return () => {
      _subscribers.delete(update);
    };
  }, [isSupported]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    _currentUtterance = null;
    notifySubscribers();
  }, [isSupported]);

  const speak = useCallback(({ text, lang = 'en-IN', rate = 0.92 }) => {
    if (!isSupported || !text) return;

    // Toggle off if this instance is already speaking
    if (_currentUtterance?._hookId === idRef.current && window.speechSynthesis.speaking) {
      stop();
      return;
    }

    // Cancel any currently playing utterance
    window.speechSynthesis.cancel();
    _currentUtterance = null;

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = rate;
    utter._hookId = idRef.current;

    // Pick best matching voice
    const available = _voices.length > 0 ? _voices : window.speechSynthesis.getVoices();
    const exact = available.find(v => v.lang === lang);
    const partial = available.find(v => v.lang.startsWith(lang.split('-')[0]));
    if (exact) utter.voice = exact;
    else if (partial) utter.voice = partial;

    utter.onstart = () => {
      _currentUtterance = utter;
      notifySubscribers();
    };
    utter.onend = () => {
      _currentUtterance = null;
      notifySubscribers();
    };
    utter.onerror = () => {
      _currentUtterance = null;
      notifySubscribers();
    };

    window.speechSynthesis.speak(utter);
  }, [isSupported, stop]);

  return { speak, stop, isSpeaking, isSupported };
}

// ── Content builder helpers ───────────────────────────────────────────────────

// ── Translated lookup tables for enum values ──────────────────────────────────
const CATEGORY_LABELS = {
  'en-IN': { roads:'Roads & Potholes', water_supply:'Water Supply', electricity:'Electricity', waste_management:'Garbage & Waste', drainage:'Drainage & Sewage', infrastructure:'Infrastructure', parks:'Parks & Gardens', health:'Health', education:'Education', public_services:'Public Services', other:'Other' },
  'hi-IN': { roads:'सड़क और गड्ढे', water_supply:'पानी की सप्लाई', electricity:'बिजली', waste_management:'कचरा और सफाई', drainage:'नाली और सीवर', infrastructure:'बुनियादी ढांचा', parks:'पार्क और बगीचे', health:'स्वास्थ्य', education:'शिक्षा', public_services:'सरकारी सेवाएं', other:'अन्य' },
  'te-IN': { roads:'రోడ్లు మరియు గుంతలు', water_supply:'నీటి సరఫరా', electricity:'విద్యుత్', waste_management:'చెత్త మరియు పారిశుద్ధ్యం', drainage:'కాలువలు మరియు మురుగు', infrastructure:'మౌలిక సదుపాయాలు', parks:'పార్కులు మరియు తోటలు', health:'ఆరోగ్యం', education:'విద్య', public_services:'ప్రభుత్వ సేవలు', other:'ఇతరాలు' },
  'ta-IN': { roads:'சாலைகள் மற்றும் குழிகள்', water_supply:'குடிநீர் வழங்கல்', electricity:'மின்சாரம்', waste_management:'குப்பை மேலாண்மை', drainage:'வடிகால் மற்றும் சாக்கடை', infrastructure:'உள்கட்டமைப்பு', parks:'பூங்காக்கள்', health:'சுகாதாரம்', education:'கல்வி', public_services:'அரசு சேவைகள்', other:'மற்றவை' },
  'kn-IN': { roads:'ರಸ್ತೆ ಮತ್ತು ಗುಂಡಿಗಳು', water_supply:'ನೀರು ಸರಬರಾಜು', electricity:'ವಿದ್ಯುತ್', waste_management:'ಕಸ ಮತ್ತು ಸ್ವಚ್ಛತೆ', drainage:'ಚರಂಡಿ ಮತ್ತು ಒಳಚರಂಡಿ', infrastructure:'ಮೂಲಸೌಕರ್ಯ', parks:'ಉದ್ಯಾನಗಳು', health:'ಆರೋಗ್ಯ', education:'ಶಿಕ್ಷಣ', public_services:'ಸರ್ಕಾರಿ ಸೇವೆಗಳು', other:'ಇತರೆ' },
  'ml-IN': { roads:'റോഡുകളും കുഴികളും', water_supply:'കുടിവെള്ള വിതരണം', electricity:'വൈദ്യുതി', waste_management:'മാലിന്യ നിർമ്മാർജ്ജനം', drainage:'ഓടകളും മലിനജലവും', infrastructure:'അടിസ്ഥാന സൗകര്യം', parks:'പൂന്തോട്ടങ്ങൾ', health:'ആരോഗ്യം', education:'വിദ്യാഭ്യാസം', public_services:'സർക്കാർ സേവനങ്ങൾ', other:'മറ്റുള്ളവ' },
  'mr-IN': { roads:'रस्ते आणि खड्डे', water_supply:'पाणी पुरवठा', electricity:'वीज', waste_management:'कचरा आणि स्वच्छता', drainage:'गटार आणि सांडपाणी', infrastructure:'पायाभूत सुविधा', parks:'उद्याने', health:'आरोग्य', education:'शिक्षण', public_services:'सरकारी सेवा', other:'इतर' },
  'gu-IN': { roads:'રસ્તા અને ખાડા', water_supply:'પાણી પુરવઠો', electricity:'વીજળી', waste_management:'કચરો અને સ્વચ્છતા', drainage:'ગટર અને ગંદુ પાણી', infrastructure:'ઈન્ફ્રાસ્ટ્રક્ચર', parks:'બગીચા', health:'આરોગ્ય', education:'શિક્ષણ', public_services:'સરકારી સેવાઓ', other:'અન્ય' },
  'pa-IN': { roads:'ਸੜਕਾਂ ਅਤੇ ਟੋਏ', water_supply:'ਪਾਣੀ ਦੀ ਸਪਲਾਈ', electricity:'ਬਿਜਲੀ', waste_management:'ਕੂੜਾ ਅਤੇ ਸਫ਼ਾਈ', drainage:'ਨਾਲੀ ਅਤੇ ਸੀਵਰ', infrastructure:'ਬੁਨਿਆਦੀ ਢਾਂਚਾ', parks:'ਪਾਰਕ ਅਤੇ ਬਗੀਚੇ', health:'ਸਿਹਤ', education:'ਸਿੱਖਿਆ', public_services:'ਸਰਕਾਰੀ ਸੇਵਾਵਾਂ', other:'ਹੋਰ' },
  'bn-IN': { roads:'রাস্তা ও গর্ত', water_supply:'পানি সরবরাহ', electricity:'বিদ্যুৎ', waste_management:'আবর্জনা ও পরিচ্ছন্নতা', drainage:'নর্দমা ও পয়ঃনিষ্কাশন', infrastructure:'অবকাঠামো', parks:'পার্ক ও বাগান', health:'স্বাস্থ্য', education:'শিক্ষা', public_services:'সরকারি সেবা', other:'অন্যান্য' },
  'ur-IN': { roads:'سڑکیں اور گڑھے', water_supply:'پانی کی فراہمی', electricity:'بجلی', waste_management:'کچرا اور صفائی', drainage:'نالی اور سیوریج', infrastructure:'بنیادی ڈھانچہ', parks:'پارک اور باغات', health:'صحت', education:'تعلیم', public_services:'سرکاری خدمات', other:'دیگر' },
};

const PRIORITY_LABELS = {
  'en-IN': { critical:'Critical', high:'High', medium:'Medium', low:'Low' },
  'hi-IN': { critical:'बहुत जरूरी', high:'जरूरी', medium:'सामान्य', low:'कम जरूरी' },
  'te-IN': { critical:'అత్యవసరం', high:'ముఖ్యమైనది', medium:'సాధారణం', low:'తక్కువ ముఖ్యం' },
  'ta-IN': { critical:'மிகவும் அவசரம்', high:'அவசரம்', medium:'சாதாரணம்', low:'குறைந்த முக்கியம்' },
  'kn-IN': { critical:'ತುರ್ತು', high:'ಮುಖ್ಯ', medium:'ಸಾಮಾನ್ಯ', low:'ಕಡಿಮೆ ಮುಖ್ಯ' },
  'ml-IN': { critical:'അടിയന്തിരം', high:'പ്രധാനം', medium:'സാധാരണം', low:'കുറഞ്ഞ പ്രാധാന്യം' },
  'mr-IN': { critical:'अत्यंत तातडीचे', high:'तातडीचे', medium:'सामान्य', low:'कमी महत्त्वाचे' },
  'gu-IN': { critical:'ખૂબ જ જરૂરી', high:'જરૂરી', medium:'સામાન્ય', low:'ઓછું જરૂરી' },
  'pa-IN': { critical:'ਬਹੁਤ ਜ਼ਰੂਰੀ', high:'ਜ਼ਰੂਰੀ', medium:'ਆਮ', low:'ਘੱਟ ਜ਼ਰੂਰੀ' },
  'bn-IN': { critical:'অত্যন্ত জরুরি', high:'জরুরি', medium:'সাধারণ', low:'কম গুরুত্বপূর্ণ' },
  'ur-IN': { critical:'انتہائی ضروری', high:'ضروری', medium:'معمولی', low:'کم اہم' },
};

const STATUS_LABELS = {
  'en-IN': { pending:'Pending', assigned:'Assigned', in_progress:'Being Fixed', resolved:'Resolved', rejected:'Rejected', escalated:'Escalated', closed:'Closed', reopened:'Reopened' },
  'hi-IN': { pending:'लंबित है', assigned:'सौंपा गया', in_progress:'काम चल रहा है', resolved:'हल हो गया', rejected:'अस्वीकार', escalated:'ऊपर भेजा गया', closed:'बंद', reopened:'फिर खोला गया' },
  'te-IN': { pending:'పెండింగ్‌లో ఉంది', assigned:'అప్పగించారు', in_progress:'పని జరుగుతోంది', resolved:'పరిష్కరించారు', rejected:'తిరస్కరించారు', escalated:'పై స్థాయికి పంపారు', closed:'మూసివేశారు', reopened:'మళ్ళీ తెరిచారు' },
  'ta-IN': { pending:'நிலுவையில் உள்ளது', assigned:'ஒதுக்கப்பட்டது', in_progress:'வேலை நடக்கிறது', resolved:'தீர்க்கப்பட்டது', rejected:'நிராகரிக்கப்பட்டது', escalated:'மேல் அனுப்பப்பட்டது', closed:'மூடப்பட்டது', reopened:'மீண்டும் திறக்கப்பட்டது' },
  'kn-IN': { pending:'ಬಾಕಿ ಇದೆ', assigned:'ನಿಯೋಜಿಸಲಾಗಿದೆ', in_progress:'ಕೆಲಸ ನಡೆಯುತ್ತಿದೆ', resolved:'ಪರಿಹರಿಸಲಾಗಿದೆ', rejected:'ತಿರಸ್ಕರಿಸಲಾಗಿದೆ', escalated:'ಮೇಲ್ಮಟ್ಟಕ್ಕೆ ಕಳಿಸಲಾಗಿದೆ', closed:'ಮುಚ್ಚಲಾಗಿದೆ', reopened:'ಮತ್ತೆ ತೆರೆಯಲಾಗಿದೆ' },
  'ml-IN': { pending:'കാത്തിരിക്കുന്നു', assigned:'ഏൽപ്പിച്ചു', in_progress:'പണി നടക്കുന്നു', resolved:'പരിഹരിച്ചു', rejected:'നിരസിച്ചു', escalated:'മേലോട്ട് അയച്ചു', closed:'അടച്ചു', reopened:'വീണ്ടും തുറന്നു' },
  'mr-IN': { pending:'प्रलंबित', assigned:'सोपवले', in_progress:'काम सुरू आहे', resolved:'सोडवले', rejected:'नाकारले', escalated:'वरिष्ठांकडे पाठवले', closed:'बंद', reopened:'पुन्हा उघडले' },
  'gu-IN': { pending:'બાકી છે', assigned:'સોંપ્યું', in_progress:'કામ ચાલુ છે', resolved:'ઉકેલ્યું', rejected:'નકાર્યું', escalated:'ઉપર મોકલ્યું', closed:'બંધ', reopened:'ફરી ખોલ્યું' },
  'pa-IN': { pending:'ਲੰਬਿਤ ਹੈ', assigned:'ਸੌਂਪਿਆ ਗਿਆ', in_progress:'ਕੰਮ ਚੱਲ ਰਿਹਾ ਹੈ', resolved:'ਹੱਲ ਹੋ ਗਿਆ', rejected:'ਰੱਦ ਕੀਤਾ', escalated:'ਉੱਪਰ ਭੇਜਿਆ', closed:'ਬੰਦ', reopened:'ਦੁਬਾਰਾ ਖੋਲ੍ਹਿਆ' },
  'bn-IN': { pending:'অপেক্ষমাণ', assigned:'দায়িত্ব দেওয়া হয়েছে', in_progress:'কাজ চলছে', resolved:'সমাধান হয়েছে', rejected:'প্রত্যাখ্যাত', escalated:'উপরে পাঠানো হয়েছে', closed:'বন্ধ', reopened:'আবার খোলা হয়েছে' },
  'ur-IN': { pending:'زیر التواء', assigned:'سونپا گیا', in_progress:'کام جاری ہے', resolved:'حل ہو گیا', rejected:'مسترد', escalated:'اوپر بھیجا گیا', closed:'بند', reopened:'دوبارہ کھولا گیا' },
};

function tCat(cat, lang) {
  const t = CATEGORY_LABELS[lang] || CATEGORY_LABELS['en-IN'];
  return t[cat] || (cat || '').replace(/_/g, ' ');
}
function tPri(pri, lang) {
  const t = PRIORITY_LABELS[lang] || PRIORITY_LABELS['en-IN'];
  return t[pri] || pri || '';
}
function tStat(stat, lang) {
  const t = STATUS_LABELS[lang] || STATUS_LABELS['en-IN'];
  return t[stat] || (stat || '').replace(/_/g, ' ');
}

// Localized field labels + hints for form fields
const FIELD_STRINGS = {
  'en-IN': {
    complaintTitle:  ['Complaint Title',    'Optional. A title will be auto-generated from your description if left blank.'],
    describeIssue:   ['Describe the Problem', 'Required. Include location, duration, and impact for faster resolution.'],
    category:        ['Category',           'Select the category that best matches your issue.'],
    location:        ['Location',           'Enter your address or use GPS to pin your exact location.'],
  },
  'hi-IN': {
    complaintTitle:  ['शिकायत का शीर्षक',   'वैकल्पिक। यदि खाली छोड़ें तो शीर्षक स्वतः बन जाएगा।'],
    describeIssue:   ['समस्या का विवरण',    'आवश्यक। स्थान, अवधि और प्रभाव शामिल करें।'],
    category:        ['श्रेणी',             'अपनी समस्या के अनुसार सही श्रेणी चुनें।'],
    location:        ['स्थान',              'अपना पता दर्ज करें या GPS से सटीक स्थान चुनें।'],
  },
  'te-IN': {
    complaintTitle:  ['ఫిర్యాదు శీర్షిక',   'ఐచ్ఛికం. ఖాళీగా వదిలితే శీర్షిక స్వయంచాలకంగా రూపొందుతుంది.'],
    describeIssue:   ['సమస్యను వివరించండి', 'అవసరం. స్థానం, వ్యవధి మరియు ప్రభావాన్ని చేర్చండి.'],
    category:        ['వర్గం',              'మీ సమస్యకు సరిపోయే వర్గాన్ని ఎంచుకోండి.'],
    location:        ['స్థానం',             'మీ చిరునామా నమోదు చేయండి లేదా GPS ఉపయోగించండి.'],
  },
  'ta-IN': {
    complaintTitle:  ['புகார் தலைப்பு',     'விருப்பமானது. காலியாக விட்டால் தலைப்பு தானாக உருவாகும்.'],
    describeIssue:   ['பிரச்சனையை விவரிக்கவும்', 'தேவையானது. இடம், காலம் மற்றும் தாக்கத்தை சேர்க்கவும்.'],
    category:        ['வகை',               'உங்கள் பிரச்சனைக்கு பொருத்தமான வகையை தேர்ந்தெடுக்கவும்.'],
    location:        ['இடம்',              'உங்கள் முகவரியை உள்ளிடவும் அல்லது GPS பயன்படுத்தவும்.'],
  },
  'kn-IN': {
    complaintTitle:  ['ದೂರಿನ ಶೀರ್ಷಿಕೆ',   'ಐಚ್ಛಿಕ. ಖಾಲಿ ಬಿಟ್ಟರೆ ಶೀರ್ಷಿಕೆ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ರಚಿಸಲ್ಪಡುತ್ತದೆ.'],
    describeIssue:   ['ಸಮಸ್ಯೆಯನ್ನು ವಿವರಿಸಿ', 'ಅಗತ್ಯ. ಸ್ಥಳ, ಅವಧಿ ಮತ್ತು ಪ್ರಭಾವ ಸೇರಿಸಿ.'],
    category:        ['ವರ್ಗ',              'ನಿಮ್ಮ ಸಮಸ್ಯೆಗೆ ಸರಿಹೊಂದುವ ವರ್ಗ ಆಯ್ಕೆ ಮಾಡಿ.'],
    location:        ['ಸ್ಥಳ',              'ನಿಮ್ಮ ವಿಳಾಸ ನಮೂದಿಸಿ ಅಥವಾ GPS ಬಳಸಿ.'],
  },
  'ml-IN': {
    complaintTitle:  ['പരാതിയുടെ തലക്കെട്ട്', 'ഐച്ഛികം. ഒഴിച്ചിട്ടാൽ തലക്കെട്ട് സ്വയം സൃഷ്ടിക്കപ്പെടും.'],
    describeIssue:   ['പ്രശ്നം വിവരിക്കുക', 'ആവശ്യം. സ്ഥലം, ദൈർഘ്യം, ആഘാതം ഉൾപ്പെടുത്തുക.'],
    category:        ['വിഭാഗം',            'നിങ്ങളുടെ പ്രശ്നത്തിന് അനുയോജ്യമായ വിഭാഗം തിരഞ്ഞെടുക്കുക.'],
    location:        ['സ്ഥലം',             'നിങ്ങളുടെ വിലാസം നൽകുക അല്ലെങ്കിൽ GPS ഉപയോഗിക്കുക.'],
  },
  'mr-IN': {
    complaintTitle:  ['तक्रारीचे शीर्षक',  'पर्यायी. रिकामे सोडल्यास शीर्षक आपोआप तयार होईल.'],
    describeIssue:   ['समस्या सांगा',      'आवश्यक. स्थान, कालावधी आणि परिणाम नमूद करा.'],
    category:        ['श्रेणी',            'तुमच्या समस्येसाठी योग्य श्रेणी निवडा.'],
    location:        ['स्थान',             'तुमचा पत्ता टाका किंवा GPS वापरा.'],
  },
  'gu-IN': {
    complaintTitle:  ['ફરિયાદ શીર્ષક',    'વૈકલ્પિક. ખાલી છોડો તો શીર્ષક આપોઆપ બનશે.'],
    describeIssue:   ['સમસ્યા વર્ણવો',    'જરૂરી. સ્થળ, સમયગાળો અને અસર ઉમેરો.'],
    category:        ['શ્રેણી',            'તમારી સમસ્યા માટે યોગ્ય શ્રેણી પસંદ કરો.'],
    location:        ['સ્થળ',              'તમારું સરનામું દાખલ કરો અથવા GPS વાપરો.'],
  },
  'pa-IN': {
    complaintTitle:  ['ਸ਼ਿਕਾਇਤ ਦਾ ਸਿਰਲੇਖ', 'ਵਿਕਲਪਿਕ। ਖਾਲੀ ਛੱਡੋ ਤਾਂ ਸਿਰਲੇਖ ਆਪਣੇ ਆਪ ਬਣੇਗਾ।'],
    describeIssue:   ['ਸਮੱਸਿਆ ਦੱਸੋ',     'ਲਾਜ਼ਮੀ। ਸਥਾਨ, ਸਮਾਂ ਅਤੇ ਪ੍ਰਭਾਵ ਦੱਸੋ।'],
    category:        ['ਸ਼੍ਰੇਣੀ',           'ਆਪਣੀ ਸਮੱਸਿਆ ਲਈ ਸਹੀ ਸ਼੍ਰੇਣੀ ਚੁਣੋ।'],
    location:        ['ਸਥਾਨ',             'ਆਪਣਾ ਪਤਾ ਦਰਜ ਕਰੋ ਜਾਂ GPS ਵਰਤੋ।'],
  },
  'bn-IN': {
    complaintTitle:  ['অভিযোগের শিরোনাম', 'ঐচ্ছিক। খালি রাখলে শিরোনাম স্বয়ংক্রিয়ভাবে তৈরি হবে।'],
    describeIssue:   ['সমস্যা বর্ণনা করুন', 'প্রয়োজনীয়। স্থান, সময়কাল এবং প্রভাব উল্লেখ করুন।'],
    category:        ['বিভাগ',             'আপনার সমস্যার জন্য সঠিক বিভাগ বেছে নিন।'],
    location:        ['অবস্থান',           'আপনার ঠিকানা লিখুন বা GPS ব্যবহার করুন।'],
  },
  'ur-IN': {
    complaintTitle:  ['شکایت کا عنوان',   'اختیاری۔ خالی چھوڑیں تو عنوان خود بخود بنے گا۔'],
    describeIssue:   ['مسئلہ بیان کریں',  'ضروری۔ مقام، مدت اور اثر شامل کریں۔'],
    category:        ['زمرہ',              'اپنے مسئلے کے لیے مناسب زمرہ منتخب کریں۔'],
    location:        ['مقام',              'اپنا پتہ درج کریں یا GPS استعمال کریں۔'],
  },
};

// ── Natural colloquial phrases per language ───────────────────────────────────
// Rules: no English words for labels/status/category/priority, spoken like a
// neighbour explaining a civic problem — not a government form.

const PHRASES = {
  'en-IN': {
    field: (label, hint) => `${label}. ${hint}`,
    complaint: (c, l) =>
      `${c.title || 'Untitled complaint'}. It's a ${tCat(c.category, l)} issue. ${tPri(c.priority, l)} priority. Currently ${tStat(c.status, l)}.${c.location_address ? ` Located at ${c.location_address}.` : ''} ${c.description ? c.description : ''}`.trim(),
    description: (d) => `Here's what was written: ${d}`,
    classification: (r, l) =>
      `The system identified this as a ${tCat(r.category, l)} issue, ${tPri(r.priority, l)} priority.${r.title ? ` Suggested title: ${r.title}.` : ''} Sent to ${r.department || 'the concerned department'}.`,
  },
  'hi-IN': {
    field: (label, hint) => `${label}। ${hint}`,
    complaint: (c, l) =>
      `${c.title || 'शिकायत'}। यह ${tCat(c.category, l)} से जुड़ी समस्या है। ${tPri(c.priority, l)} मामला है। अभी ${tStat(c.status, l)} है।${c.location_address ? ` जगह: ${c.location_address}।` : ''} ${c.description ? c.description : ''}`.trim(),
    description: (d) => `आपने जो लिखा है वो सुनिए: ${d}`,
    classification: (r, l) =>
      `सिस्टम ने पहचाना कि यह ${tCat(r.category, l)} की समस्या है, ${tPri(r.priority, l)} मामला।${r.title ? ` शीर्षक: ${r.title}।` : ''} ${r.department || 'संबंधित विभाग'} को भेजा गया।`,
  },
  'te-IN': {
    field: (label, hint) => `${label}. ${hint}`,
    complaint: (c, l) =>
      `${c.title || 'ఫిర్యాదు'}. ఇది ${tCat(c.category, l)} సమస్య. ${tPri(c.priority, l)} విషయం. ఇప్పుడు ${tStat(c.status, l)} స్థితిలో ఉంది.${c.location_address ? ` చిరునామా: ${c.location_address}.` : ''} ${c.description ? c.description : ''}`.trim(),
    description: (d) => `మీరు రాసింది ఇది: ${d}`,
    classification: (r, l) =>
      `సిస్టమ్ గుర్తించింది ఇది ${tCat(r.category, l)} సమస్య, ${tPri(r.priority, l)} విషయం.${r.title ? ` పేరు: ${r.title}.` : ''} ${r.department || 'సంబంధిత విభాగం'}కు పంపారు.`,
  },
  'ta-IN': {
    field: (label, hint) => `${label}. ${hint}`,
    complaint: (c, l) =>
      `${c.title || 'புகார்'}. இது ${tCat(c.category, l)} பிரச்சனை. ${tPri(c.priority, l)} விஷயம். இப்போது ${tStat(c.status, l)} நிலையில் உள்ளது.${c.location_address ? ` இடம்: ${c.location_address}.` : ''} ${c.description ? c.description : ''}`.trim(),
    description: (d) => `நீங்கள் எழுதியது இதுதான்: ${d}`,
    classification: (r, l) =>
      `கணினி கண்டறிந்தது இது ${tCat(r.category, l)} பிரச்சனை, ${tPri(r.priority, l)} விஷயம்.${r.title ? ` தலைப்பு: ${r.title}.` : ''} ${r.department || 'சம்பந்தப்பட்ட துறை'}க்கு அனுப்பப்பட்டது.`,
  },
  'kn-IN': {
    field: (label, hint) => `${label}. ${hint}`,
    complaint: (c, l) =>
      `${c.title || 'ದೂರು'}. ಇದು ${tCat(c.category, l)} ಸಮಸ್ಯೆ. ${tPri(c.priority, l)} ವಿಷಯ. ಈಗ ${tStat(c.status, l)} ಸ್ಥಿತಿಯಲ್ಲಿದೆ.${c.location_address ? ` ಜಾಗ: ${c.location_address}.` : ''} ${c.description ? c.description : ''}`.trim(),
    description: (d) => `ನೀವು ಬರೆದದ್ದು ಇದು: ${d}`,
    classification: (r, l) =>
      `ಸಿಸ್ಟಮ್ ಗುರುತಿಸಿದೆ ಇದು ${tCat(r.category, l)} ಸಮಸ್ಯೆ, ${tPri(r.priority, l)} ವಿಷಯ.${r.title ? ` ಹೆಸರು: ${r.title}.` : ''} ${r.department || 'ಸಂಬಂಧಿತ ಇಲಾಖೆ'}ಗೆ ಕಳಿಸಲಾಗಿದೆ.`,
  },
  'ml-IN': {
    field: (label, hint) => `${label}. ${hint}`,
    complaint: (c, l) =>
      `${c.title || 'പരാതി'}. ഇത് ${tCat(c.category, l)} പ്രശ്നമാണ്. ${tPri(c.priority, l)} കാര്യം. ഇപ്പോൾ ${tStat(c.status, l)} ആണ്.${c.location_address ? ` സ്ഥലം: ${c.location_address}.` : ''} ${c.description ? c.description : ''}`.trim(),
    description: (d) => `നിങ്ങൾ എഴുതിയത് ഇതാണ്: ${d}`,
    classification: (r, l) =>
      `സിസ്റ്റം കണ്ടെത്തി ഇത് ${tCat(r.category, l)} പ്രശ്നം, ${tPri(r.priority, l)} കാര്യം.${r.title ? ` പേര്: ${r.title}.` : ''} ${r.department || 'ബന്ധപ്പെട്ട വകുപ്പ്'}ലേക്ക് അയച്ചു.`,
  },
  'mr-IN': {
    field: (label, hint) => `${label}. ${hint}`,
    complaint: (c, l) =>
      `${c.title || 'तक्रार'}. ही ${tCat(c.category, l)} ची समस्या आहे. ${tPri(c.priority, l)} प्रकरण आहे. सध्या ${tStat(c.status, l)} आहे.${c.location_address ? ` ठिकाण: ${c.location_address}.` : ''} ${c.description ? c.description : ''}`.trim(),
    description: (d) => `तुम्ही जे लिहिलंय ते ऐका: ${d}`,
    classification: (r, l) =>
      `सिस्टमने ओळखलं की ही ${tCat(r.category, l)} ची समस्या आहे, ${tPri(r.priority, l)} प्रकरण.${r.title ? ` शीर्षक: ${r.title}.` : ''} ${r.department || 'संबंधित विभाग'}ाकडे पाठवलं.`,
  },
  'gu-IN': {
    field: (label, hint) => `${label}. ${hint}`,
    complaint: (c, l) =>
      `${c.title || 'ફરિયાદ'}. આ ${tCat(c.category, l)} ની સમસ્યા છે. ${tPri(c.priority, l)} મામલો છે. હાલ ${tStat(c.status, l)} છે.${c.location_address ? ` જગ્યા: ${c.location_address}.` : ''} ${c.description ? c.description : ''}`.trim(),
    description: (d) => `તમે જે લખ્યું છે તે સાંભળો: ${d}`,
    classification: (r, l) =>
      `સિસ્ટમે ઓળખ્યું કે આ ${tCat(r.category, l)} ની સમસ્યા છે, ${tPri(r.priority, l)} મામલો.${r.title ? ` શીર્ષક: ${r.title}.` : ''} ${r.department || 'સંબંધિત વિભાગ'}ને મોકલ્યું.`,
  },
  'pa-IN': {
    field: (label, hint) => `${label}। ${hint}`,
    complaint: (c, l) =>
      `${c.title || 'ਸ਼ਿਕਾਇਤ'}। ਇਹ ${tCat(c.category, l)} ਦੀ ਸਮੱਸਿਆ ਹੈ। ${tPri(c.priority, l)} ਮਾਮਲਾ ਹੈ। ਹੁਣ ${tStat(c.status, l)} ਹੈ।${c.location_address ? ` ਜਗ੍ਹਾ: ${c.location_address}।` : ''} ${c.description ? c.description : ''}`.trim(),
    description: (d) => `ਤੁਸੀਂ ਜੋ ਲਿਖਿਆ ਹੈ ਉਹ ਸੁਣੋ: ${d}`,
    classification: (r, l) =>
      `ਸਿਸਟਮ ਨੇ ਪਛਾਣਿਆ ਕਿ ਇਹ ${tCat(r.category, l)} ਦੀ ਸਮੱਸਿਆ ਹੈ, ${tPri(r.priority, l)} ਮਾਮਲਾ।${r.title ? ` ਸਿਰਲੇਖ: ${r.title}।` : ''} ${r.department || 'ਸੰਬੰਧਿਤ ਵਿਭਾਗ'} ਨੂੰ ਭੇਜਿਆ।`,
  },
  'bn-IN': {
    field: (label, hint) => `${label}। ${hint}`,
    complaint: (c, l) =>
      `${c.title || 'অভিযোগ'}। এটা ${tCat(c.category, l)} এর সমস্যা। ${tPri(c.priority, l)} বিষয়। এখন ${tStat(c.status, l)} অবস্থায় আছে।${c.location_address ? ` জায়গা: ${c.location_address}।` : ''} ${c.description ? c.description : ''}`.trim(),
    description: (d) => `আপনি যা লিখেছেন সেটা শুনুন: ${d}`,
    classification: (r, l) =>
      `সিস্টেম চিহ্নিত করেছে এটা ${tCat(r.category, l)} এর সমস্যা, ${tPri(r.priority, l)} বিষয়।${r.title ? ` শিরোনাম: ${r.title}।` : ''} ${r.department || 'সংশ্লিষ্ট দপ্তর'}এ পাঠানো হয়েছে।`,
  },
  'ur-IN': {
    field: (label, hint) => `${label}۔ ${hint}`,
    complaint: (c, l) =>
      `${c.title || 'شکایت'}۔ یہ ${tCat(c.category, l)} کا مسئلہ ہے۔ ${tPri(c.priority, l)} معاملہ ہے۔ ابھی ${tStat(c.status, l)} ہے۔${c.location_address ? ` جگہ: ${c.location_address}۔` : ''} ${c.description ? c.description : ''}`.trim(),
    description: (d) => `آپ نے جو لکھا ہے وہ سنیں: ${d}`,
    classification: (r, l) =>
      `سسٹم نے پہچانا کہ یہ ${tCat(r.category, l)} کا مسئلہ ہے، ${tPri(r.priority, l)} معاملہ۔${r.title ? ` عنوان: ${r.title}۔` : ''} ${r.department || 'متعلقہ محکمہ'} کو بھیجا گیا۔`,
  },
};

function getPhrases(langCode) {
  return PHRASES[langCode] || PHRASES['en-IN'];
}

export function buildFieldPrompt(fieldKey, _unused, langCode) {
  const lang = langCode || 'en-IN';
  const table = FIELD_STRINGS[lang] || FIELD_STRINGS['en-IN'];
  const [label, hint] = table[fieldKey] || FIELD_STRINGS['en-IN'][fieldKey] || [fieldKey, ''];
  return getPhrases(lang).field(label, hint);
}

export function buildComplaintReadout(complaint, langCode) {
  const lang = langCode || 'en-IN';
  return getPhrases(lang).complaint(complaint, lang);
}

// ── Free translation via MyMemory API (no key required) ──────────────────────
const _translationCache = new Map();

async function translateText(text, targetLang) {
  if (!text || !targetLang || targetLang === 'en-IN' || targetLang === 'en') return text;
  // MyMemory uses ISO 639-1 codes like "te", "hi", "ta" etc.
  const targetCode = targetLang.split('-')[0];
  const cacheKey = `${targetCode}::${text}`;
  if (_translationCache.has(cacheKey)) return _translationCache.get(cacheKey);
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetCode}`;
    const res = await fetch(url);
    const json = await res.json();
    const translated = json?.responseData?.translatedText || text;
    _translationCache.set(cacheKey, translated);
    return translated;
  } catch {
    return text; // silent fallback to original
  }
}

export { translateText };

// ── Script detection — maps Unicode block → BCP-47 ───────────────────────────
// Checks the dominant script in the text so the TTS engine uses the right voice
// regardless of what language the UI is set to.
const SCRIPT_RANGES = [
  { re: /[\u0900-\u097F]/, lang: 'hi-IN' },  // Devanagari → Hindi (also covers mr-IN)
  { re: /[\u0C00-\u0C7F]/, lang: 'te-IN' },  // Telugu
  { re: /[\u0B80-\u0BFF]/, lang: 'ta-IN' },  // Tamil
  { re: /[\u0C80-\u0CFF]/, lang: 'kn-IN' },  // Kannada
  { re: /[\u0D00-\u0D7F]/, lang: 'ml-IN' },  // Malayalam
  { re: /[\u0A80-\u0AFF]/, lang: 'gu-IN' },  // Gujarati
  { re: /[\u0A00-\u0A7F]/, lang: 'pa-IN' },  // Gurmukhi (Punjabi)
  { re: /[\u0980-\u09FF]/, lang: 'bn-IN' },  // Bengali
  { re: /[\u0600-\u06FF]/, lang: 'ur-IN' },  // Arabic script → Urdu
  { re: /[\u0900-\u097F]/, lang: 'mr-IN' },  // Devanagari again — mr-IN shares with hi-IN
];

export function detectScriptLang(text) {
  if (!text) return null;
  // Count characters per script to find the dominant one
  const counts = SCRIPT_RANGES.map(({ re, lang }) => ({
    lang,
    count: (text.match(new RegExp(re.source, 'g')) || []).length,
  }));
  const best = counts.reduce((a, b) => (b.count > a.count ? b : a), { count: 0, lang: null });
  return best.count > 2 ? best.lang : null; // need at least 3 chars to be confident
}

export function buildDescriptionReadout(description, uiLangCode) {
  // Always use the UI language for TTS — the user explicitly chose it.
  // Script detection only upgrades to a more specific match when the text
  // contains a clearly different script (e.g. Telugu text when UI is Hindi).
  const detectedLang = detectScriptLang(description);
  const lang = detectedLang || uiLangCode || 'en-IN';
  const rawPrefix = getPhrases(uiLangCode || 'en-IN').description('').replace(/:\s*$/, '');
  const text = `${rawPrefix}: ${description}`;
  return { text, lang };
}

export function buildClassificationReadout(result, langCode) {
  const lang = langCode || 'en-IN';
  return getPhrases(lang).classification(result, lang);
}


