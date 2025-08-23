import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const contact = process.env.SECURITY_CONTACT || 'mailto:security@example.com';
  const base = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const policy = process.env.SECURITY_POLICY_URL || `${base}/security-policy`;
  const hiring = process.env.SECURITY_HIRING_URL;
  const expires = process.env.SECURITY_EXPIRES || '2099-01-01T00:00:00Z';
  const lines = [
    `Contact: ${contact}`,
    `Expires: ${expires}`,
    'Preferred-Languages: en',
  ];
  if (policy) lines.push(`Policy: ${policy}`);
  if (hiring) lines.push(`Hiring: ${hiring}`);
  const body = lines.join('\n') + '\n';
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(body);
}
