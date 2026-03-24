const { dayStartPeru, dayEndPeru } = require('./apps/api/dist/common/timezone');

const testDateStr = '2026-03-08';
const start = dayStartPeru(testDateStr);
const end = dayEndPeru(testDateStr);

console.log("Start in DB:", start.toISOString()); // 2026-03-08T05:00:00Z -> split('T')[0] = 2026-03-08 (Correct)
console.log("End in DB:", end.toISOString());     // 2026-03-09T04:59:59Z -> split('T')[0] = 2026-03-09 (WRONG DAY!)
