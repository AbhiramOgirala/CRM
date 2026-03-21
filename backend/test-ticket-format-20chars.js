// Test new ticket format - must be exactly 20 characters

const genTicket = () => {
  const part1 = Math.random().toString(16).substring(2);
  const part2 = Math.random().toString(16).substring(2);
  const combined = (part1 + part2).substring(0, 16);
  const ticket = `CMP-${combined}`;
  return ticket;
};

console.log('Testing new ticket format (must be 20 chars max):\n');

const tickets = new Set();
const results = [];

for (let i = 0; i < 20; i++) {
  const ticket = genTicket();
  tickets.add(ticket);
  results.push({
    num: i + 1,
    ticket,
    length: ticket.length,
    valid: ticket.length <= 20 && ticket.startsWith('CMP-')
  });
}

// Display results
results.forEach(r => {
  const status = r.valid ? '✅' : '❌';
  console.log(`${status} ${r.num}. ${r.ticket} (${r.length} chars)`);
});

console.log(`\n📊 Summary:`);
console.log(`   Generated: ${results.length} tickets`);
console.log(`   Unique: ${tickets.size} tickets`);
console.log(`   Duplicates: ${results.length - tickets.size}`);
console.log(`   All valid 20-char format: ${results.every(r => r.valid) ? '✅ YES' : '❌ NO'}`);
console.log(`   All unique: ${tickets.size === results.length ? '✅ YES' : '❌ NO'}`);
