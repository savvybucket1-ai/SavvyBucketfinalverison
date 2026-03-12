const fs = require('fs');
const file = 'c:\\Users\\User\\Downloads\\savvy-bucketproject\\SavvyBucketfinalverison\\frontend\\src\\pages\\AdminDashboard.jsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
    if (l.includes('handleOpenApprovedEdit')) {
        console.log('Found handleOpenApprovedEdit at line: ' + (i+1));
        for(let j=i; j<i+40; j++) console.log((j+1) + ': ' + lines[j]);
    }
});
