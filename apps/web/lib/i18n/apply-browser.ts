import type { Lang } from "@/lib/i18n/languages";

// The words for the apply agent's browser run, in Tamil and English. Field labels arrive from
// the lender's page as they are; amounts are typed by code and never shown here.

export type ApplyBrowserWords = {
  start: string;
  hint: string;
  opened: string;
  page: (title: string) => string;
  filled: (field: string) => string;
  chosen: (field: string, option: string) => string;
  left: (field: string) => string;
  blocked: (field: string) => string;
  pressed: (button: string) => string;
  yourTurn: string;
  stoppedEarly: string;
  failed: string;
};

const en: ApplyBrowserWords = {
  start: "Let the agent fill it in a browser",
  hint: "It opens the sandbox lender portal in a real browser, fills it from your records, and stops at the OTP for you. Nothing reaches a real lender.",
  opened: "Opened the lender's form",
  page: (title) => `Reading the page: ${title}`,
  filled: (field) => `Filled from your records: ${field}`,
  chosen: (field, option) => `${field}: chose ${option}`,
  left: (field) => `Left for you: ${field}`,
  blocked: (field) => `Stopped by your rules: ${field}`,
  pressed: (button) => `Pressed ${button}`,
  yourTurn: "Your turn: enter your Aadhaar and the OTP on your phone. The agent never does.",
  stoppedEarly: "The agent stopped. The form is open for you to finish.",
  failed: "Could not open the browser just now.",
};

const ta: ApplyBrowserWords = {
  start: "முகவர் உலாவியில் நிரப்பட்டும்",
  hint: "சோதனைக் கடன் தளத்தை உண்மையான உலாவியில் திறந்து, உங்கள் பதிவுகளிலிருந்து நிரப்பி, OTP-யில் உங்களுக்காக நிற்கும். எந்த உண்மையான கடன் நிறுவனத்துக்கும் எதுவும் போகாது.",
  opened: "கடன் படிவத்தைத் திறந்தேன்",
  page: (title) => `பக்கத்தைப் படிக்கிறேன்: ${title}`,
  filled: (field) => `உங்கள் பதிவுகளிலிருந்து நிரப்பினேன்: ${field}`,
  chosen: (field, option) => `${field}: ${option} தேர்ந்தெடுத்தேன்`,
  left: (field) => `உங்களுக்காக விட்டேன்: ${field}`,
  blocked: (field) => `உங்கள் விதிகள் நிறுத்தின: ${field}`,
  pressed: (button) => `${button} அழுத்தினேன்`,
  yourTurn:
    "இனி நீங்கள்: உங்கள் ஆதாரையும் தொலைபேசியில் வரும் OTP-யையும் நிரப்புங்கள். முகவர் ஒருபோதும் செய்யாது.",
  stoppedEarly: "முகவர் நின்றது. படிவம் நீங்கள் முடிக்கத் திறந்திருக்கிறது.",
  failed: "இப்போது உலாவியைத் திறக்க முடியவில்லை.",
};

export function applyBrowserWordsFor(lang: Lang): ApplyBrowserWords {
  return lang === "ta" ? ta : en;
}
