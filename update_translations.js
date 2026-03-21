const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, 'frontend/public/locales/en/translation.json');
const hiPath = path.join(__dirname, 'frontend/public/locales/hi/translation.json');

// Deep merge function
function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

const enNew = {
  "nav_dashboard": "Dashboard",
  "nav_my_profile": "My Profile",
  "nav_my_complaints": "My Complaints",
  "nav_admin_panel": "Admin Panel",
  "nav_sign_out": "Sign Out",
  "nav_skip": "Skip to main content",
  "nav_high_contrast": "High Contrast",
  "nav_dark_mode_on": "Dark Mode On",
  "nav_text_size": "Text Size",
  "nav_notifications": "Notifications",
  "nav_mark_all_read": "Mark all read",
  "nav_no_notifications": "No new notifications",
  "sidebar_navigation": "Navigation",
  "sidebar_points": "Points",
  "sidebar_resolved": "Resolved",
  "install": {
    "title": "Install JanSamadhan on your phone for faster access & offline support",
    "btn": "Install"
  },
  "file_complaint": {
    "step1_short": "Describe",
    "step2_short": "Location",
    "step3_short": "Review"
  },
  "landing": {
    "hier_country": "Country",
    "hier_state": "State",
    "hier_district": "District",
    "hier_corp": "Corporation",
    "hier_muni": "Municipality",
    "hier_taluka": "Taluka",
    "hier_mandal": "Mandal",
    "hier_gp": "Gram Panchayat",
    "foot_govt": "Ministry of Electronics & IT, Govt. of India",
    "accessibility_statement": "Accessibility Statement",
    "feat_1_title": "File Complaints Easily",
    "feat_1_desc": "Report civic issues with photos, location, and description in minutes",
    "feat_2_title": "Smart NLP Classification",
    "feat_2_desc": "AI automatically categorizes & routes your complaint to the right department",
    "feat_3_title": "Precise Location Tracking",
    "feat_3_desc": "From State to Gram Panchayat — exact location hierarchy for faster resolution",
    "feat_4_title": "Real-time Updates",
    "feat_4_desc": "Get notified at every step from filing to resolution",
    "feat_5_title": "Hotspot Mapping",
    "feat_5_desc": "See where issues cluster in your area with interactive maps",
    "feat_6_title": "Gamified Civic Participation",
    "feat_6_desc": "Earn points and badges for being an active citizen",
    "feat_7_title": "Transparent Dashboards",
    "feat_7_desc": "Track resolution rates, SLA compliance, and department performance",
    "feat_8_title": "Duplicate Detection",
    "feat_8_desc": "Similar complaints auto-merged to amplify your voice"
  },
  "badges": {
    "newcomer": "Newcomer",
    "contributor": "Contributor",
    "active_citizen": "Active Citizen",
    "champion": "Champion",
    "civic_hero": "Civic Hero",
    "new_officer": "New Officer",
    "active_officer": "Active Officer",
    "efficient_officer": "Efficient Officer",
    "star_officer": "Star Officer",
    "excellence_award": "Excellence Award"
  }
};

const hiNew = {
  "nav_dashboard": "डैशबोर्ड",
  "nav_my_profile": "मेरी प्रोफ़ाइल",
  "nav_my_complaints": "मेरी शिकायतें",
  "nav_admin_panel": "एडमिन पैनल",
  "nav_sign_out": "साइन आउट",
  "nav_skip": "मुख्य सामग्री पर जाएं",
  "nav_high_contrast": "उच्च कंट्रास्ट",
  "nav_dark_mode_on": "डार्क मोड ऑन",
  "nav_text_size": "टेक्स्ट का आकार",
  "nav_notifications": "सूचनाएं",
  "nav_mark_all_read": "सभी को पढ़ा हुआ मार्क करें",
  "nav_no_notifications": "कोई नई सूचना नहीं",
  "sidebar_navigation": "नेविगेशन",
  "sidebar_points": "अंक",
  "sidebar_resolved": "समाधान हुआ",
  "install": {
    "title": "तेज़ पहुंच और ऑफ़लाइन सहायता के लिए अपने फ़ोन पर जन समाधान इंस्टॉल करें",
    "btn": "इंस्टॉल करें"
  },
  "file_complaint": {
    "step1_short": "विवरण",
    "step2_short": "स्थान",
    "step3_short": "समीक्षा"
  },
  "landing": {
    "hier_country": "देश",
    "hier_state": "राज्य",
    "hier_district": "जिला",
    "hier_corp": "निगम",
    "hier_muni": "नगर पालिका",
    "hier_taluka": "तालुका",
    "hier_mandal": "मंडल",
    "hier_gp": "ग्राम पंचायत",
    "foot_govt": "इलेक्ट्रॉनिकी और सूचना प्रौद्योगिकी मंत्रालय, भारत सरकार",
    "accessibility_statement": "एक्सेसिबिलिटी स्टेटमेंट",
    "feat_1_title": "शिकायत दर्ज करना आसान",
    "feat_1_desc": "फोटो, स्थान और विवरण के साथ मिनटों में नागरिक समस्याओं की रिपोर्ट करें",
    "feat_2_title": "स्मार्ट NLP वर्गीकरण",
    "feat_2_desc": "AI स्वचालित रूप से आपकी शिकायत को वर्गीकृत करता है और सही विभाग तक पहुँचाता है",
    "feat_3_title": "सटीक स्थान ट्रैकिंग",
    "feat_3_desc": "राज्य से ग्राम पंचायत तक — तेज़ समाधान के लिए सटीक स्थान पदानुक्रम",
    "feat_4_title": "रीअल-टाइम अपडेट",
    "feat_4_desc": "फाइल करने से लेकर समाधान तक हर कदम पर सूचना प्राप्त करें",
    "feat_5_title": "हॉटस्पॉट मैपिंग",
    "feat_5_desc": "देखें कि आपके क्षेत्र में समस्याएँ कहाँ केंद्रित हैं",
    "feat_6_title": "गेमफ़ाइड नागरिक भागीदारी",
    "feat_6_desc": "सक्रिय नागरिक होने के लिए अंक और बैज अर्जित करें",
    "feat_7_title": "पारदर्शी डैशबोर्ड",
    "feat_7_desc": "समाधान दर, SLA अनुपालन और विभाग के प्रदर्शन को ट्रैक करें",
    "feat_8_title": "डुप्लीकेट पहचान",
    "feat_8_desc": "आपकी आवाज़ को बुलंद करने के लिए समान शिकायतें स्वतः मर्ज हो जाती हैं"
  },
  "badges": {
    "newcomer": "नवागंतुक",
    "contributor": "योगदानकर्ता",
    "active_citizen": "सक्रिय नागरिक",
    "champion": "चैंपियन",
    "civic_hero": "नागरिक नायक",
    "new_officer": "नए अधिकारी",
    "active_officer": "सक्रिय अधिकारी",
    "efficient_officer": "कुशल अधिकारी",
    "star_officer": "स्टार अधिकारी",
    "excellence_award": "उत्कृष्टता पुरस्कार"
  }
};

let enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
let hiData = JSON.parse(fs.readFileSync(hiPath, 'utf8'));

enData = deepMerge(enData, enNew);
hiData = deepMerge(hiData, hiNew);

fs.writeFileSync(enPath, JSON.stringify(enData, null, 2));
fs.writeFileSync(hiPath, JSON.stringify(hiData, null, 2));
console.log("Translations updated!");
