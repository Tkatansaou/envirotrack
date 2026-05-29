import { type MetadataRoute } from 'next';

const BASE_URL = 'https://envirotrack.uk';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE_URL,
      lastModified: new Date('2026-05-27'),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/auth/signup`,
      lastModified: new Date('2026-05-27'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/auth/login`,
      lastModified: new Date('2026-05-27'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/legal/cgu`,
      lastModified: new Date('2026-05-24'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
