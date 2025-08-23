import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const domain = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = domain.replace(/\/$/, '') + '/sitemap.xml';
  const body = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /admin-login\nSitemap: ${url}\n`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.send(body);
}
