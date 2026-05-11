const bcrypt = require('bcrypt');
async function test() {
  try {
    const res = await bcrypt.compare('pwd', 'plainpassword');
    console.log('Result:', res);
  } catch (e) {
    console.error('Error thrown:', e);
  }
}
test();
