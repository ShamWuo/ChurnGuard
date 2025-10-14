import fs from 'fs';
import path from 'path';

export default function StripeSetup({ content }: { content: string }) {
  return (
    <main className="container container--narrow">
      <h1>Stripe Setup</h1>
      <article>
        <pre className="code-block" style={{ whiteSpace: 'pre-wrap' }}>{content}</pre>
      </article>
    </main>
  );
}

export async function getStaticProps() {
  try {
    const file = path.join(process.cwd(), 'docs', 'STRIPE_SETUP.md');
    const content = fs.readFileSync(file, 'utf8');
    return { props: { content } };
  } catch (e) {
    return { props: { content: 'Documentation not available in this distribution.' } };
  }
}
