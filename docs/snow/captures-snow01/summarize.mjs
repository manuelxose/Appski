import { readFileSync } from 'node:fs';
const r = JSON.parse(readFileSync(new URL('./qa-results.json', import.meta.url), 'utf8'));
for (const [vp, pages] of Object.entries(r)) {
  console.log('=== ' + vp.toUpperCase() + ' ===');
  for (const [k, v] of Object.entries(pages)) {
    const doc = v.http.filter(h => h.resource === 'Document');
    const js = v.jsCss.filter(x => /\.js$/.test(x.url));
    const css = v.jsCss.filter(x => /\.css$/.test(x.url));
    const jsBad = js.filter(x => x.status !== 200);
    const cssBad = css.filter(x => x.status !== 200);
    console.log(
      k + ': doc=' + (doc.map(d => d.status).join(',') || 'n/a') +
      ' h1="' + v.dom.h1 + '"' +
      ' ngServer=' + v.dom.hasNgServer +
      ' js=' + js.length + '(bad ' + jsBad.length + ')' +
      ' css=' + css.length + '(bad ' + cssBad.length + ')' +
      ' badStatus=' + v.badStatus.length +
      ' console=' + v.console.length +
      ' file=' + v.file + '(' + v.bytes + 'B)'
    );
    v.console.forEach(c => console.log('   CONSOLE[' + c.type + '] ' + String(c.text).slice(0, 400)));
    v.badStatus.forEach(b => console.log('   BAD ' + b.url + ' ' + b.status + ' ' + (b.failed || '')));
  }
}
