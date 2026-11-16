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
  sourceUrl: string;
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
    id: 'benin-ivory-mask',
    title: 'Benin Ivory Mask of Queen Idia',
    origin: 'Benin Kingdom, Nigeria • 16th Century',
    badge: 'Royal Court Ivory',
    category: 'cultural',
    summary:
      'Iconic 16th-century carved ivory pendant mask representing Queen Mother Idia of the Benin Empire, adorned with an openwork crown of Portuguese figures, inlaid iron scarification, and beaded collar.',
    prompt:
      '16th-century Benin Kingdom carved ivory pendant mask of Queen Mother Idia with stylized openwork crown depicting Portuguese bearded figures and mudfish, inlaid iron scarification lines between eyes, almond eyes with iron pupil inlay, full lips, and openwork beaded chignon flange.',
    thumbnailUrl: '/examples/benin-ivory-mask.jpg',
    sourceUrl:
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR1QKlcRvYGUgutj8nTuT4sINGhP0sbrdgDZcB8ow_-Xw&s=10',
    imageInputs: [
      {
        name: 'benin-ivory-mask.jpg',
        dataUrl: '/examples/benin-ivory-mask.jpg',
        size: 34025,
        type: 'image/jpeg',
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
    id: 'nok-terracotta-figure',
    title: 'Nok Terracotta Seated Figure',
    origin: 'Ancient Nok Culture, Nigeria • c. 500 BCE',
    badge: 'Ancient Terracotta',
    category: 'cultural',
    summary:
      'Ancient terracotta sculpture depicting a seated reflective figure with hand under the chin, cylindrical head, pierced triangular eyes and pupils, tiered hair buns, and flared bead collar.',
    prompt:
      'Ancient Nigerian Nok culture terracotta sculpted figure, seated with arm resting on raised knee and hand supporting chin, elongated cylindrical head, pierced triangular eyes and pupils, tiered braided hair buns, thick beaded neck rings, and textured porous clay surface.',
    thumbnailUrl: '/examples/nok-terracotta-figure.jpg',
    sourceUrl:
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQDexvLUeE03m5_bE6HRQpO9pGmvOmLFy6Dz92_PZ1qPA&s=10',
    imageInputs: [
      {
        name: 'nok-terracotta-figure.jpg',
        dataUrl: '/examples/nok-terracotta-figure.jpg',
        size: 22700,
        type: 'image/jpeg',
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
