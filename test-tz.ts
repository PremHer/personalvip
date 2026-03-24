import { dayStartPeru, dayEndPeru } from './apps/api/src/common/timezone';
const end = "2026-03-07";
console.log("End:", dayEndPeru(end).toISOString());
console.log("Start:", dayStartPeru(new Date()).toISOString());
