const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'frontend/public/locales');
const languages = ['te', 'ta', 'kn', 'ml', 'mr', 'gu', 'pa', 'bn', 'ur'];

const translations = {
    'te': {
        "nav_my_complaints": "నా ఫిర్యాదులు",
        "nav_admin_panel": "అడ్మిన్ ప్యానెల్",
        "nav_sign_out": "సైన్ అవుట్",
        "nav_notifications": "నోటిఫికేషన్లు",
        "nav_mark_all_read": "అన్నీ చదివినట్లు గుర్తించు",
        "nav_no_notifications": "కొత్త నోటిఫికేషన్లు లేవు",
        "sidebar_navigation": "నావిగేషన్",
        "sidebar_points": "పాయింట్లు",
        "sidebar_resolved": "పరిష్కరించబడింది",
        "install_title": "వేగవంతమైన యాక్సెస్ & ఆఫ్‌లైన్ మద్దతు కోసం మీ ఫోన్‌లో జన్ సమాధాన్‌ను ఇన్‌స్టాల్ చేయండి",
        "install_btn": "ఇన్‌స్టాల్"
    },
    'ta': {
        "nav_my_complaints": "என் புகார்கள்",
        "nav_admin_panel": "நிர்வாகக் குழு",
        "nav_sign_out": "வெளியேறு",
        "nav_notifications": "அறிவிப்புகள்",
        "nav_mark_all_read": "அனைத்தையும் படித்ததாகக் குறிக்கவும்",
        "nav_no_notifications": "புதிய அறிவிப்புகள் இல்லை",
        "sidebar_navigation": "வழிசெலுத்தல்",
        "sidebar_points": "புள்ளிகள்",
        "sidebar_resolved": "தீர்க்கப்பட்டது",
        "install_title": "வேகமான அணுகல் மற்றும் ஆஃப்லைன் ஆதரவுக்காக உங்கள் தொலைபேசியில் ஜன் சமாதானை நிறுவவும்",
        "install_btn": "நிறுவு"
    },
    'kn': {
        "nav_my_complaints": "ನನ್ನ ದೂರುಗಳು",
        "nav_admin_panel": "ನಿರ್ವಾಹಕ ಫಲಕ",
        "nav_sign_out": "ಲಾಗ್ ಔಟ್",
        "nav_notifications": "ಸೂಚನೆಗಳು",
        "nav_mark_all_read": "ಎಲ್ಲವನ್ನೂ ಓದಿದಂತೆ ಗುರುತಿಸಿ",
        "nav_no_notifications": "ಯಾವುದೇ ಹೊಸ ಸೂಚನೆಗಳಿಲ್ಲ",
        "sidebar_navigation": "ನ್ಯಾವಿಗೇಷನ್",
        "sidebar_points": "ಅಂಕಗಳು",
        "sidebar_resolved": "ಪರಿಹರಿಸಲಾಗಿದೆ",
        "install_title": "ವೇಗವದ ಪ್ರವೇಶ ಮತ್ತು ಆಫ್‌ಲೈನ್ ಬೆಂಬಲಕ್ಕಾಗಿ ನಿಮ್ಮ ಫೋನ್‌ನಲ್ಲಿ ಜನ್ ಸಮಾಧಾನವನ್ನು ಸ್ಥಾಪಿಸಿ",
        "install_btn": "ಸ್ಥಾಪಿಸಿ"
    },
    'ml': {
        "nav_my_complaints": "എന്റെ പരാതികൾ",
        "nav_admin_panel": "അഡ്മിൻ പാനൽ",
        "nav_sign_out": "സൈൻ ഔട്ട്",
        "nav_notifications": "അറിയിപ്പുകൾ",
        "nav_mark_all_read": "എല്ലാം വായിച്ചതായി അടയാളപ്പെടുത്തുക",
        "nav_no_notifications": "പുതിയ അറിയിപ്പുകളൊന്നുമില്ല",
        "sidebar_navigation": "നാവിഗേഷൻ",
        "sidebar_points": "പോയിന്റുകൾ",
        "sidebar_resolved": "പരിഹരിച്ചു",
        "install_title": "വേഗത്തിലുള്ള ആക്‌സസിനും ഓഫ്‌ലൈൻ പിന്തുണയ്ക്കുമായി നിങ്ങളുടെ ഫോണിൽ ജൻ സമാധാൻ ഇൻസ്റ്റാൾ ചെയ്യുക",
        "install_btn": "ഇൻസ്റ്റാൾ ചെയ്യുക"
    },
    'mr': {
        "nav_my_complaints": "माझ्या तक्रारी",
        "nav_admin_panel": "प्रशासन पॅनेल",
        "nav_sign_out": "बाहेर पडा",
        "nav_notifications": "सूचना",
        "nav_mark_all_read": "सर्व वाचलेले म्हणून चिन्हांकित करा",
        "nav_no_notifications": "कोणत्याही नवीन सूचना नाहीत",
        "sidebar_navigation": "नेव्हिगेशन",
        "sidebar_points": "गुण",
        "sidebar_resolved": "निराकरण झाले",
        "install_title": "जलद प्रवेश आणि ऑफलाइन समर्थनासाठी या फोनवर जन समाधान इंस्टॉल करा",
        "install_btn": "इंस्टॉल करा"
    },
    'gu': {
        "nav_my_complaints": "મારી ફરિયાદો",
        "nav_admin_panel": "એડમિન પેનલ",
        "nav_sign_out": "સાઇન આઉટ",
        "nav_notifications": "સૂચનાઓ",
        "nav_mark_all_read": "બધા વાંચેલા તરીકે ચિહ્નિત કરો",
        "nav_no_notifications": "કોઈ નવી સૂચનાઓ નથી",
        "sidebar_navigation": "નેવિગેશન",
        "sidebar_points": "પોઈન્ટ્સ",
        "sidebar_resolved": "ઉકેલાયેલ",
        "install_title": "ઝડપી ઍક્સેસ અને ઑફલાઇન સપોર્ટ માટે તમારા ફોન પર જન સમાધાન ઇન્સ્ટોલ કરો",
        "install_btn": "ઇન્સ્ટોલ કરો"
    },
    'pa': {
        "nav_my_complaints": "ਮੇਰੀਆਂ ਸ਼ਿਕਾਇਤਾਂ",
        "nav_admin_panel": "ਐਡਮਿਨ ਪੈਨਲ",
        "nav_sign_out": "ਸਾਈਨ ਆਉਟ",
        "nav_notifications": "ਸੂਚਨਾਵਾਂ",
        "nav_mark_all_read": "ਸਭ ਨੂੰ ਪੜ੍ਹਿਆ ਨਿਸ਼ਾਨ ਲਗਾਓ",
        "nav_no_notifications": "ਕੋਈ ਨਵੀਂ ਸੂਚਨਾ ਨਹੀਂ",
        "sidebar_navigation": "ਨੈਵੀਗੇਸ਼ਨ",
        "sidebar_points": "ਅੰਕ",
        "sidebar_resolved": "ਹੱਲ ਕੀਤਾ",
        "install_title": "ਤੇਜ਼ ਪਹੁੰਚ ਅਤੇ ਔਫਲਾਈਨ ਸਹਾਇਤਾ ਲਈ ਆਪਣੇ ਫ਼ੋਨ 'ਤੇ ਜਨ ਸਮਾਧਾਨ ਸਥਾਪਤ ਕਰੋ",
        "install_btn": "ਸਥਾਪਤ ਕਰੋ"
    },
    'bn': {
        "nav_my_complaints": "আমার অভিযোগ",
        "nav_admin_panel": "অ্যাডমিন প্যানেল",
        "nav_sign_out": "সাইন আউট",
        "nav_notifications": "বিজ্ঞপ্তি",
        "nav_mark_all_read": "সব পড়া হিসেবে চিহ্নিত করুন",
        "nav_no_notifications": "কোন নতুন বিজ্ঞপ্তি নেই",
        "sidebar_navigation": "নেভিগেশন",
        "sidebar_points": "পয়েন্ট",
        "sidebar_resolved": "সমাধিত",
        "install_title": "দ্রুত অ্যাক্সেস এবং অফলাইন সহায়তার জন্য আপনার ফোনে জন সমাধান ইনস্টল করুন",
        "install_btn": "ইনস্টল করুন"
    },
    'ur': {
        "nav_my_complaints": "میری شکایات",
        "nav_admin_panel": "ایڈمن پینل",
        "nav_sign_out": "سائن آؤટ",
        "nav_notifications": "اطلاعات",
        "nav_mark_all_read": "سب کو پڑھا ہوا نشان زد کریں",
        "nav_no_notifications": "کوئی نئی اطلاع نہیں",
        "sidebar_navigation": "نیویگیشن",
        "sidebar_points": "پوائنٹس",
        "sidebar_resolved": "حل شدہ",
        "install_title": "تیز رسائی اور آف لائن سپورٹ کے لیے اپنے فون پر جن سمادھان انسٹال کریں",
        "install_btn": "انسٹال کریں"
    }
};

for (const code of languages) {
    const filePath = path.join(localesDir, code, 'translation.json');
    if (fs.existsSync(filePath)) {
        try {
            const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            // Update navbar & sidebar
            if (translations[code]) {
                for (const [key, value] of Object.entries(translations[code])) {
                    if (key.startsWith('install_')) {
                        if (!content.install) content.install = {};
                        content.install[key.replace('install_', '')] = value;
                    } else {
                        content[key] = value;
                    }
                }
            }

            fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
            console.log(`Updated navbar/sidebar in ${code}/translation.json`);
        } catch (e) {
            console.error(`Error updating ${code}:`, e);
        }
    } else {
        console.log(`File not found for ${code}, skipping.`);
    }
}
