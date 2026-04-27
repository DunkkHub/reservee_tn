import type {
  Audience,
  BookingMode,
  BookingStatus,
  CategorySlug,
  OperatingMode,
  PolicyClarity,
} from "@/lib/types";
import { arMessages } from "@/lib/messages/ar";
import { enMessages } from "@/lib/messages/en";
import { frMessages } from "@/lib/messages/fr";

export const LOCALE_COOKIE_NAME = "reservee-locale";
export const appLocales = ["fr", "en", "ar"] as const;
export type AppLocale = (typeof appLocales)[number];

export const defaultLocale: AppLocale = "fr";

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return appLocales.includes(value as AppLocale);
}

export function resolveAppLocale(value: string | null | undefined): AppLocale {
  return isAppLocale(value) ? value : defaultLocale;
}

export function getLocaleDirection(locale: AppLocale) {
  return locale === "ar" ? "rtl" : "ltr";
}

export function getIntlLocale(locale: AppLocale) {
  switch (locale) {
    case "en":
      return "en-US";
    case "ar":
      return "ar-TN";
    default:
      return "fr-TN";
  }
}

export const localeOptions = [
  { value: "fr", shortLabel: "FR", nativeLabel: "Français" },
  { value: "en", shortLabel: "EN", nativeLabel: "English" },
  { value: "ar", shortLabel: "AR", nativeLabel: "العربية" },
] as const satisfies ReadonlyArray<{
  value: AppLocale;
  shortLabel: string;
  nativeLabel: string;
}>;

const labelDictionary = {
  fr: {
    yes: "Oui",
    no: "Non",
    today: "Aujourd'hui",
    tomorrow: "Demain",
    at: "a",
    audiences: {
      men: "Hommes",
      women: "Femmes",
      unisex: "Mixte",
    },
    bookingStatuses: {
      pending: "En attente",
      confirmed: "Confirmee",
      cancelled: "Annulee",
      rejected: "Rejetee",
      completed: "Terminee",
      no_show: "No-show",
    },
    bookingModes: {
      instant: "Reservation instantanee",
      approval_required: "Validation requise",
    },
    operatingModes: {
      appointment_only: "Sur rendez-vous uniquement",
      walk_ins: "Avec passage libre",
      both: "Rendez-vous + passage libre",
    },
    policyClarity: {
      clear: "Politique claire",
      needs_review: "Politique a revoir",
    },
  },
  en: {
    yes: "Yes",
    no: "No",
    today: "Today",
    tomorrow: "Tomorrow",
    at: "at",
    audiences: {
      men: "Men",
      women: "Women",
      unisex: "Unisex",
    },
    bookingStatuses: {
      pending: "Pending",
      confirmed: "Confirmed",
      cancelled: "Cancelled",
      rejected: "Rejected",
      completed: "Completed",
      no_show: "No-show",
    },
    bookingModes: {
      instant: "Instant booking",
      approval_required: "Approval required",
    },
    operatingModes: {
      appointment_only: "Appointment only",
      walk_ins: "Walk-ins accepted",
      both: "Appointment + walk-ins",
    },
    policyClarity: {
      clear: "Policy clarity",
      needs_review: "Policy needs review",
    },
  },
  ar: {
    yes: "نعم",
    no: "لا",
    today: "اليوم",
    tomorrow: "غدا",
    at: "في",
    audiences: {
      men: "رجال",
      women: "نساء",
      unisex: "للجميع",
    },
    bookingStatuses: {
      pending: "قيد الانتظار",
      confirmed: "مؤكد",
      completed: "مكتمل",
      cancelled_by_customer: "ألغاه العميل",
      cancelled_by_business: "ألغاه النشاط",
      rejected: "مرفوض",
      expired: "منتهي",
      no_show: "لم يحضر",
    },
    bookingModes: {
      instant: "حجز فوري",
      approval_required: "بحاجة إلى موافقة",
    },
    operatingModes: {
      appointment_only: "بالمواعيد فقط",
      walk_ins: "استقبال مباشر",
      both: "مواعيد واستقبال مباشر",
    },
    policyClarity: {
      clear: "سياسة واضحة",
      needs_review: "السياسة تحتاج مراجعة",
    },
  },
} as const;

