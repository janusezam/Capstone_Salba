const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');
  const pwaTags = `
    <link rel="manifest" href="/manifest.json" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="DisasterSOS" />
    <link rel="apple-touch-icon" href="/favicon.ico" />
  `;
  if (!html.includes('rel="manifest"')) {
    html = html.replace('</head>', `${pwaTags}\n  </head>`);
    fs.writeFileSync(indexPath, html, 'utf8');
    console.log('✓ Injected PWA and Apple tags into dist/index.html');
  }
}
