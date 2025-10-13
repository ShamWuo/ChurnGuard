export async function sendSlack(message: string) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) {
    
    return { mocked: true } as const;
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
    return { ok: res.ok };
  } catch (e) {
    
    return { ok: false } as any;
  }
}
