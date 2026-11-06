const { execSync } = require('child_process');

console.log('Running full test suite...');
execSync('node tests/theme_default_test.js', { stdio: 'inherit' });
execSync('node tests/streaming_window_test.js', { stdio: 'inherit' });
execSync('node tests/toolbar_structure_test.js', { stdio: 'inherit' });
execSync('node tests/avatar_profile_test.js', { stdio: 'inherit' });
execSync('node tests/context_menu_test.js', { stdio: 'inherit' });

console.log('All verification tests successfully passed!');
