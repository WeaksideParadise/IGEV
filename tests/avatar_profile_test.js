const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');

// ===================================================================
// Developer Profile Avatar Integration Tests
// ===================================================================

// 1. Static HTML & Attributes Assertions
assert(html.includes('https://weaksideparadise.me/assets/char_highres.png'), 'Must reference profile image from weaksideparadise.me');
assert(html.includes('href="https://weaksideparadise.me"'), 'Must link to portfolio website');
assert(html.includes('class="about-avatar"'), 'Must have about-avatar image class');
assert(html.includes('about-avatar-btn'), 'Must have about-avatar-btn anchor class');
assert(html.includes('alt="Markus Meier"'), 'Must have alt="Markus Meier" for accessibility');
assert(html.includes('width="20"') && html.includes('height="20"'), 'Image must specify width and height of 20px to prevent CLS');
assert(html.includes('loading="lazy"'), 'Image must specify loading="lazy" for performance');
assert(html.includes('class="about-text"'), 'Must include text label in .about-text');
assert(html.includes('target="_blank"'), 'Must open link in new tab with target="_blank"');
assert(html.includes('rel="noopener noreferrer"'), 'Must use rel="noopener noreferrer" for security');
assert(html.includes('title="Markus Meier — Developer & Portfolio (weaksideparadise.me)"'), 'Must have informative title attribute');

// 2. Location Check: Must be inside View Dropdown and adjacent to Help & Shortcuts
assert(html.match(/id="viewDropdown"[\s\S]*?about-avatar-btn[\s\S]*?<\/div>/), 'About Me must be inside viewDropdown');
assert(html.match(/openShortcutsModal\(\)[\s\S]*?about-avatar-btn/), 'About Me must be placed under Help & Shortcuts in viewDropdown');

// 3. CSS Styling Assertions
assert(html.includes('.about-avatar-btn'), 'CSS must define .about-avatar-btn');
assert(html.includes('.about-avatar'), 'CSS must define .about-avatar');
assert(html.includes('.about-text'), 'CSS must define .about-text');

// Specific style properties
assert(/\.about-avatar\s*\{[^}]*border-radius:\s*50%/i.test(html), '.about-avatar must have circular border-radius: 50%');
assert(/\.about-avatar\s*\{[^}]*border:\s*1\.5px solid var\(--accent\)/i.test(html), '.about-avatar must have 1.5px solid var(--accent) border');
assert(/\.about-avatar\s*\{[^}]*object-fit:\s*cover/i.test(html), '.about-avatar must have object-fit: cover');

console.log('Profile avatar tests passed.');
