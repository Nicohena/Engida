/**
 * End-to-End Verification Test for Ethiopian Calendar Integration
 */

// Simple assertion helper
function assert(condition, message) {
  if (!condition) {
    console.error('❌ FAIL:', message);
    process.exit(1);
  }
}

// Convert Gregorian to JDN
function gregToJdn(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

// Convert JDN to Ethiopian
function jdnToEth(jdn) {
  const r = (jdn - 1723856) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const year =
    4 * Math.floor((jdn - 1723856) / 1461) +
    Math.floor(r / 365) -
    Math.floor(r / 1460);
  const month = Math.floor(n / 30) + 1;
  const day = (n % 30) + 1;
  return { year, month, day };
}

// Convert Ethiopian to JDN
function ethToJdn(year, month, day) {
  return 1723856 + 365 * year + Math.floor(year / 4) + 30 * (month - 1) + day - 1;
}

console.log('🧪 Starting Ethiopian Calendar Verification Tests...\n');

// Test 1: Oct 27, 2026 -> Tikimt 17, 2019 E.C.
const jdn1 = gregToJdn(2026, 10, 27);
const eth1 = jdnToEth(jdn1);
assert(eth1.year === 2019, `Expected Year 2019, got ${eth1.year}`);
assert(eth1.month === 2, `Expected Month 2 (Tikimt), got ${eth1.month}`);
assert(eth1.day === 17, `Expected Day 17, got ${eth1.day}`);
console.log('✅ Test 1 Passed: 2026-10-27 converts to Tikimt 17, 2019 E.C.');

// Test 2: Enkutatash 2017 (Sep 11, 2024) -> Meskerem 1, 2017 E.C.
const jdn2 = gregToJdn(2024, 9, 11);
const eth2 = jdnToEth(jdn2);
assert(eth2.year === 2017 && eth2.month === 1 && eth2.day === 1, 'Enkutatash failed');
console.log('✅ Test 2 Passed: 2024-09-11 converts to Meskerem 1, 2017 E.C. (Enkutatash)');

// Test 3: Genna 2016 (Jan 7, 2024) -> Tahsas 28, 2016 E.C.
const jdn3 = gregToJdn(2024, 1, 7);
const eth3 = jdnToEth(jdn3);
assert(eth3.year === 2016 && eth3.month === 4 && eth3.day === 28, 'Genna failed');
console.log('✅ Test 3 Passed: 2024-01-07 converts to Tahsas 28, 2016 E.C. (Genna)');

// Test 4: Timkat 2016 (Jan 19, 2024) -> Tir 10, 2016 E.C.
const jdn4 = gregToJdn(2024, 1, 19);
const eth4 = jdnToEth(jdn4);
assert(eth4.year === 2016 && eth4.month === 5 && eth4.day === 10, 'Timkat failed');
console.log('✅ Test 4 Passed: 2024-01-19 converts to Tir 10, 2016 E.C. (Timkat)');

// Test 5: Reversible bijection across 1,000 consecutive days
let mismatches = 0;
const start = new Date(2025, 0, 1);
for (let i = 0; i < 1000; i++) {
  const d = new Date(start);
  d.setDate(d.getDate() + i);
  const j = gregToJdn(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const e = jdnToEth(j);
  const back = ethToJdn(e.year, e.month, e.day);
  if (j !== back) {
    mismatches++;
  }
}
assert(mismatches === 0, `Found ${mismatches} mismatches in 1000-day cycle`);
console.log('✅ Test 5 Passed: 1,000-day continuous bidirectional cycle with 0 mismatches');

console.log('\n🎉 ALL ETHIOPIAN CALENDAR TESTS PASSED SUCCESSFULLY!');
