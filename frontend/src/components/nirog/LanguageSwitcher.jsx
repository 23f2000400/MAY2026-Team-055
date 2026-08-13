import React from "react";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "@/lib/i18n";

const LANGS = [
  { code: "en", label: "EN", testId: "lang-en" },
  { code: "hi", label: "हि", testId: "lang-hi" },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const active = i18n?.language ? i18n.language.split("-")[0] : "en";

  return (
    <div className="flex items-center gap-1 rounded-full border border-charcoal/10 p-0.5 bg-white/60 backdrop-blur-sm">
      {LANGS.map(({ code, label, testId }) => {
        const isActive = active === code;
        return (
          <button
            key={code}
            data-testid={testId}
            onClick={() => changeLanguage(code)}
            className={[
              "px-3 py-1 rounded-full text-sm font-body transition-colors duration-200 select-none",
              isActive
                ? "bg-charcoal text-bone"
                : "text-charcoal/60 hover:text-charcoal",
            ].join(" ")}
            aria-pressed={isActive}
            aria-label={code === "en" ? "English" : "हिन्दी"}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
