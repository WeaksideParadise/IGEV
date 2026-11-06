const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');

// ===================================================================
// Task 4: Developer Profile Avatar Integration Tests
// ===================================================================

// 1. Static HTML & Attributes Assertions
assert(html.includes('https://weaksideparadise.me/assets/char_highres.png'), 'Must reference profile image from weaksideparadise.me');
assert(html.includes('href="https://weaksideparadise.me"'), 'Must link to portfolio website');
assert(html.includes('class="about-avatar"'), 'Must have about-avatar image class');
assert(html.includes('class="about-avatar-btn"'), 'Must have about-avatar-btn anchor class');
assert(html.includes('alt="Markus Meier"'), 'Must have alt="Markus Meier" for accessibility');
assert(html.includes('width="28"') && html.includes('height="28"'), 'Image must specify width and height of 28px to prevent CLS');
assert(html.includes('loading="lazy"'), 'Image must specify loading="lazy" for performance');
assert(html.includes('class="about-text">About</span>'), 'Must include "About" text label in .about-text');
assert(html.includes('target="_blank"'), 'Must open link in new tab with target="_blank"');
assert(html.includes('rel="noopener noreferrer"'), 'Must use rel="noopener noreferrer" for security');
assert(html.includes('title="Markus Meier — Developer & Portfolio (weaksideparadise.me)"'), 'Must have informative title attribute');

// 2. CSS Styling Assertions
assert(html.includes('.about-avatar-btn'), 'CSS must define .about-avatar-btn');
assert(html.includes('.about-avatar-btn:hover'), 'CSS must define hover effects for .about-avatar-btn');
assert(html.includes('.about-avatar'), 'CSS must define .about-avatar');
assert(html.includes('.about-text'), 'CSS must define .about-text');

// Specific style properties
assert(/\.about-avatar-btn\s*\{[^}]*border-radius:\s*20px/i.test(html), '.about-avatar-btn must have border-radius: 20px');
assert(/\.about-avatar-btn\s*\{[^}]*gap:\s*6px/i.test(html), '.about-avatar-btn must have gap: 6px');
assert(/\.about-avatar-btn:hover\s*\{[^}]*transform:\s*translateY\(-1px\)/i.test(html), 'Hover must apply translateY(-1px)');
assert(/\.about-avatar\s*\{[^}]*border-radius:\s*50%/i.test(html), '.about-avatar must have circular border-radius: 50%');
assert(/\.about-avatar\s*\{[^}]*border:\s*1\.5px solid var\(--accent\)/i.test(html), '.about-avatar must have 1.5px solid var(--accent) border');
assert(/\.about-avatar\s*\{[^}]*object-fit:\s*cover/i.test(html), '.about-avatar must have object-fit: cover');

// 3. Responsive Styling Assertions (@media max-width: 768px)
const media768Match = html.match(/@media\s*\(max-width:\s*768px\)\s*\{([\s\S]*?)\n\s*\}/);
assert(media768Match, 'Must have @media (max-width: 768px) block');
const media768Content = media768Match[1];
assert(media768Content.includes('.about-text') && media768Content.includes('display: none'), 'Must hide .about-text on screens <= 768px');
assert(media768Content.includes('.about-avatar-btn') && media768Content.includes('padding: 2px'), 'Must set padding: 2px on .about-avatar-btn on screens <= 768px');

console.log('Task 4 profile avatar tests passed.');
