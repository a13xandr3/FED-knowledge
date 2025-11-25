import { QuillToolbarOptions, QuillConfiguration } from './quill-configuration';

describe('quill-configuration', () => {
  it('should export toolbar options and configuration correctly', () => {
    // The configuration should reference the same toolbar array
    expect(QuillConfiguration.modules.toolbar).toBe(QuillToolbarOptions);
    // There should be a font selection with the whitelisted fonts
    const fontGroup = QuillToolbarOptions.find(item => Array.isArray(item) && typeof item[0] === 'object' && 'font' in item[0]);
    expect(fontGroup).toBeDefined();
    if (fontGroup) {
      const fonts = (fontGroup as any)[0].font;
      expect(fonts).toContain('Alumni');
      expect(fonts).toContain('Poppins');
      expect(fonts).toContain('Raleway');
    }
    // The configuration should include standard modules like toolbar
    expect(QuillConfiguration.modules).toBeDefined();
    expect(QuillConfiguration.modules.toolbar).toBe(QuillToolbarOptions);
  });
});