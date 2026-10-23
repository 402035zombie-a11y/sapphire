const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const ROOT = '/c/Users/DELL/BookReader';
const fixturesDir = ROOT + '/data/test_files';
(async () => {
  const docx = fs.readFileSync(fixturesDir + '/docx.min.docx');
  console.log('docx buffer.byteOffset:', docx.byteOffset, 'byteLength:', docx.byteLength, 'buffer.byteLength:', docx.buffer.byteLength);
  // check ECDF location via (docx.buffer.buffer as ArrayBuffer)
  const ab = docx.buffer.slice(docx.byteOffset, docx.byteOffset + docx.length);
  const u8 = new Uint8Array(ab);
  // find PK\x05\x06
  let found = -1;
  for (let i = 0; i < u8.length - 3; i++) {
    if (u8[i] === 0x50 && u8[i+1] === 0x4b && u8[i+2] === 0x05 && u8[i+3] === 0x06) { found = i; break; }
  }
  console.log('PK\x05\x06 found at:', found);
  // check the bytes at that location
  if (found >= 0) {
    console.log('bytes around EOCD:', Array.from(u8.slice(found-4, found+12)).map(b => b.toString(16)).join(' '));
  }
  // now try jszip loadAsync on an exact copy
  try {
    const zip = await JSZip.loadAsync(docx.buffer.slice(docx.byteOffset, docx.byteOffset + docx.length));
    console.log('JSZip loadAsync OK. fileNames:', JSON.stringify(zip.fileNames), 'count:', zip.files ? Object.keys(zip.files).length : 'NA');
  } catch (e) {
    console.log('JSZip loadAsync FAIL:', e.message);
  }
  // and try with the 65536 pool slice to compare
  try {
    const zip2 = await JSZip.loadAsync(docx.buffer.slice(0, docx.length));
    console.log('JSZip loadAsync (offset 0) OK:', JSON.stringify(zip2.fileNames));
  } catch (e) {
    console.log('JSZip loadAsync (offset 0) FAIL:', e.message);
  }
})().catch(e => console.error('FATAL', e.message));
