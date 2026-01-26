export type ResourceType =
  | 'google-doc'
  | 'google-sheet'
  | 'google-slide'
  | 'google-drive'
  | 'link';

export interface ResourceInfo {
  type: ResourceType;
  label: string;
}

export function getResourceInfo(url: string): ResourceInfo {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    const pathname = parsed.pathname;

    if (hostname === 'docs.google.com' || hostname === 'www.docs.google.com') {
      if (pathname.startsWith('/document')) {
        return { type: 'google-doc', label: 'Google Doc' };
      }
      if (pathname.startsWith('/spreadsheets')) {
        return { type: 'google-sheet', label: 'Google Sheet' };
      }
      if (pathname.startsWith('/presentation')) {
        return { type: 'google-slide', label: 'Google Slides' };
      }
    }

    if (
      hostname === 'drive.google.com' ||
      hostname === 'www.drive.google.com'
    ) {
      return { type: 'google-drive', label: 'Google Drive' };
    }

    return { type: 'link', label: parsed.hostname };
  } catch {
    return { type: 'link', label: url };
  }
}
