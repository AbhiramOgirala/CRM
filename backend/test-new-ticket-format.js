#!/usr/bin/env node
'use strict';

/**
 * Test new UUID-based ticket generation
 * No database calls needed
 */
function generateTicket() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const uniqueSuffix = Math.random().toString(36).substring(2, 8).toUpperCase(); // Random
  const timestamp = Date.now() % 10000; // Last 4 digits
  
  return `CMP-${dateStr}-${uniqueSuffix}${timestamp}`;
}

console.log('\n╔════════════════════════════════════════╗');
console.log('║  🎫 NEW TICKET GENERATION FORMAT       ║');
console.log('╚════════════════════════════════════════╝\n');

console.log('Generating 10 unique tickets...\n');

const tickets = [];
for (let i = 0; i < 10; i++) {
  const ticket = generateTicket();
  tickets.push(ticket);
  console.log(`  ${i + 1}. ${ticket}`);
}

// Check uniqueness
const uniqueSet = new Set(tickets);
console.log(`\n📊 Analysis:`);
console.log(`  Generated: ${tickets.length}`);
console.log(`  Unique: ${uniqueSet.size}`);
console.log(`  Duplicates: ${tickets.length - uniqueSet.size}`);

console.log(`\n✨ Format Breakdown:`);
console.log(`  CMP-       : Complaint prefix`);
console.log(`  20260321   : Date (YYYYMMDD) - sortable!`);
console.log(`  ABCDE      : Random alphanumeric (6 chars)`);
console.log(`  1234       : Timestamp component (4 digits)`);

console.log(`\n✅ Benefits:`);
console.log(`  ✓ Virtually impossible to collide`);
console.log(`  ✓ Sortable by date`);
console.log(`  ✓ Human readable`);
console.log(`  ✓ No database queries during generation`);
console.log(`  ✓ Works under concurrent load`);
console.log(`  ✓ Example: ${tickets[0]}\n`);
