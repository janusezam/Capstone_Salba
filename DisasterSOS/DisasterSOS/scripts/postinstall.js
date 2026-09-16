const fs = require('fs');
const path = require('path');

const nm = path.join(__dirname, '..', 'node_modules');

if (fs.existsSync(nm)) {
  function walk(dir) {
    fs.readdirSync(dir).forEach((f) => {
      const full = path.join(dir, f);
      if (f.startsWith('.')) return;
      if (f === 'package.json') {
        try {
          const json = JSON.parse(fs.readFileSync(full, 'utf8'));
          let ch = false;
          ['react-native', 'source'].forEach((k) => {
            if (json[k] && typeof json[k] === 'string') {
              const t = path.join(path.dirname(full), json[k]);
              if (
                !fs.existsSync(t) &&
                !fs.existsSync(t + '.js') &&
                !fs.existsSync(t + '.ts') &&
                !fs.existsSync(t + '.tsx')
              ) {
                if (json.main && fs.existsSync(path.join(path.dirname(full), json.main))) {
                  json[k] = json.main;
                } else if (json.module && fs.existsSync(path.join(path.dirname(full), json.module))) {
                  json[k] = json.module;
                } else {
                  delete json[k];
                }
                ch = true;
              }
            }
          });
          if (ch) fs.writeFileSync(full, JSON.stringify(json, null, 2));
        } catch (e) {}
      } else if (fs.statSync(full).isDirectory()) {
        walk(full);
      }
    });
  }
  walk(nm);
}
