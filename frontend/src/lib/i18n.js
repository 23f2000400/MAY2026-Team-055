import i18next from "i18next";
import { initReactI18next } from "react-i18next";

// Manual language detection: localStorage.nirog_lang → browser lang → "en"
function detectLanguage() {
  try {
    const stored = localStorage.getItem("nirog_lang");
    if (stored) return stored;
  } catch (_) {
    // localStorage unavailable (e.g. SSR or private browsing restriction)
  }
  const browserLang = navigator.language || navigator.userLanguage || "en";
  // Normalise: "hi-IN" → "hi", "en-US" → "en"
  const code = browserLang.split("-")[0].toLowerCase();
  return code === "hi" ? "hi" : "en";
}

const resources = {
  en: {
    translation: {
      nav: {
        book: "Book",
        myBookings: "My bookings",
        medicines: "Medicines",
        family: "Family",
        settings: "Settings",
        questions: "Questions",
        overview: "Overview",
        analytics: "Analytics",
        logout: "Logout",
      },
      booking: {
        whereDoesItHurt: "Where does it hurt today?",
        pickASlot: "Pick a slot",
        confirmAndPay: "Confirm & pay deposit",
        youreBooked: "You're booked.",
      },
      common: {
        loading: "Loading…",
        refresh: "Refresh",
        back: "Back",
        cancel: "Cancel",
        save: "Save",
        submit: "Submit",
      },
      medicine: {
        todayProgress: "Today's progress",
        streak: "Streak",
        markTaken: "Mark taken",
        taken: "Taken",
      },
    },
  },
  hi: {
    translation: {
      nav: {
        book: "बुक करें",
        myBookings: "मेरी बुकिंग",
        medicines: "दवाइयाँ",
        family: "परिवार",
        settings: "सेटिंग्स",
        questions: "प्रश्न",
        overview: "अवलोकन",
        analytics: "विश्लेषण",
        logout: "लॉग आउट",
      },
      booking: {
        whereDoesItHurt: "आज कहाँ दर्द है?",
        pickASlot: "समय चुनें",
        confirmAndPay: "पुष्टि करें और जमा करें",
        youreBooked: "आपकी बुकिंग हो गई।",
      },
      common: {
        loading: "लोड हो रहा है…",
        refresh: "ताज़ा करें",
        back: "वापस",
        cancel: "रद्द करें",
        save: "सेव करें",
        submit: "जमा करें",
      },
      medicine: {
        todayProgress: "आज की प्रगति",
        streak: "लकीर",
        markTaken: "ली हुई मार्क करें",
        taken: "ली गई",
      },
    },
  },
};

i18next.use(initReactI18next).init({
  resources,
  lng: detectLanguage(),
  fallbackLng: "en",
  interpolation: {
    // React already escapes values
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

/**
 * Change the active language and persist the choice to localStorage.
 * @param {"en"|"hi"} lang
 */
export function changeLanguage(lang) {
  i18next.changeLanguage(lang);
  try {
    localStorage.setItem("nirog_lang", lang);
  } catch (_) {
    // ignore
  }
}

export default i18next;
