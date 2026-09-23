import { contentDisposition, detectFileType } from './file-type';

describe('detectFileType', () => {
  it('detects by content, not by name', () => {
    expect(detectFileType(Buffer.from('%PDF-1.7 ...'))).toBe('application/pdf');
    expect(detectFileType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(detectFileType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe(
      'image/png',
    );
    expect(detectFileType(Buffer.from('<script>alert(1)</script>'))).toBeNull();
    expect(detectFileType(Buffer.alloc(0))).toBeNull();
  });
});

describe('contentDisposition', () => {
  it('keeps Khmer names in filename* and makes a safe ASCII fallback', () => {
    const name = 'សញ្ញាបត្រ "a".pdf';
    const h = contentDisposition(name);
    expect(h.startsWith('attachment;')).toBe(true);
    expect(h).toContain(`filename*=UTF-8''${encodeURIComponent(name)}`);
    expect(h).toContain('filename="_________ _a_.pdf"');
  });
});
