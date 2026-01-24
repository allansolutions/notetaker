import { describe, it, expect } from 'vitest';
import {
  transformTranscriptToBlocks,
  verifyWebhookSignature,
  type FathomWebhookPayload,
} from '../src/services/fathom-webhook';

describe('transformTranscriptToBlocks', () => {
  it('creates blocks with recording URL when provided', () => {
    const payload: FathomWebhookPayload = {
      event_name: 'new-meeting-content-ready',
      call_id: 'call-123',
      title: 'Test Call',
      recording_url: 'https://fathom.video/call/123',
    };

    const blocks = transformTranscriptToBlocks(payload);
    const recordingBlock = blocks.find((b) => b.content.includes('Recording:'));
    expect(recordingBlock).toBeDefined();
    expect(recordingBlock?.content).toContain('https://fathom.video/call/123');
  });

  it('creates date block', () => {
    const payload: FathomWebhookPayload = {
      event_name: 'new-meeting-content-ready',
      call_id: 'call-123',
      title: 'Test Call',
      created_at: '2026-01-23T10:00:00Z',
    };

    const blocks = transformTranscriptToBlocks(payload);
    const dateBlock = blocks.find((b) => b.content.includes('Date:'));
    expect(dateBlock).toBeDefined();
    expect(dateBlock?.content).toContain('Jan 23, 2026');
  });

  it('creates summary section when provided', () => {
    const payload: FathomWebhookPayload = {
      event_name: 'new-meeting-content-ready',
      call_id: 'call-123',
      title: 'Test Call',
      summary: 'This was a great call about product features.',
    };

    const blocks = transformTranscriptToBlocks(payload);
    const summaryHeader = blocks.find(
      (b) => b.type === 'h2' && b.content === 'Summary'
    );
    const summaryContent = blocks.find(
      (b) => b.content === 'This was a great call about product features.'
    );
    expect(summaryHeader).toBeDefined();
    expect(summaryContent).toBeDefined();
  });

  it('creates transcript blocks with speaker and timestamp', () => {
    const payload: FathomWebhookPayload = {
      event_name: 'new-meeting-content-ready',
      call_id: 'call-123',
      title: 'Test Call',
      transcript: [
        { speaker_name: 'Alice', start_time: 5, text: 'Hello everyone!' },
        {
          speaker_name: 'Bob',
          start_time: 3661,
          text: 'Thanks for joining.',
        },
      ],
    };

    const blocks = transformTranscriptToBlocks(payload);
    const transcriptHeader = blocks.find(
      (b) => b.type === 'h2' && b.content === 'Transcript'
    );
    expect(transcriptHeader).toBeDefined();

    const aliceBlock = blocks.find(
      (b) => b.type === 'quote' && b.content.includes('Alice')
    );
    expect(aliceBlock).toBeDefined();
    expect(aliceBlock?.content).toContain('[00:05]');
    expect(aliceBlock?.content).toContain('Hello everyone!');

    const bobBlock = blocks.find(
      (b) => b.type === 'quote' && b.content.includes('Bob')
    );
    expect(bobBlock).toBeDefined();
    expect(bobBlock?.content).toContain('[01:01:01]');
    expect(bobBlock?.content).toContain('Thanks for joining.');
  });

  it('handles empty transcript', () => {
    const payload: FathomWebhookPayload = {
      event_name: 'new-meeting-content-ready',
      call_id: 'call-123',
      title: 'Test Call',
      transcript: [],
    };

    const blocks = transformTranscriptToBlocks(payload);
    const transcriptHeader = blocks.find(
      (b) => b.type === 'h2' && b.content === 'Transcript'
    );
    expect(transcriptHeader).toBeUndefined();
  });

  it('generates unique block IDs', () => {
    const payload: FathomWebhookPayload = {
      event_name: 'new-meeting-content-ready',
      call_id: 'call-123',
      title: 'Test Call',
      recording_url: 'https://fathom.video/call/123',
      summary: 'Test summary',
      transcript: [
        { speaker_name: 'Alice', start_time: 0, text: 'Hello' },
        { speaker_name: 'Bob', start_time: 5, text: 'Hi' },
      ],
    };

    const blocks = transformTranscriptToBlocks(payload);
    const ids = blocks.map((b) => b.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe('verifyWebhookSignature', () => {
  it('returns true for valid signature', async () => {
    const secret = 'test-secret-key';
    const webhookId = 'webhook-123';
    const timestamp = '1674500000';
    const body = '{"event":"test"}';

    // Pre-compute the expected signature
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

    const isValid = await verifyWebhookSignature(
      secret,
      webhookId,
      timestamp,
      body,
      expectedSignature
    );

    expect(isValid).toBe(true);
  });

  it('returns false for invalid signature', async () => {
    const isValid = await verifyWebhookSignature(
      'secret',
      'webhook-123',
      '1674500000',
      '{"event":"test"}',
      'invalid-signature'
    );

    expect(isValid).toBe(false);
  });
});
