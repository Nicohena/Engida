import { buildCsv, escapeCsv } from './csv';

describe('CSV export safety', () => {
  it('quotes values and escapes embedded quotes', () => {
    expect(escapeCsv('Bole, Addis Ababa')).toBe('"Bole, Addis Ababa"');
    expect(escapeCsv('Guest "quoted" name')).toBe('"Guest ""quoted"" name"');
  });

  it('neutralizes spreadsheet formula prefixes', () => {
    expect(escapeCsv('=HYPERLINK("https://example.com")')).toBe(
      '"\'=HYPERLINK(""https://example.com"")"',
    );
    expect(escapeCsv('+251911555101')).toBe('"\'+251911555101"');
    expect(escapeCsv('-42')).toBe('"\'-42"');
    expect(escapeCsv('@SUM(A1:A2)')).toBe('"\'@SUM(A1:A2)"');
    expect(escapeCsv('\t=cmd')).toBe('"\'\t=cmd"');
    expect(escapeCsv('\r=cmd')).toBe('"\'\r=cmd"');
  });

  it('builds CRLF-free logical rows with a header', () => {
    expect(buildCsv(['Name', 'Note'], [['Selam', 'safe']])).toBe(
      '"Name","Note"\r\n"Selam","safe"',
    );
  });
});
