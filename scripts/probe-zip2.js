const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const ROOT = path.resolve(__dirname, '..');
const buf = fs.readFileSync(path.join(ROOT, 'data', 'test_files', 'docx.min.docx'));
console.log('buf.length:', buf.length, 'buf.buffer.byteLength:', buf.buffer.byteLength);
(async () => {
  for (let len of [buf.length, 65536]) {
    let ab;
    if (len === buf.length) {
      ab = buf.buffer.slice(0, buf.length);
    } else {
      ab = buf.buffer; // the 65536 buffer
    }
    try {
      const zip = await JSZip.loadAsync(ab);
      console.log('loaded with arrayBuffer byteLength', ab.byteLength, '-> fileNames:', zip.fileNames ? zip.fileNames.slice(0, 8) : 'UNDEFINED');
    } catch (e) {
      console.log('load with byteLength', ab.byteLength, 'ERROR:', e.message);
    }
  }
})().catch(e => console.error('FATAL', e));
