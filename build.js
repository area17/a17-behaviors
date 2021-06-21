const fs = require('fs');

fs.copyFile('src/manageBehaviors.js', 'dist/manageBehaviors.js', (err) => {
  if (err) throw err;
  console.log('manageBehaviors.js was copied');
});

fs.copyFile('src/createBehavior.js', 'dist/createBehavior.js', (err) => {
  if (err) throw err;
  console.log('createBehavior.js was copied');
});
