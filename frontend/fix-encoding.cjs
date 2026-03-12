const fs = require('fs');
const file = 'c:\\Users\\User\\Downloads\\savvy-bucketproject\\SavvyBucketfinalverison\\frontend\\src\\pages\\AdminDashboard.jsx';

let buffer = fs.readFileSync(file);
console.log('Original bytes:', buffer.length);
let text = buffer.toString('utf8');

// The file might be UTF16 BE/LE, let's check.
if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
   text = buffer.toString('utf16le');
   console.log("It's UTF-16 LE!");
} else if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
   // utf16be not directly supported by Buffer.toString without iconv, but we can check
   console.log("It's UTF-16 BE!");
   text = buffer.toString('utf16le'); // this will be garbled, but just to know.
} else {
   console.log("It's UTF-8 or ASCII string.");
}

// Log a slice of text to see what characters are there
let match = text.match(/13,465/);
if (match) {
    let snippet = text.slice(Math.max(0, match.index - 20), match.index + 20);
    console.log("Snippet near 13,465: ", JSON.stringify(snippet));
}

// Now replace ALL known bad characters that might be representing Rupee.
const badRegex = /Ã¢â€šÂ¹|â€¹|â‚¹|â,¹|&#8377;|â¹/g;
const oldLength = text.length;

let replaced = text.replace(badRegex, '₹');
// Also if there's any stray "â,¹" sequence 
replaced = replaced.replace(/\u00E2,\u00B9/g, '₹');
replaced = replaced.replace(/\u00E2\u20AC\u2039/g, '₹');
replaced = replaced.replace(/\u00E2\u201A\u00B9/g, '₹');

// There's a case where the user screenshot showed "â,¹13,465"
replaced = replaced.replace(/â,¹/g, '₹');
replaced = replaced.replace(/Ã¢,Â¹/g, '₹');

// What if it's "â,1" ?? User screenshot literally looks like "â , ¹ " -> E2 80 9A B9? Let's write a generic replacer for any a-hat + comma + superscript 1
replaced = replaced.replace(/Ã¢â‚¬Å¡Ã‚Â¹/g, '₹');
replaced = replaced.replace(/Ã¢â‚¬Â¹/g, '₹');

// Most generic fallback:
replaced = replaced.replace(/â\s*,\s*¹/g, '₹');
replaced = replaced.replace(/â\s*,\s*\^1/g, '₹');
replaced = replaced.replace(/â\s*,\s*1/g, '₹');
// Just manually fix the specific known text patterns:
replaced = replaced.replace(/TOTAL REVENUE<\/p>\s*<h3[^>]*>\s*[^0-9<]*13,465/gi, 'TOTAL REVENUE</p>\n                        <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-1 flex items-center gap-1">\n                            <span className="text-slate-400">₹</span>13,465');

replaced = JSON.parse(JSON.stringify(replaced).replace(/\\u00e2,\\u00b9/gi, '₹').replace(/\\u00e2\\u201a\\u00b9/gi, '₹').replace(/\\u00e2\\u20ac\\u2039/gi, '₹'));

// Find any remaining "â" followed by a something followed by superscript 1
replaced = replaced.replace(/â.{0,3}¹/g, '₹');

console.log((replaced !== text) ? "Made replacements!" : "No replacements made.");

// Finally write back to file as normal UTF-8 avoiding BOM
fs.writeFileSync(file, replaced, 'utf8');
console.log('Done script.');
