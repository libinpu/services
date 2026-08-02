const fs = require('fs');
const path = require('path');

const map = {
  "'#F7F9FC'": 'colors.neutral[50]',
  "'#FFFFFF'": 'colors.neutral[100]',
  "'#334E68'": 'colors.primary[600]',
  "'#F46A45'": 'colors.accent[500]',
  "'#E8EEF4'": 'colors.neutral[200]',
  "'#7B8794'": 'colors.neutral[500]',
  "'#233142'": 'colors.neutral[900]',
  "'#DCE2E7'": 'colors.neutral[300]',
  "'#627D98'": 'colors.neutral[600]'
};

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./components', function(filePath) {
  if (filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    for (let key in map) {
      if (content.includes(key)) {
        content = content.split(key).join(map[key]);
        changed = true;
      }
    }
    const mapDoubleQuotes = {
      '"#F7F9FC"': 'colors.neutral[50]',
      '"#FFFFFF"': 'colors.neutral[100]',
      '"#334E68"': 'colors.primary[600]',
      '"#F46A45"': 'colors.accent[500]',
      '"#E8EEF4"': 'colors.neutral[200]',
      '"#7B8794"': 'colors.neutral[500]',
      '"#233142"': 'colors.neutral[900]',
      '"#DCE2E7"': 'colors.neutral[300]',
      '"#627D98"': 'colors.neutral[600]'
    };
    for (let key in mapDoubleQuotes) {
      if (content.includes(key)) {
        content = content.split(key).join(mapDoubleQuotes[key]);
        changed = true;
      }
    }

    if (changed) {
      if (!content.includes('colors') && !content.includes('import { colors')) {
         content = 'import { colors } from "@/lib/theme";\n' + content;
      }
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated ' + filePath);
    }
  }
});
