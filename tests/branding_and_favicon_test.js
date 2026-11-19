const fs = require('fs');
const assert = require('assert');
const path = require('path');

console.log('Running Branding, Favicon & SEO tests...');

// 1. Verify vector assets
const faviconPath = path.join(__dirname, '..', 'assets', 'favicon.svg');
const logoPath = path.join(__dirname, '..', 'assets', 'logo.svg');

assert(fs.existsSync(faviconPath), 'assets/favicon.svg must exist');
assert(fs.existsSync(logoPath), 'assets/logo.svg must exist');

const faviconSvg = fs.readFileSync(faviconPath, 'utf8');
assert(faviconSvg.includes('<svg'), 'favicon.svg must contain <svg tag');
assert(faviconSvg.includes('viewBox="0 0 64 64"') || faviconSvg.includes('viewBox="0 0 64 64"'), 'favicon.svg must have 64x64 viewBox');
assert(faviconSvg.includes('rect') || faviconSvg.includes('path'), 'favicon.svg must contain timeline shapes');
assert(faviconSvg.includes('polygon') || faviconSvg.includes('path'), 'favicon.svg must contain milestone diamond');

// 2. Verify index.html <head>
const indexPath = path.join(__dirname, '..', 'index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf8');

assert(indexHtml.includes('<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">'), 'index.html must have SVG favicon link');
assert(indexHtml.includes('<link rel="apple-touch-icon" href="assets/favicon.svg">'), 'index.html must have apple-touch-icon link');
assert(indexHtml.includes('<meta name="description"'), 'index.html must have meta description tag');
assert(indexHtml.includes('<meta name="theme-color"'), 'index.html must have meta theme-color tag');
assert(indexHtml.includes('property="og:title"'), 'index.html must have og:title');
assert(indexHtml.includes('property="og:description"'), 'index.html must have og:description');
assert(indexHtml.includes('property="og:image"'), 'index.html must have og:image');
assert(indexHtml.includes('property="og:type"'), 'index.html must have og:type');

// 3. Verify in-app brand logo & CSS
assert(indexHtml.includes('class="brand-logo"'), 'index.html must have .brand-logo element');
assert(indexHtml.includes('<img src="assets/favicon.svg" alt="IGEV Logo" class="brand-logo"'), 'index.html brand-area must include favicon.svg img before h2');
assert(indexHtml.includes('.brand-logo'), 'index.html must include .brand-logo CSS styling');

// 4. Verify datenschutz.html consistency
const datenschutzPath = path.join(__dirname, '..', 'datenschutz.html');
const datenschutzHtml = fs.readFileSync(datenschutzPath, 'utf8');

assert(datenschutzHtml.includes('<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">'), 'datenschutz.html must have SVG favicon link');
assert(datenschutzHtml.includes('<link rel="apple-touch-icon" href="assets/favicon.svg">'), 'datenschutz.html must have apple-touch-icon link');
assert(datenschutzHtml.includes('<meta name="theme-color"'), 'datenschutz.html must have meta theme-color tag');

console.log('Branding, Favicon & SEO tests passed successfully!');
