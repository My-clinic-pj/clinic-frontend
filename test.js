const { jsPDF } = require('jspdf');
try {
  const pdf = new jsPDF('p', 'mm', 'a4');
  console.log('jsPDF instantiated successfully');
} catch (e) {
  console.error('jsPDF error:', e);
}
