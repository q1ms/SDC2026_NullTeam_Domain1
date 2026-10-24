import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type AppLanguage = "en" | "ms" | "zh";
export type TranslationKey = keyof typeof translations.en;

const translations = {
  en: {
    "language.label": "Language",
    "navigation.chapter": "Your next chapter",
    "navigation.profile": "Your profile",
    "navigation.radar": "Skills radar",
    "navigation.pathways": "Career pathways",
    "header.kicker": "Career resilience, made personal",
    "header.saved": "Profile saved",
    "header.guide": "A practical guide to what’s next",
    "profile.eyebrow": "A little about you",
    "profile.title": "Your experience is a strong starting point.",
    "profile.subtitle": "Start quick, or add the detail that tells your story. Both views edit the same profile, saved on this device.",
    "profile.quick": "Quick profile",
    "profile.detailed": "Detailed profile",
    "profile.experience": "Your experience",
    "profile.curiosity": "What draws your attention?",
    "profile.identity": "Professional identity",
    "profile.background": "Background",
    "profile.learning": "Learning preferences",
    "radar.eyebrow": "Live AI topics · recent news",
    "radar.title": "A clearer view of what’s changing.",
    "radar.subtitle": "Five current AI themes extracted from public news coverage, with source articles so you can explore the signal for yourself.",
    "radar.coverage": "Recent coverage",
    "radar.evidence": "Evidence behind pathway rankings",
    "pathway.eyebrow": "Your next chapter",
    "pathway.title": "Good options. Clear next steps.",
    "pathway.emptyTitle": "A route that starts where you are.",
    "pathway.noGeneratedTitle": "Your next steps start here.",
    "pathway.noProfile": "Your profile helps make this personal.",
    "pathway.noPaths": "No career paths have been generated yet.",
    "pathway.scenarios": "Career scenarios",
  },
  ms: {
    "language.label": "Bahasa",
    "navigation.chapter": "Langkah seterusnya",
    "navigation.profile": "Profil anda",
    "navigation.radar": "Radar kemahiran",
    "navigation.pathways": "Laluan kerjaya",
    "header.kicker": "Ketahanan kerjaya, untuk anda",
    "header.saved": "Profil disimpan",
    "header.guide": "Panduan praktikal untuk langkah seterusnya",
    "profile.eyebrow": "Kenali diri anda",
    "profile.title": "Pengalaman anda ialah asas yang kukuh.",
    "profile.subtitle": "Mulakan dengan ringkas atau tambah butiran tentang pengalaman anda. Kedua-dua paparan menggunakan profil yang sama dan disimpan pada peranti ini.",
    "profile.quick": "Profil ringkas",
    "profile.detailed": "Profil terperinci",
    "profile.experience": "Pengalaman anda",
    "profile.curiosity": "Bidang yang menarik minat anda",
    "profile.identity": "Maklumat profesional",
    "profile.background": "Latar belakang",
    "profile.learning": "Keutamaan pembelajaran",
    "radar.eyebrow": "Topik AI semasa · berita terkini",
    "radar.title": "Lihat dengan lebih jelas perubahan yang berlaku.",
    "radar.subtitle": "Lima tema AI terkini daripada liputan berita awam, dengan sumber untuk anda meneliti maklumat tersebut.",
    "radar.coverage": "Liputan terkini",
    "radar.evidence": "Bukti di sebalik kedudukan laluan kerjaya",
    "pathway.eyebrow": "Langkah seterusnya",
    "pathway.title": "Pilihan yang baik. Langkah seterusnya yang jelas.",
    "pathway.emptyTitle": "Laluan yang bermula dari kedudukan anda.",
    "pathway.noGeneratedTitle": "Langkah seterusnya bermula di sini.",
    "pathway.noProfile": "Profil anda membantu menyesuaikan cadangan ini.",
    "pathway.noPaths": "Laluan kerjaya belum dijana.",
    "pathway.scenarios": "Senario kerjaya",
  },
  zh: {
    "language.label": "语言",
    "navigation.chapter": "你的下一步",
    "navigation.profile": "个人资料",
    "navigation.radar": "技能趋势",
    "navigation.pathways": "职业路径",
    "header.kicker": "为你打造的职业发展指南",
    "header.saved": "个人资料已保存",
    "header.guide": "探索职业发展的实用指南",
    "profile.eyebrow": "关于你",
    "profile.title": "你的经验是坚实的起点。",
    "profile.subtitle": "你可以快速填写，也可以补充更多经历。两种模式使用同一份个人资料，并保存在此设备上。",
    "profile.quick": "快速填写",
    "profile.detailed": "详细资料",
    "profile.experience": "你的经历",
    "profile.curiosity": "你感兴趣的领域",
    "profile.identity": "职业信息",
    "profile.background": "背景经历",
    "profile.learning": "学习偏好",
    "radar.eyebrow": "实时 AI 话题 · 最新资讯",
    "radar.title": "更清晰地了解正在发生的变化。",
    "radar.subtitle": "从公开新闻中提取的五个近期 AI 主题，并提供原始来源供你进一步了解。",
    "radar.coverage": "近期报道",
    "radar.evidence": "职业路径排名依据",
    "pathway.eyebrow": "你的下一步",
    "pathway.title": "更多选择，清晰的下一步。",
    "pathway.emptyTitle": "从你当前的起点开始规划。",
    "pathway.noGeneratedTitle": "从这里开始你的下一步。",
    "pathway.noProfile": "完善个人资料，让建议更贴近你的情况。",
    "pathway.noPaths": "尚未生成职业路径。",
    "pathway.scenarios": "职业发展方案",
  },
} as const;

const STORAGE_KEY = "northstar-career-language";
type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: TranslationKey) => string;
};
const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  setLanguage: () => {},
  t: (key) => translations.en[key],
});

function readSavedLanguage(): AppLanguage {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "ms" || saved === "zh" || saved === "en" ? saved : "en";
  } catch {
    return "en";
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>(readSavedLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // The language still applies for this session if browser storage is unavailable.
    }
  }, [language]);

  const value: LanguageContextValue = {
    language,
    setLanguage,
    t: (key: TranslationKey) => translations[language][key],
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
