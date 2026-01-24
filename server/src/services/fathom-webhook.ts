export interface FathomTranscriptEntry {
  speaker_name: string;
  start_time: number;
  text: string;
}

export interface FathomWebhookPayload {
  event_name: string;
  call_id: string;
  title: string;
  recording_url?: string;
  summary?: string;
  transcript?: FathomTranscriptEntry[];
  created_at?: string;
}

export interface WikiBlock {
  id: string;
  type: string;
  content: string;
}

function generateBlockId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(dateString?: string): string {
  if (!dateString) {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export async function verifyWebhookSignature(
  secret: string,
  webhookId: string,
  timestamp: string,
  body: string,
  signature: string
): Promise<boolean> {
  const signedPayload = `${webhookId}.${timestamp}.${body}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signedPayload)
  );

  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return expectedSignature === signature;
}

export function transformTranscriptToBlocks(
  payload: FathomWebhookPayload
): WikiBlock[] {
  const blocks: WikiBlock[] = [];

  // Recording link
  if (payload.recording_url) {
    blocks.push({
      id: generateBlockId(),
      type: 'paragraph',
      content: `**Recording:** [View in Fathom](${payload.recording_url})`,
    });
  }

  // Date
  blocks.push({
    id: generateBlockId(),
    type: 'paragraph',
    content: `**Date:** ${formatDate(payload.created_at)}`,
  });

  // Summary section
  if (payload.summary) {
    blocks.push({
      id: generateBlockId(),
      type: 'h2',
      content: 'Summary',
    });
    blocks.push({
      id: generateBlockId(),
      type: 'paragraph',
      content: payload.summary,
    });
  }

  // Transcript section
  if (payload.transcript && payload.transcript.length > 0) {
    blocks.push({
      id: generateBlockId(),
      type: 'h2',
      content: 'Transcript',
    });

    for (const entry of payload.transcript) {
      const timestamp = formatTimestamp(entry.start_time);
      blocks.push({
        id: generateBlockId(),
        type: 'quote',
        content: `**${entry.speaker_name}** [${timestamp}]\n${entry.text}`,
      });
    }
  }

  return blocks;
}