const categoryTranslations = {
  fr: {
    barbers: {
      name: "Barbiers",
      shortLabel: "Barbers",
      description: "Fades, grooming et barbe avec une experience premium.",
    },
    "hair-salons": {
      name: "Salons de coiffure",
      shortLabel: "Salons",
      description: "Coupes, brushing, coloration et soins capillaires haut de gamme.",
    },
    "beauty-centers": {
      name: "Centres de beaute",
      shortLabel: "Beaute",
      description: "Soins visage, maquillage et routines beaute en un seul lieu.",
    },
    "nail-studios": {
      name: "Studios onglerie",
      shortLabel: "Nails",
      description: "Manucure, gel, nail art et soins des mains dans un cadre design.",
    },
    spas: {
      name: "Spas & hammams",
      shortLabel: "Spa",
      description: "Massages, hammam, rituels corps et detente profonde.",
    },
  },
  en: {
    barbers: {
      name: "Barbers",
      shortLabel: "Barbers",
      description: "Fades, grooming, and beard services with a premium feel.",
    },
    "hair-salons": {
      name: "Hair salons",
      shortLabel: "Salons",
      description: "Cuts, blowouts, color, and elevated hair care.",
    },
    "beauty-centers": {
      name: "Beauty centers",
      shortLabel: "Beauty",
      description: "Facials, makeup, and beauty treatments in one place.",
    },
    "nail-studios": {
      name: "Nail studios",
      shortLabel: "Nails",
      description: "Manicures, gel, nail art, and polished hand care.",
    },
    spas: {
      name: "Spas & hammams",
      shortLabel: "Spa",
      description: "Massages, hammam rituals, and deep relaxation.",
    },
  },
  ar: {
    barbers: {
      name: "الحلاقون",
      shortLabel: "حلاقة",
      description: "تدرجات، عناية، ولحية بتجربة راقية.",
    },
    "hair-salons": {
      name: "صالونات الشعر",
      shortLabel: "شعر",
      description: "قصات، سشوار، صبغات، وعناية شعر بمستوى عال.",
    },
    "beauty-centers": {
      name: "مراكز التجميل",
      shortLabel: "تجميل",
      description: "عناية بالبشرة، مكياج، وخدمات تجميل في مكان واحد.",
    },
    "nail-studios": {
      name: "استوديوهات الأظافر",
      shortLabel: "أظافر",
      description: "مانيكير، جل، فن أظافر، وعناية أنيقة باليدين.",
    },
    spas: {
      name: "السبا والحمام",
      shortLabel: "سبا",
      description: "مساج، طقوس حمام، واسترخاء عميق.",
    },
  },
} as const satisfies Record<
  AppLocale,
  Record<
    CategorySlug,
    {
      name: string;
      shortLabel: string;
      description: string;
    }
  >
>;

