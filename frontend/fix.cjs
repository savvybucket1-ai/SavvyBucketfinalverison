const fs = require('fs');

const frontendFile = 'c:\\Users\\User\\Downloads\\savvy-bucketproject\\SavvyBucketfinalverison\\frontend\\src\\pages\\AdminDashboard.jsx';
let content = fs.readFileSync(frontendFile, 'utf8');

// 1. Fix the initial loading of prices. If product.adminPrice is a number from legacy products, pick it for IN.
content = content.replace(
    /IN: product\.adminPrice\?\.IN \|\| '',/g,
    "IN: (typeof product.adminPrice === 'object' ? product.adminPrice?.IN : typeof product.adminPrice === 'number' ? product.adminPrice : '') || '',"
);

// 2. Fix the corrupted Â£ or â‚¹ inside the array literals.
// Ensure they use JavaScript unicode string literals so they bypass JSX rendering glitches.
content = content.replace(/{code:'IN',symbol:'\u20B9'}/g, "{code:'IN',symbol:'\\u20B9'}");
content = content.replace(/symbol:'Â£'/g, "symbol:'\\u00A3'");
content = content.replace(/symbol:'Ã¢â€šÂ¹'/g, "symbol:'\\u20B9'");
content = content.replace(/symbol:'â‚¹'/g, "symbol:'\\u20B9'");
content = content.replace(/symbol:'â,¹'/g, "symbol:'\\u20B9'");

// 3. Fix literal symbols floating around in JSX that cause â,¹ 
content = content.replace(/>\u20B9/g, '>&#8377;'); // Replace literal ₹ outside brackets
content = content.replace(/\(\u20B9\)/g, '(&#8377;)'); // Replace (₹) 
content = content.replace(/\u20B9{/g, '&#8377;{'); // Replace ₹{xyz}
// Also replace â‚¹ in case it's still there
content = content.replace(/>â‚¹/g, '>&#8377;');
content = content.replace(/>â,¹/g, '>&#8377;');
content = content.replace(/\(â‚¹\)/g, '(&#8377;)');
content = content.replace(/â‚¹{/g, '&#8377;{');

// 4. One specific string seen in user screenshot is "â,¹13,465". We will just globally replace â,¹
content = content.replace(/â,¹/g, '&#8377;');
content = content.replace(/Ã¢â€šÂ¹/g, '&#8377;');
content = content.replace(/â€¹/g, '&#8377;');

fs.writeFileSync(frontendFile, content, 'utf8');
console.log("Successfully fixed all encoding issues and data loading logic.");
