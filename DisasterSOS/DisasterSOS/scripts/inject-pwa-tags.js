const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');
const publicDir = path.join(__dirname, '..', 'public');

// Copy public files (sw.js, manifest.json, etc.) to dist if needed
if (fs.existsSync(publicDir) && fs.existsSync(distDir)) {
  const files = fs.readdirSync(publicDir);
  for (const file of files) {
    const src = path.join(publicDir, file);
    const dest = path.join(distDir, file);
    if (!fs.existsSync(dest) || fs.statSync(src).mtime > fs.statSync(dest).mtime) {
      fs.copyFileSync(src, dest);
      console.log(`✓ Copied ${file} to dist/`);
    }
  }
}

if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');

  // 1. Ensure viewport includes viewport-fit=cover for iPhone notches & islands
  if (html.includes('name="viewport"')) {
    html = html.replace(
      /<meta\s+name=["']viewport["'][^>]*>/i,
      '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />'
    );
  }

  // 2. Remove any old legacy favicon apple-touch-icon if present
  html = html.replace(/<link\s+rel=["']apple-touch-icon["'][^>]*>/gi, '');

  // 3. PWA and Apple iOS tags
  const pwaTags = `
    <!-- PWA & Apple iOS Metadata -->
    <link rel="manifest" href="/manifest.json" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="DisasterSOS" />
    <link rel="apple-touch-icon" sizes="180x180" href="/assets/icon.png" />
    <link rel="apple-touch-icon" href="/assets/icon.png" />
    <style>
      .grecaptcha-badge {
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    </style>
  `;

  // 4. Service Worker Registration Script
  const swScript = `
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
          navigator.serviceWorker.register('/sw.js')
            .then(function(reg) {
              console.log('[DisasterSOS SW] Registered successfully, scope:', reg.scope);
            })
            .catch(function(err) {
              console.warn('[DisasterSOS SW] Registration failed:', err);
            });
        });
      }
    </script>
  `;

  if (!html.includes('<!-- PWA & Apple iOS Metadata -->') && !html.includes('rel="manifest"')) {
    html = html.replace('</head>', `${pwaTags}\n  </head>`);
  } else if (!html.includes('<!-- PWA & Apple iOS Metadata -->')) {
    // If manifest was already in there, replace the section
    html = html.replace(/<link\s+rel=["']manifest["'][^>]*>/i, pwaTags.trim());
  }

  if (!html.includes('[DisasterSOS SW]')) {
    html = html.replace('</body>', `${swScript}\n</body>`);
  }

  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('✓ Successfully configured PWA tags, Apple Touch Icons, and Service Worker in dist/index.html');
} else {
  console.warn('⚠ dist/index.html not found. Make sure to run `npx expo export -p web` first.');
}