const cityTranslations = {
  fr: {
    tunis: {
      name: "Tunis",
      heroCopy:
        "Les adresses les plus reservees autour du centre-ville, du Lac et de La Marsa.",
    },
    sousse: {
      name: "Sousse",
      heroCopy:
        "Des salons modernes et des spots bien-etre qui convertissent bien sur mobile.",
    },
    sfax: {
      name: "Sfax",
      heroCopy: "Une scene beaute locale exigeante, parfaite pour un produit simple et premium.",
    },
    ariana: {
      name: "Ariana",
      heroCopy:
        "Une zone dense avec de fortes habitudes WhatsApp et beaucoup d'opportunites B2B.",
    },
    nabeul: {
      name: "Nabeul",
      heroCopy:
        "Des studios beaute de quartier qui ont besoin de visibilite et d'un agenda propre.",
    },
    hammamet: {
      name: "Hammamet",
      heroCopy: "Ideal pour les spas, salons premium et experiences bien-etre destination.",
    },
  },
  en: {
    tunis: {
      name: "Tunis",
      heroCopy:
        "Top-booked spots around downtown, the lake district, and La Marsa.",
    },
    sousse: {
      name: "Sousse",
      heroCopy:
        "Modern salons and wellness spots that perform well on mobile-first discovery.",
    },
    sfax: {
      name: "Sfax",
      heroCopy:
        "A demanding local beauty scene that fits a simple, premium booking product.",
    },
    ariana: {
      name: "Ariana",
      heroCopy:
        "A dense area with strong WhatsApp habits and real B2B marketplace potential.",
    },
    nabeul: {
      name: "Nabeul",
      heroCopy:
        "Neighborhood beauty studios that need visibility and a cleaner calendar.",
    },
    hammamet: {
      name: "Hammamet",
      heroCopy:
        "Perfect for spas, premium salons, and destination wellness experiences.",
    },
  },
  ar: {
    tunis: {
      name: "تونس",
      heroCopy:
        "أكثر العناوين حجزا حول وسط المدينة، البحيرة، والمرسى.",
    },
    sousse: {
      name: "سوسة",
      heroCopy:
        "صالونات حديثة وأماكن عناية تناسب الاكتشاف عبر الهاتف.",
    },
    sfax: {
      name: "صفاقس",
      heroCopy:
        "مشهد تجميل محلي قوي يناسب منتجا بسيطا وراقيا للحجز.",
    },
    ariana: {
      name: "أريانة",
      heroCopy:
        "منطقة كثيفة مع اعتماد قوي على واتساب وفرص حقيقية للشركاء.",
    },
    nabeul: {
      name: "نابل",
      heroCopy:
        "استوديوهات تجميل محلية تحتاج إلى ظهور أقوى وجدول أنظف.",
    },
    hammamet: {
      name: "الحمامات",
      heroCopy:
        "مناسبة للسبا، الصالونات الراقية، وتجارب العناية المقصودة.",
    },
  },
} as const satisfies Record<
  AppLocale,
  Record<
    string,
    {
      name: string;
      heroCopy: string;
    }
  >
>;

const publicMessages = {
  fr: frMessages,
  en: enMessages,
  ar: arMessages,
} as const;

export function getMessages(locale: AppLocale) {
  return publicMessages[locale];
}

export function getCategoryTranslation(slug: CategorySlug, locale: AppLocale) {
  return categoryTranslations[locale][slug];
}

export function getCityTranslation(slug: string, locale: AppLocale) {
  const translationsForLocale = cityTranslations[locale] as Record<
    string,
    {
      name: string;
      heroCopy: string;
    }
  >;

  return translationsForLocale[slug] ?? null;
}

export function getYesNoLabel(value: boolean, locale: AppLocale) {
  return value ? labelDictionary[locale].yes : labelDictionary[locale].no;
}

export function getRelativeDayCopy(locale: AppLocale) {
  return {
    today: labelDictionary[locale].today,
    tomorrow: labelDictionary[locale].tomorrow,
  };
}

export function getDateTimeConnector(locale: AppLocale) {
  return labelDictionary[locale].at;
}

export function getAudienceLabel(audience: Audience, locale: AppLocale) {
  return labelDictionary[locale].audiences[audience];
}

export function getBookingStatusLabel(status: BookingStatus, locale: AppLocale) {
  const bookingStatuses = labelDictionary[locale].bookingStatuses as Record<string, string>;

  if (bookingStatuses[status]) {
    return bookingStatuses[status];
  }

  if (status === "cancelled") {
    switch (locale) {
      case "en":
        return "Cancelled";
      case "ar":
        return "ملغى";
      case "fr":
      default:
        return "Annulee";
    }
  }

  return status;
}

export function getBookingModeLabel(mode: BookingMode, locale: AppLocale) {
  return labelDictionary[locale].bookingModes[mode];
}

export function getOperatingModeLabel(mode: OperatingMode, locale: AppLocale) {
  return labelDictionary[locale].operatingModes[mode];
}

export function getPolicyClarityLabel(clarity: PolicyClarity, locale: AppLocale) {
  return labelDictionary[locale].policyClarity[clarity];
}

export function getBusinessCountLabel(count: number, locale: AppLocale) {
  if (locale === "ar") {
    return count === 1 ? "نشاط واحد" : `${count} نشاط`;
  }

  if (locale === "en") {
    return count === 1 ? "1 business" : `${count} businesses`;
  }

  return count <= 1 ? `${count} business` : `${count} business`;
}

export function getResultsLabel(count: number, locale: AppLocale) {
  if (locale === "ar") {
    return `${count} نتيجة`;
  }

  if (locale === "en") {
    return count === 1 ? "1 result" : `${count} results`;
  }

  return `${count} resultats`;
}
