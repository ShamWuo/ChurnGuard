import Head from 'next/head';
import Link from 'next/link';

export default function AdminPreviews() {
  const items = [
    { key: 'failedPayment', label: 'Failed Payment' },
    { key: 'reminder1', label: 'Reminder 1' },
    { key: 'reminder2', label: 'Reminder 2' },
    { key: 'recovered', label: 'Recovered' },
  ];
  return (
    <div className="container">
      <Head>
        <title>Email Previews</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="description" content="Preview transactional emails" />
      </Head>
      <main>
        <h1>Email previews</h1>
        <p>Open templates in a new tab.</p>
        <ul>
          {items.map((it) => (
            <li key={it.key}>
              <Link href={`/api/preview/emails?name=${encodeURIComponent(it.key)}`} target="_blank">
                {it.label}
              </Link>
            </li>
          ))}
        </ul>
        <p><Link href="/admin">Back to admin</Link></p>
      </main>
    </div>
  );
}
