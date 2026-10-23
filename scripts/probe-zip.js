const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const ROOT = path.resolve(__dirname, '..');
const fixtures = path.join(ROOT, 'data', 'test_files');
(async () => {
  for (const f of ['docx.min.docx', 'odt.min.odt', 'epub.min.epub', 'nested.zip', 'epub_nested.zip', 'mobi.min.mobi', 'html.min.html', 'fb2.min.fb2', 'rtf.w1252.rtf', 'story.txt']) {
    const buf = fs.readFileSync(path.join(fixtures, f));
    if (!buf.slice(0, 4).toString('latin1').startsWith('PK') && f.endsWith('.docx') === false && f.endsWith('.odt') === false && f.endsWith('.epub') === false) {
      console.log(f, 'bytes', buf.length, 'not a zip, first bytes:', JSON.stringify(buf.slice(0, 12).toString('hex')));
      continue;
    }
    try {
      const zip = await JSZip.loadAsync(buf.buffer.slice(0, buf.length));
      const names = zip.fileNames;
      const entries = names.map(n => n.split('/')[0]).join(', ');
      console.log(f, 'OK bytes', buf.length, 'entries:', entries, 'count', names.length);
    } catch (e) {
      console.log(f, 'FAIL', buf.length, e.message);
    }
  }
})().catch(e => console.error('FATAL', e.message));
