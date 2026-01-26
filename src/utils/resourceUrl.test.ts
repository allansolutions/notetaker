import { describe, it, expect } from 'vitest';
import { getResourceInfo } from './resourceUrl';

describe('getResourceInfo', () => {
  it('detects Google Docs', () => {
    const result = getResourceInfo(
      'https://docs.google.com/document/d/1abc/edit'
    );
    expect(result.type).toBe('google-doc');
    expect(result.label).toBe('Google Doc');
  });

  it('detects Google Sheets', () => {
    const result = getResourceInfo(
      'https://docs.google.com/spreadsheets/d/1abc/edit'
    );
    expect(result.type).toBe('google-sheet');
    expect(result.label).toBe('Google Sheet');
  });

  it('detects Google Slides', () => {
    const result = getResourceInfo(
      'https://docs.google.com/presentation/d/1abc/edit'
    );
    expect(result.type).toBe('google-slide');
    expect(result.label).toBe('Google Slides');
  });

  it('detects Google Drive', () => {
    const result = getResourceInfo(
      'https://drive.google.com/file/d/1abc/view'
    );
    expect(result.type).toBe('google-drive');
    expect(result.label).toBe('Google Drive');
  });

  it('returns hostname for generic URLs', () => {
    const result = getResourceInfo('https://example.com/some/path');
    expect(result.type).toBe('link');
    expect(result.label).toBe('example.com');
  });

  it('returns hostname for GitHub URLs', () => {
    const result = getResourceInfo(
      'https://github.com/user/repo/issues/123'
    );
    expect(result.type).toBe('link');
    expect(result.label).toBe('github.com');
  });

  it('handles invalid URLs gracefully', () => {
    const result = getResourceInfo('not-a-url');
    expect(result.type).toBe('link');
    expect(result.label).toBe('not-a-url');
  });
});
