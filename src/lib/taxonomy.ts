import type { Category, City } from "@/lib/types";

export const categories: Category[] = [
  {
    id: "cat-barbers",
    name: "Barbiers",
    slug: "barbers",
    shortLabel: "Barbers",
    description: "Fades, grooming et barbe avec une experience premium.",
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
    name: "Centres de beaute",
    slug: "beauty-centers",
    shortLabel: "Beauté",
    description: "Soins visage, maquillage et routines beaute en un seul lieu.",
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
    description: "Massages, hammam, rituels corps et detente profonde.",
    icon: "Leaf",
  },
];

export const cities: City[] = [
  {
    id: "city-tunis",
    name: "Tunis",
    slug: "tunis",
    heroCopy:
      "Les adresses les plus reservees autour du centre-ville, du Lac et de La Marsa.",
  },
  {
    id: "city-sousse",
    name: "Sousse",
    slug: "sousse",
    heroCopy: "Des salons modernes et des spots bien-etre qui convertissent bien sur mobile.",
  },
  {
    id: "city-sfax",
    name: "Sfax",
    slug: "sfax",
    heroCopy: "Une scene beaute locale exigeante, parfaite pour un produit simple et premium.",
  },
  {
    id: "city-ariana",
    name: "Ariana",
    slug: "ariana",
    heroCopy:
      "Une zone dense avec de fortes habitudes WhatsApp et beaucoup d'opportunites B2B.",
  },
  {
    id: "city-nabeul",
    name: "Nabeul",
    slug: "nabeul",
    heroCopy:
      "Des studios beaute de quartier qui ont besoin de visibilite et d'un agenda propre.",
  },
  {
    id: "city-hammamet",
    name: "Hammamet",
    slug: "hammamet",
    heroCopy: "Ideal pour les spas, salons premium et experiences bien-etre destination.",
  },
];

export function findCategoryBySlug(slug: string) {
  return categories.find((category) => category.slug === slug) ?? null;
}

export function findCityBySlug(slug: string) {
  return cities.find((city) => city.slug === slug) ?? null;
}
