export async function notifySlack(sender: string, message: string): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return; // silently skip if not configured

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `⚠️ *Rate limit hit* for sender \`${sender}\`\n${message}`,
      }),
    });
  } catch (err) {
    console.error('Slack notification failed:', err);
  }
}
