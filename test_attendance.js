const http = require('http');

const username = '1001';
const schoolId = '1';
const classId = '23';
const data = JSON.stringify({
  username: username,
  school_id: schoolId,
  class_id: classId,
  date: "2026-03-19",
  session: "FN",
  status: "P"
});

const options = {
  hostname: 'localhost',
  port: 3003,
  path: '/attendance/post_student_attendance',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'x-sync-source': 'local' // Simulation of desktop user
  }
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();
