const fs = require('fs');

const file = 'c:\\Users\\User\\Downloads\\savvy-bucketproject\\SavvyBucketfinalverison\\frontend\\src\\pages\\AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// The file likely contains real ₹ characters that are read correctly by node's utf8 decoder 
// BUT the file itself was saved as Windows-1252 ANSI previously, meaning the browser is interpreting the bytes a different way!
// Let me just replace the literal ₹ string with &#8377; since there is no encoding ambiguity for an HTML entity

// Actually wait! Vite processes JSX. A raw &#8377; inside a JSX curly bracket isn't rendered as entity.
// Let's replace the raw Rupee char OR &#8377; with the explicit string '\u20B9' if it's inside literal or just standard text.

let modified = false;

// 1. Literal Rupee Character
if (content.includes('₹')) {
    content = content.replace(/₹/g, '\u20B9');
    modified = true;
    console.log("Replaced literal rupee chars.");
}

// 2. Corrupted Rupee Chars (various encodings)
const corruptions = ['â‚¹', 'â,¹', 'â€¹', 'Ã¢â€šÂ¹'];
corruptions.forEach(c => {
    if (content.includes(c)) {
        content = content.split(c).join('\u20B9');
        modified = true;
        console.log("Replaced corruption " + c);
    }
});

if (content.match(/â.{0,3}¹/g)) {
     content = content.replace(/â.{0,3}¹/g, '\u20B9');
     modified = true;
     console.log("Replaced regex matches for â...¹");
}

if (modified) {
    fs.writeFileSync(file, content, 'utf8');
    console.log("File saved successfully.");
} else {
    console.log("No rupees or corruptions found in the file.");
}
