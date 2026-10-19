/** Approved heading/body pairs. Shared with the Design System so company branding can consume one catalog. */
export const fontPairs = [
  { id: "jobforged", label: "JobForged · padrão", headingName: "Montserrat", bodyName: "Open Sans", heading: '"Montserrat Variable", "Montserrat", Arial, sans-serif', body: '"Open Sans Variable", "Open Sans", Arial, sans-serif' },
  { id: "contemporaneo", label: "Contemporâneo", headingName: "Poppins", bodyName: "Inter", heading: '"Poppins", Arial, sans-serif', body: '"Inter Variable", "Inter", Arial, sans-serif' },
  { id: "objetivo", label: "Objetivo", headingName: "Manrope", bodyName: "Open Sans", heading: '"Manrope Variable", "Manrope", Arial, sans-serif', body: '"Open Sans Variable", "Open Sans", Arial, sans-serif' },
  { id: "editorial", label: "Editorial", headingName: "Lora", bodyName: "Inter", heading: '"Lora Variable", "Lora", Georgia, serif', body: '"Inter Variable", "Inter", Arial, sans-serif' },
] as const;

export type FontPairId = (typeof fontPairs)[number]["id"];
