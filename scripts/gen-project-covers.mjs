import sharp from 'sharp';

function rand(min, max) { return min + Math.random() * (max - min); }
const W = 1280, H = 720;

// === Awesome Deep Learning Papers ===
// Theme: interconnected neural network layers with paper/document motifs
const dlSvg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f0c29"/>
      <stop offset="50%" style="stop-color:#302b63"/>
      <stop offset="100%" style="stop-color:#24243e"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>

  <!-- Neural network layers -->
  ${[200, 440, 680, 920, 1080].map((x, li) => {
    const count = [4, 6, 8, 6, 3][li];
    const startY = (H - count * 70) / 2;
    return Array.from({length: count}, (_, i) => {
      const y = startY + i * 70;
      const r = 12 + Math.random() * 6;
      const opacity = 0.4 + Math.random() * 0.3;
      return `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#7f5af0" stroke-width="1.5" opacity="${opacity}"/>
              <circle cx="${x}" cy="${y}" r="${r * 0.4}" fill="#7f5af0" opacity="${opacity * 0.6}"/>`;
    }).join('\n');
  }).join('\n')}

  <!-- Connections between layers -->
  ${(() => {
    const layers = [
      {x: 200, nodes: 4}, {x: 440, nodes: 6}, {x: 680, nodes: 8},
      {x: 920, nodes: 6}, {x: 1080, nodes: 3}
    ];
    let lines = '';
    for (let l = 0; l < layers.length - 1; l++) {
      const a = layers[l], b = layers[l+1];
      const aStartY = (H - a.nodes * 70) / 2;
      const bStartY = (H - b.nodes * 70) / 2;
      for (let i = 0; i < a.nodes; i++) {
        for (let j = 0; j < b.nodes; j++) {
          if (Math.random() > 0.5) {
            lines += `<line x1="${a.x}" y1="${aStartY + i * 70}" x2="${b.x}" y2="${bStartY + j * 70}" stroke="#7f5af0" stroke-width="0.3" opacity="0.12"/>\n`;
          }
        }
      }
    }
    return lines;
  })()}

  <!-- Floating paper icons -->
  ${[{x:100,y:120},{x:1150,y:580},{x:580,y:80},{x:750,y:630},{x:350,y:600}].map(p => `
    <g transform="translate(${p.x},${p.y}) rotate(${rand(-15,15).toFixed(0)})" opacity="0.25">
      <rect x="-16" y="-20" width="32" height="40" rx="2" fill="none" stroke="#e2e8f0" stroke-width="1"/>
      <line x1="-9" y1="-12" x2="9" y2="-12" stroke="#e2e8f0" stroke-width="0.8" opacity="0.6"/>
      <line x1="-9" y1="-6" x2="9" y2="-6" stroke="#e2e8f0" stroke-width="0.8" opacity="0.6"/>
      <line x1="-9" y1="0" x2="5" y2="0" stroke="#e2e8f0" stroke-width="0.8" opacity="0.6"/>
    </g>`).join('\n')}
</svg>`;

await sharp(Buffer.from(dlSvg)).webp({ quality: 85 })
  .toFile('public/images/projects/awesome-deep-learning-papers-cover.webp');
console.log('✅ awesome-deep-learning-papers-cover.webp');

// === Tactile Sensing for Dexterous Robot Hands ===
// Theme: robot hand with tactile sensor grid, touch/pressure visualization
const tactileSvg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tbg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a192f"/>
      <stop offset="50%" style="stop-color:#112240"/>
      <stop offset="100%" style="stop-color:#0a192f"/>
    </linearGradient>
    <radialGradient id="touch" cx="50%" cy="50%" r="40%">
      <stop offset="0%" style="stop-color:#64ffda;stop-opacity:0.15"/>
      <stop offset="100%" style="stop-color:#64ffda;stop-opacity:0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#tbg)"/>
  <rect width="100%" height="100%" fill="url(#touch)"/>

  <!-- Robot hand outline (simplified) -->
  <g transform="translate(640,360) scale(1.8)" opacity="0.2" fill="none" stroke="#64ffda" stroke-width="1.2">
    <!-- Palm -->
    <rect x="-50" y="-10" width="100" height="80" rx="15"/>
    <!-- Fingers -->
    <rect x="-45" y="-70" width="18" height="65" rx="8"/>
    <rect x="-18" y="-85" width="18" height="80" rx="8"/>
    <rect x="9" y="-85" width="18" height="80" rx="8"/>
    <rect x="36" y="-70" width="18" height="65" rx="8"/>
    <!-- Thumb -->
    <rect x="-70" y="-20" width="18" height="55" rx="8" transform="rotate(-20 -61 7)"/>
  </g>

  <!-- Tactile sensor grid on palm -->
  ${Array.from({length: 8}, (_, row) =>
    Array.from({length: 6}, (_, col) => {
      const x = 570 + col * 22;
      const y = 340 + row * 16;
      const intensity = Math.random();
      const color = intensity > 0.6 ? '#64ffda' : intensity > 0.3 ? '#38bdf8' : '#1e3a5f';
      const opacity = 0.3 + intensity * 0.5;
      return `<rect x="${x}" y="${y}" width="16" height="10" rx="2" fill="${color}" opacity="${opacity}"/>`;
    }).join('\n')
  ).join('\n')}

  <!-- Fingertip sensor dots -->
  ${[{cx:595,cy:250},{cx:618,cy:230},{cx:642,cy:228},{cx:666,cy:240},{cx:572,cy:310}].map(p =>
    Array.from({length: 6}, (_, i) => {
      const angle = (i / 6) * Math.PI * 2;
      const r = 6;
      const x = p.cx + Math.cos(angle) * r;
      const y = p.cy + Math.sin(angle) * r;
      const intensity = Math.random();
      return `<circle cx="${x}" cy="${y}" r="2.5" fill="#64ffda" opacity="${0.2 + intensity * 0.6}"/>`;
    }).join('\n')
  ).join('\n')}

  <!-- Pressure wave rings -->
  ${[{cx:640,cy:350,r:120},{cx:640,cy:350,r:180},{cx:640,cy:350,r:240}].map(ring =>
    `<circle cx="${ring.cx}" cy="${ring.cy}" r="${ring.r}" fill="none" stroke="#64ffda" stroke-width="0.5" opacity="0.08"/>`
  ).join('\n')}

  <!-- Data flow particles -->
  ${Array.from({length: 30}, () => {
    const x = rand(100, 1180);
    const y = rand(50, 670);
    return `<circle cx="${x}" cy="${y}" r="${rand(1,3)}" fill="#64ffda" opacity="${rand(0.1, 0.3)}"/>`;
  }).join('\n')}
</svg>`;

await sharp(Buffer.from(tactileSvg)).webp({ quality: 85 })
  .toFile('public/images/projects/survey-robot-hand-tactile-sensor-cover.webp');
console.log('✅ survey-robot-hand-tactile-sensor-cover.webp');
