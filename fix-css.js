const fs = require('fs');
const buffer = fs.readFileSync('client/src/index.css');

// Find the index where UTF-16 starts.
// The UTF-16 string starts with '@keyframes pulse' where each char is followed by a null byte.
// We can just convert the buffer to a string. It might have null bytes.
let text = buffer.toString('utf8');
// Remove null bytes
text = text.replace(/\0/g, '');
fs.writeFileSync('client/src/index.css', text, 'utf8');
console.log("Fixed CSS encoding!");
