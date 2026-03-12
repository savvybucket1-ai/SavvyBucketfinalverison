const fs = require('fs');
const file = 'c:\\Users\\User\\Downloads\\savvy-bucketproject\\SavvyBucketfinalverison\\frontend\\src\\pages\\AdminDashboard.jsx';

try {
    let content = fs.readFileSync(file, 'utf8');

    // Make an array of potential replacements
    const toReplace = [
        '&#8377;',
        'â‚¹',
        'â,¹',
        'â€¹',
        'â‚¹',
        '\u00E2\u201A\u00B9',
        '\u00E2\u20AC\u2039',
        '\u00E2,\u00B9',
        'â' // Sometimes the whole thing is just rendered as "â" followed by some broken chars
    ];

    let count = 0;
    toReplace.forEach(char => {
        const regex = new RegExp(char, 'g');
        const matches = content.match(regex);
        if (matches) {
            count += matches.length;
            content = content.replace(regex, '₹');
        }
    });

    // Let's also do a manual search for specific strings to guarantee it
    content = content.replace(/₹,¹/g, '₹');
    content = content.replace(/₹€¹/g, '₹');
    content = content.replace(/₹‚¹/g, '₹');

    // Just to be sure, make sure we didn't accidentally turn something into "₹₹"
    content = content.replace(/₹₹/g, '₹');
    content = content.replace(/₹₹/g, '₹');

    fs.writeFileSync(file, content, 'utf8');
    console.log(`Successfully completed replacements. Found ${count} instances.`);
} catch (e) {
    console.error("Error updating file: ", e);
}
