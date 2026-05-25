import { type MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/auth/login', '/auth/signup', '/legal/'],
        disallow: ['/dashboard', '/projects/', '/settings/', '/admin/', '/api/'],
      },
    ],
    sitemap: 'https://envirotrack.uk/sitemap.xml',
  };
}
