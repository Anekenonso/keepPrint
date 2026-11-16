import type { Job, ImageInputItem } from './types';

export interface PreloadedExample {
  id: string;
  title: string;
  origin: string;
  badge: string;
  category: 'cultural' | 'personal';
  summary: string;
  prompt: string;
  thumbnailUrl: string;
  imageInputs: ImageInputItem[];
  result: Job;
  meta: {
    aholoTaskId: number;
    exportTaskId: number;
    faceBudget: number;
    reconstructedAt: string;
  };
}

export const PRELOADED_EXAMPLES: PreloadedExample[] = [
  {
    id: 'ashanti-stool',
    title: 'Ashanti Carved Wooden Stool',
    origin: 'Kumasi, Ghana • 19th-Century Style Heirloom',
    badge: 'Cultural Heritage',
    category: 'cultural',
    summary:
      'Ceremonial mahogany stool with traditional curved crescent seat, geometric openwork central pillar, and stepped plinth. Preserved across three generations in Ghana.',
    prompt:
      'Hand-carved wooden ceremonial stool from Ghana with curved crescent seat, intricate central openwork pillar, stepped rectangular base, warm mahogany grain, and smooth worn patina.',
    thumbnailUrl: '/examples/ashanti-stool.svg',
    imageInputs: [
      {
        name: 'ashanti-stool-front.svg',
        dataUrl: '/examples/ashanti-stool.svg',
        size: 3450,
        type: 'image/svg+xml',
      },
    ],
    result: {
      id: '8029847',
      status: 'succeeded',
      sourceType: 'image',
      glbUrl:
        'https://qhsmodel.kujiale.com/lux3dPbrEmbedResult/31d7f2d14d16446ebb80545720abdf22/textured.glb',
      retopoGlbUrl:
        'https://qhsmodel.kujiale.com/lux3dPbrEmbedResult/31d7f2d14d16446ebb80545720abdf22/textured.glb',
      stlUrl:
        'https://qhsmodel.kujiale.com/glbMultiExportResult/NL5FADYKTJDWYAABAAAAAAI8/printable.stl',
      threemfUrl:
        'https://qhsmodel.kujiale.com/glbMultiExportResult/NL5FADYKTJDWYAABAAAAAAI8/printable.3mf',
      createdAt: 1794788258000,
    },
    meta: {
      aholoTaskId: 8029847,
      exportTaskId: 8030283,
      faceBudget: 80000,
      reconstructedAt: '2026-11-16 (Aholo G1 Neural Volumetric Mesh)',
    },
  },
  {
    id: 'brass-compass',
    title: "Grandfather's Brass Maritime Compass",
    origin: 'Naval Navigation Instrument • 1940s Vintage',
    badge: 'Vintage Precision',
    category: 'personal',
    summary:
      'Pocket brass maritime navigation compass with hinged protective cover, milled coin-edge casing, and magnetic azimuth dial. Carried through naval voyages in the 1940s.',
    prompt:
      'Vintage brass pocket compass with hinged protective lid, milled coin-edge rim, circular azimuth dial, needle pivot, and aged golden bronze patina.',
    thumbnailUrl: '/examples/brass-compass.svg',
    imageInputs: [
      {
        name: 'brass-compass-perspective.svg',
        dataUrl: '/examples/brass-compass.svg',
        size: 3820,
        type: 'image/svg+xml',
      },
    ],
    result: {
      id: '8030052',
      status: 'succeeded',
      sourceType: 'image',
      glbUrl:
        'https://qhsmodel.kujiale.com/lux3dPbrEmbedResult/5971395c3c964ad084bb9ff4fd631b35/textured.glb',
      retopoGlbUrl:
        'https://qhsmodel.kujiale.com/lux3dPbrEmbedResult/5971395c3c964ad084bb9ff4fd631b35/textured.glb',
      stlUrl:
        'https://qhsmodel.kujiale.com/glbMultiExportResult/NL5D5NIKTJRBGAABAAAAACY8/printable.stl',
      threemfUrl:
        'https://qhsmodel.kujiale.com/glbMultiExportResult/NL5D5NIKTJRBGAABAAAAACY8/printable.3mf',
      createdAt: 1794789143000,
    },
    meta: {
      aholoTaskId: 8030052,
      exportTaskId: 8030163,
      faceBudget: 80000,
      reconstructedAt: '2026-11-16 (Aholo G1 Neural Volumetric Mesh)',
    },
  },
];

export function getExampleById(id: string): PreloadedExample | undefined {
  return PRELOADED_EXAMPLES.find((ex) => ex.id === id);
}
