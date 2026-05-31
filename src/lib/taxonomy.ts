import type { Category, City } from "@/lib/types";

export const categories: Category[] = [
  {
    id: "cat-barbers",
    name: "Barbiers",
    slug: "barbers",
    shortLabel: "Barbers",
    description: "Fades, grooming et barbe avec une expérience premium.",
    icon: "ScissorsLineDashed",
  },
  {
    id: "cat-hair",
    name: "Salons de coiffure",
    slug: "hair-salons",
    shortLabel: "Salons",
    description: "Coupes, brushing, coloration et soins capillaires haut de gamme.",
    icon: "Sparkles",
  },
  {
    id: "cat-beauty",
    name: "Centres de beauté",
    slug: "beauty-centers",
    shortLabel: "Beauté",
    description: "Soins visage, maquillage et routines beauté en un seul lieu.",
    icon: "Flower2",
  },
  {
    id: "cat-nails",
    name: "Studios onglerie",
    slug: "nail-studios",
    shortLabel: "Nails",
    description: "Manucure, gel, nail art et soins des mains dans un cadre design.",
    icon: "Hand",
  },
  {
    id: "cat-spa",
    name: "Spas & hammams",
    slug: "spas",
    shortLabel: "Spa",
    description: "Massages, hammam, rituels corps et détente profonde.",
    icon: "Leaf",
  },
];

export const cities: City[] = [
  {
    id: "city-tunis",
    name: "Tunis",
    slug: "tunis",
    heroCopy:
      "Les adresses les plus réservées autour du centre-ville, du Lac et de La Marsa.",
  },
  {
    id: "city-sousse",
    name: "Sousse",
    slug: "sousse",
    heroCopy:
      "Des salons modernes et des spots bien-être qui convertissent bien sur mobile.",
  },
  {
    id: "city-sfax",
    name: "Sfax",
    slug: "sfax",
    heroCopy:
      "Une scène beauté locale exigeante, parfaite pour un produit simple et premium.",
  },
  {
    id: "city-ariana",
    name: "Ariana",
    slug: "ariana",
    heroCopy:
      "Une zone dense avec de fortes habitudes WhatsApp et beaucoup d'opportunités B2B.",
  },
  {
    id: "city-nabeul",
    name: "Nabeul",
    slug: "nabeul",
    heroCopy:
      "Des studios beauté de quartier qui ont besoin de visibilité et d’un agenda propre.",
  },
  {
    id: "city-hammamet",
    name: "Hammamet",
    slug: "hammamet",
    heroCopy:
      "Idéal pour les spas, salons premium et expériences bien-être destination.",
  },
];

export function findCategoryBySlug(slug: string) {
  return categories.find((category) => category.slug === slug) ?? null;
}

export function findCityBySlug(slug: string) {
  return cities.find((city) => city.slug === slug) ?? null;
}
