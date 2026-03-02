const jwt = require('jsonwebtoken');
try {
    const token = jwt.sign({ foo: 'bar' }, undefined, { expiresIn: '1d' });
    console.log('Signed with undefined:', token);
    try {
        jwt.verify(token, undefined);
        console.log('Verified with undefined');
    } catch (e) {
        console.log('Verify Error:', e.message);
    }
} catch (e) {
    console.log('Sign Error:', e.message);
}
