const fs = require('fs');
const assert = require('assert');
const path = require('path');

console.log('Running Branding, Favicon & SEO tests...');

// 1. Verify vector assets
const faviconPath = path.join(__dirname, '..', 'assets', 'favicon.svg');
const logoPath = path.join(__dirname, '..', 'assets', 'logo.svg');
const appleTouchPath = path.join(__dirname, '..', 'assets', 'apple-touch-icon.png');

assert(fs.existsSync(faviconPath), 'assets/favicon.svg must exist');
assert(fs.existsSync(logoPath), 'assets/logo.svg must exist');
assert(fs.existsSync(appleTouchPath), 'assets/apple-touch-icon.png must exist for iOS/Safari compatibility');

const faviconSvg = fs.readFileSync(faviconPath, 'utf8');
assert(faviconSvg.includes('<svg'), 'favicon.svg must contain <svg tag');
assert(faviconSvg.includes('viewBox="0 0 64 64"'), 'favicon.svg must have 64x64 viewBox');
assert(faviconSvg.includes('rect') || faviconSvg.includes('path'), 'favicon.svg must contain timeline shapes');
assert(faviconSvg.includes('polygon') || faviconSvg.includes('path'), 'favicon.svg must contain milestone diamond');

const logoSvg = fs.readFileSync(logoPath, 'utf8');
assert(logoSvg.includes('<svg') && logoSvg.includes('viewBox="0 0 64 64"'), 'logo.svg must be valid SVG with 64x64 viewBox');

// 2. Verify index.html <head>
const indexPath = path.join(__dirname, '..', 'index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf8');

assert(indexHtml.includes('<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">'), 'index.html must have SVG favicon link');
assert(indexHtml.includes('<link rel="apple-touch-icon" sizes="180x180" href="assets/apple-touch-icon.png">'), 'index.html must have raster 180x180 apple-touch-icon link');
assert(/<meta name="description" content="[^"]+">/.test(indexHtml), 'index.html must have non-empty meta description tag');
assert(indexHtml.includes('<meta name="theme-color"'), 'index.html must have meta theme-color tag');
assert(indexHtml.includes('property="og:title"'), 'index.html must have og:title');
assert(indexHtml.includes('property="og:description"'), 'index.html must have og:description');
assert(indexHtml.includes('<meta property="og:image" content="assets/igev-overview-light.png">'), 'index.html must use raster PNG for og:image');
assert(indexHtml.includes('property="og:type"'), 'index.html must have og:type');

// 3. Verify in-app brand logo & CSS
const brandAreaMatch = indexHtml.match(/<div class="brand-area">([\s\S]*?)<\/div>/);
assert(brandAreaMatch, 'index.html must contain .brand-area container');
assert(/<img\s+src="assets\/favicon\.svg"\s+alt="IGEV Logo"\s+class="brand-logo"[^>]*>\s*<h2>IGEV/s.test(brandAreaMatch[1]), 'brand-logo must immediately precede <h2>IGEV inside .brand-area');
assert(indexHtml.includes('.brand-logo'), 'index.html must include .brand-logo CSS styling');

// 4. Verify datenschutz.html consistency
const datenschutzPath = path.join(__dirname, '..', 'datenschutz.html');
const datenschutzHtml = fs.readFileSync(datenschutzPath, 'utf8');

assert(datenschutzHtml.includes('<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">'), 'datenschutz.html must have SVG favicon link');
assert(datenschutzHtml.includes('<link rel="apple-touch-icon" sizes="180x180" href="assets/apple-touch-icon.png">'), 'datenschutz.html must have raster apple-touch-icon link');

const indexThemeMatch = indexHtml.match(/<meta name="theme-color" content="([^"]+)">/);
const datenschutzThemeMatch = datenschutzHtml.match(/<meta name="theme-color" content="([^"]+)">/);
assert(indexThemeMatch && datenschutzThemeMatch && indexThemeMatch[1] === datenschutzThemeMatch[1], 'theme-color must match across pages');

console.log('Branding, Favicon & SEO tests passed successfully!');
