const fs = require('fs');

try {
  const manageBehaviors = fs.readFileSync('src/manageBehaviors.js', 'utf8');
  const createBehavior = fs.readFileSync('src/createBehavior.js', 'utf8');
  const extendBehavior = fs.readFileSync('src/extendBehavior.js', 'utf8');
  fs.writeFileSync('dist/manageBehaviors.js', '// don\'t edit this file' + '\n\n' + manageBehaviors);
  fs.writeFileSync('dist/createBehavior.js', '// don\'t edit this file' + '\n\n' + createBehavior);
  fs.writeFileSync('dist/extendBehavior.js', '// don\'t edit this file' + '\n\n' + extendBehavior);
  console.log('✅');
} catch (err) {
  console.error(err);
}
