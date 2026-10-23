(async () => {
  for (const mod of ['rtfParser', 'fb2Parser', 'mobiParser', 'docxParser', 'odtParser', 'htmlParser', 'epubParser', 'zipParser', 'bookDictionaryService']) {
    try {
      const m = await import('../services/' + mod + '.ts');
      const keys = Object.keys(m).filter(k => k.includes('FromBytes') || k === 'parseBook');
      console.log('IMPORT_OK ' + mod + ' ->', keys.join(','));
    } catch (e) {
      console.log('IMPORT_ERR ' + mod + ' -> ' + e.message.split('\n')[0]);
    }
  }
})();
