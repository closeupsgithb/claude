// Datos de audiencia y competencia. Fuentes y fechas en cada bloque.
// Audiencia: Metricool (demografía de seguidores), consultada el 11-nov-2026. Cuota = % de seguidores.
// Competencia: informe interno de Marketing "MKT SSPF: Update Nov.26" (6-nov-2026) de Shimano. No son datos de Metricool.

export const AUDIENCE_AS_OF = "11 nov 2026";

export type CountryShare = { code: string; share: number };

export const COUNTRY_NAMES: Record<string, string> = {
  ES: "España", PT: "Portugal", BR: "Brasil", IT: "Italia", US: "EE. UU.", FR: "Francia", AR: "Argentina",
  TR: "Turquía", JP: "Japón", MX: "México", MA: "Marruecos", CL: "Chile", ID: "Indonesia", GB: "Reino Unido",
  DE: "Alemania", DZ: "Argelia", IR: "Irán", PL: "Polonia", NL: "Países Bajos", EG: "Egipto", TN: "Túnez",
  GR: "Grecia", CH: "Suiza", CU: "Cuba", MY: "Malasia", BD: "Bangladés", PH: "Filipinas", VN: "Vietnam",
  TH: "Tailandia", TW: "Taiwán", UY: "Uruguay", CO: "Colombia", PE: "Perú", CR: "Costa Rica", IN: "India",
};

export const AUDIENCE: Record<string, { label: string; accent: string; total: string; rows: CountryShare[] }> = {
  "ig-es": {
    label: "Instagram España",
    accent: "--brand-instagram",
    total: "32,1 mil seguidores",
    rows: [
      { code: "ES", share: 60.55 }, { code: "PT", share: 7.79 }, { code: "BR", share: 5.31 }, { code: "IT", share: 3.56 },
      { code: "US", share: 1.91 }, { code: "FR", share: 1.85 }, { code: "AR", share: 1.57 }, { code: "TR", share: 1.43 },
    ],
  },
  "ig-pt": {
    label: "Instagram Portugal",
    accent: "--brand-instagram",
    total: "7,4 mil seguidores",
    rows: [
      { code: "PT", share: 59.19 }, { code: "ES", share: 25.2 }, { code: "IT", share: 1.87 }, { code: "BR", share: 1.81 },
      { code: "NL", share: 1.81 }, { code: "FR", share: 1.25 }, { code: "MA", share: 0.73 }, { code: "TR", share: 0.65 },
    ],
  },
  "fb-es": {
    label: "Facebook España",
    accent: "--brand-facebook",
    total: "21,2 mil seguidores",
    rows: [
      { code: "ES", share: 30.83 }, { code: "MA", share: 6.07 }, { code: "DZ", share: 5.68 }, { code: "PT", share: 4.76 },
      { code: "TN", share: 3.99 }, { code: "IT", share: 3.48 }, { code: "AR", share: 3.29 }, { code: "ID", share: 2.84 },
    ],
  },
  "yt-es": {
    label: "YouTube",
    accent: "--brand-youtube",
    total: "39,2 mil suscriptores",
    rows: [
      { code: "ES", share: 74.33 }, { code: "PT", share: 5.9 }, { code: "IT", share: 2.36 }, { code: "BR", share: 1.59 },
      { code: "FR", share: 1.15 }, { code: "MX", share: 1.09 }, { code: "JP", share: 0.96 }, { code: "GR", share: 0.91 },
    ],
  },
};

// Instagram España: seguidores por tramo de edad y género (M, F, U = no indicado)
export const IG_ES_AGE_GENDER: Array<[string, "M" | "F" | "U", number]> = [
  ["35-44", "M", 8292], ["25-34", "M", 7565], ["45-54", "M", 4594], ["18-24", "M", 2470], ["25-34", "U", 2140],
  ["35-44", "U", 1555], ["55-64", "M", 1368], ["18-24", "U", 1106], ["45-54", "U", 918], ["35-44", "F", 531],
  ["65+", "M", 468], ["45-54", "F", 368], ["25-34", "F", 318], ["55-64", "U", 283], ["13-17", "M", 259],
  ["13-17", "U", 137], ["65+", "U", 116], ["18-24", "F", 74], ["55-64", "F", 74], ["65+", "F", 60], ["13-17", "F", 13],
];

export const AGE_BUCKETS = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];

export type Series = { name: string; highlight?: boolean; values: Array<number | null> };

export const COMP_PERIODS = ["Mar 2026", "May 2026", "Ago 2026", "Oct 2026"];

export const COMP_IG: Series[] = [
  { name: "Shimano Spain", highlight: true, values: [20300, 23100, 26500, 32300] },
  { name: "Daiwa España", values: [24000, 24000, 25000, 25500] },
  { name: "Fox Int. España", values: [null, null, 19700, 20600] },
  { name: "Hart Fishing", values: [null, null, 18300, 20000] },
];

export const COMP_YT: Series[] = [
  { name: "Shimano Iberia", highlight: true, values: [12200, 17100, 27800, 39700] },
  { name: "Bocarde TV", values: [18500, 18500, 18600, 19400] },
  { name: "Fox Fishing TV España", values: [null, null, 7470, 7660] },
];

// Sales Offices, agosto frente a noviembre 2026: [instagram08, youtube08, instagram11, youtube11]
export const SALES_OFFICES: Array<{ name: string; ig08: number; yt08: number; ig11: number; yt11: number; highlight?: boolean }> = [
  { name: "Iberia", ig08: 31800, yt08: 27800, ig11: 39700, yt11: 39200, highlight: true },
  { name: "EU", ig08: 100000, yt08: 30700, ig11: 102000, yt11: 47400 },
  { name: "Italia", ig08: 71800, yt08: 13200, ig11: 74600, yt11: 14700 },
  { name: "Alemania", ig08: 59500, yt08: 16600, ig11: 59600, yt11: 16900 },
  { name: "Benelux", ig08: 11500, yt08: 0, ig11: 11800, yt11: 0 },
];

// Objetivos 2026 (Instagram ES, Facebook ES, YouTube, Instagram PT, Facebook PT)
export const TARGETS: Array<{ name: string; oct: number; target: number; newTarget: number }> = [
  { name: "Instagram España", oct: 32100, target: 27000, newTarget: 30000 },
  { name: "Facebook España", oct: 21200, target: 18000, newTarget: 20000 },
  { name: "YouTube", oct: 39200, target: 15000, newTarget: 32000 },
  { name: "Instagram Portugal", oct: 7400, target: 4000, newTarget: 6000 },
  { name: "Facebook Portugal", oct: 3600, target: 500, newTarget: 1500 },
];

// Reparto por comunidad autónoma (id de lib/mapPaths) y distrito de Portugal, en % de seguidores.
// Vacío a propósito: Metricool solo entrega país. Se rellena cuando haya una fuente real (ciudades de Instagram).
export const REGION_SHARES: Record<string, Record<string, number> | undefined> = {};
