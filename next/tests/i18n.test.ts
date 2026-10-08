import { describe, it, expect } from "vitest";
import { LANGUAGES, TRANSLATIONS, useLanguage, type Language } from "../lib/i18n";

describe("i18n Multi-Language Support", () => {
  const expectedLanguages: Language[] = ["en", "bn", "hi", "de", "ja", "es", "fr", "ar"];

  it("registers all 8 required languages", () => {
    const codes = LANGUAGES.map((l) => l.code);
    expectedLanguages.forEach((lang) => {
      expect(codes).toContain(lang);
    });
    expect(LANGUAGES.length).toBe(8);
  });

  it("configures Arabic with RTL direction and others with LTR", () => {
    const arabic = LANGUAGES.find((l) => l.code === "ar");
    expect(arabic?.dir).toBe("rtl");

    const english = LANGUAGES.find((l) => l.code === "en");
    expect(english?.dir).toBe("ltr");

    const bangla = LANGUAGES.find((l) => l.code === "bn");
    expect(bangla?.dir).toBe("ltr");
  });

  it("provides core navigation and beginner explainer keys across all 8 languages", () => {
    const essentialKeys = [
      "home",
      "explore",
      "timeline",
      "compare",
      "review",
      "about",
      "team",
      "raDecTitle",
      "epochTitle",
      "bandTitle",
      "differenceTitle",
      "citizenReviewTitle",
    ];

    expectedLanguages.forEach((lang) => {
      const dict = TRANSLATIONS[lang];
      expect(dict).toBeDefined();
      essentialKeys.forEach((k) => {
        expect(dict[k]).toBeDefined();
        expect(dict[k].length).toBeGreaterThan(0);
      });
    });
  });

  it("translates navigation items dynamically via useLanguage hook", () => {
    const { setLanguage, t } = useLanguage.getState();

    // English
    setLanguage("en");
    expect(t("home")).toBe("Home");
    expect(t("explore")).toBe("Explore Sky");

    // Bangla (Team A-JINX native language)
    setLanguage("bn");
    expect(t("home")).toBe("মূলপাতা");
    expect(t("explore")).toBe("মহাকাশ দেখুন");

    // German
    setLanguage("de");
    expect(t("home")).toBe("Startseite");

    // Japanese
    setLanguage("ja");
    expect(t("home")).toBe("ホーム");

    // Fallback to English
    setLanguage("en");
    expect(t("home")).toBe("Home");
  });
});
