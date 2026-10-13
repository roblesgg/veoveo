const fs = require('fs');
let f = fs.readFileSync('src/App.tsx', 'utf8');

f = f.replace(
  "const [downloadUrl, setDownloadUrl] = React.useState('https://veoveo.dripdev.dev/descargar');",
  "const [downloadUrl, setDownloadUrl] = React.useState('https://veoveo.dripdev.dev/descargar');\n  const [releaseTitle, setReleaseTitle] = React.useState('Nueva versión disponible');\n  const [releaseBody, setReleaseBody] = React.useState('Hemos lanzado mejoras críticas. Actualiza ahora para seguir disfrutando de VeoVeo en la versión más reciente.');",
);

f = f.replace(
  "const nextDownloadUrl = findValue(isTest ? 'download_url_test' : 'download_url');",
  "const nextDownloadUrl = findValue(isTest ? 'download_url_test' : 'download_url');\n         const rTitle = findValue('release_title');\n         const rBody = findValue('release_body');\n         if (rTitle) setReleaseTitle(String(rTitle));\n         if (rBody) setReleaseBody(String(rBody));",
);

f = f.replace(
  '<Text style={styles.updateTitle}>Nueva versión disponible</Text>\n          <Text style={styles.updateText}>\n            Hemos lanzado mejoras críticas. Actualiza ahora para seguir disfrutando de VeoVeo en la versión más reciente.\n          </Text>',
  '<Text style={styles.updateTitle}>{releaseTitle}</Text>\n          <Text style={styles.updateText}>\n            {releaseBody}\n          </Text>',
);

fs.writeFileSync('src/App.tsx', f);
