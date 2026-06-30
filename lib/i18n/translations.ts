export const translations = {
  en: {
    home: "Home", how: "How it works", passenger: "Passenger", goods: "Goods", driver: "Driver", safety: "Safety", login: "Login", register: "Register",
    tagline: "Return Trips Made Useful", heroTitle: "Don’t Let Return Trips Go Empty", heroCopy: "Backhaul connects verified return vehicles with passengers and goods moving on the same or nearby route at fixed prices.",
    bookSeat: "Book Return Seat", sendGoods: "Send Goods", becomeCaptain: "Become a Backhaul Captain", fixedPrice: "Fixed smart price", verified: "Verified vehicles", liveTracking: "Live tracking",
    chooseRoute: "Choose any pickup and drop", findMatch: "Find return vehicles", confirm: "Confirm at a fixed price", track: "Track safely to arrival",
    services: "One return route. More useful journeys.", passengerService: "Share an empty passenger seat with a verified RouteMate match.", goodsService: "Use available permitted cargo space for goods moving along the route.", driverService: "Post any return route and turn unused capacity into earnings.",
    noBargain: "No bargaining. Only fixed smart pricing.", popular: "Routes moving right now", language: "Language", dashboard: "Dashboard", logout: "Log out"
  },
  te: {
    home: "హోమ్", how: "ఎలా పనిచేస్తుంది", passenger: "ప్రయాణికుడు", goods: "సరుకులు", driver: "డ్రైవర్", safety: "భద్రత", login: "లాగిన్", register: "నమోదు",
    tagline: "తిరుగు ప్రయాణాలు ఉపయోగకరం", heroTitle: "తిరుగు ప్రయాణాలను ఖాళీగా వదలకండి", heroCopy: "అదే లేదా సమీప మార్గంలో ప్రయాణించే వ్యక్తులు, సరుకులను ధృవీకరించిన తిరుగు వాహనాలతో స్థిర ధరకు బ్యాక్‌హాల్ కలుపుతుంది.",
    bookSeat: "తిరుగు సీటు బుక్ చేయండి", sendGoods: "సరుకులు పంపండి", becomeCaptain: "బ్యాక్‌హాల్ కెప్టెన్ అవ్వండి", fixedPrice: "స్థిర స్మార్ట్ ధర", verified: "ధృవీకరించిన వాహనాలు", liveTracking: "లైవ్ ట్రాకింగ్",
    chooseRoute: "ఏ పికప్, డ్రాప్ అయినా ఎంచుకోండి", findMatch: "తిరుగు వాహనాలను కనుగొనండి", confirm: "స్థిర ధరకు నిర్ధారించండి", track: "గమ్యం వరకు సురక్షితంగా ట్రాక్ చేయండి",
    services: "ఒక తిరుగు మార్గం. మరిన్ని ఉపయోగకర ప్రయాణాలు.", passengerService: "ధృవీకరించిన రూట్‌మేట్‌తో ఖాళీ ప్రయాణికుల సీటును పంచుకోండి.", goodsService: "మార్గంలో వెళ్లే సరుకుల కోసం అనుమతించిన ఖాళీ స్థలాన్ని ఉపయోగించండి.", driverService: "ఏ తిరుగు మార్గాన్నైనా పోస్ట్ చేసి, ఖాళీ సామర్థ్యంతో సంపాదించండి.",
    noBargain: "బేరసారాలు లేవు. స్థిర స్మార్ట్ ధర మాత్రమే.", popular: "ఇప్పుడు కదులుతున్న మార్గాలు", language: "భాష", dashboard: "డ్యాష్‌బోర్డ్", logout: "లాగ్ అవుట్"
  },
  hi: {
    home: "होम", how: "कैसे काम करता है", passenger: "यात्री", goods: "सामान", driver: "ड्राइवर", safety: "सुरक्षा", login: "लॉग इन", register: "रजिस्टर",
    tagline: "वापसी यात्राएँ उपयोगी बनाएं", heroTitle: "वापसी की यात्रा खाली न जाने दें", heroCopy: "बैकहॉल सत्यापित वापसी वाहनों को उसी या पास के मार्ग पर जाने वाले यात्रियों और सामान से तय कीमत पर जोड़ता है।",
    bookSeat: "वापसी सीट बुक करें", sendGoods: "सामान भेजें", becomeCaptain: "बैकहॉल कैप्टन बनें", fixedPrice: "तय स्मार्ट कीमत", verified: "सत्यापित वाहन", liveTracking: "लाइव ट्रैकिंग",
    chooseRoute: "कोई भी पिकअप और ड्रॉप चुनें", findMatch: "वापसी वाहन खोजें", confirm: "तय कीमत पर पुष्टि करें", track: "सुरक्षित रूप से ट्रैक करें",
    services: "एक वापसी मार्ग। अधिक उपयोगी यात्राएँ।", passengerService: "सत्यापित रूटमेट के साथ खाली यात्री सीट साझा करें।", goodsService: "मार्ग पर जाने वाले सामान के लिए अनुमत खाली जगह का उपयोग करें।", driverService: "कोई भी वापसी मार्ग पोस्ट करें और खाली क्षमता से कमाएँ।",
    noBargain: "कोई मोलभाव नहीं। केवल तय स्मार्ट कीमत।", popular: "अभी चल रहे मार्ग", language: "भाषा", dashboard: "डैशबोर्ड", logout: "लॉग आउट"
  }
} as const;

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;
