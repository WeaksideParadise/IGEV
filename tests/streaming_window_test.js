const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const indexHtml = fs.readFileSync('index.html', 'utf8');

// ===================================================================
// 1. Static Contract & Configuration Checks
// ===================================================================

// Ensure show_tasks_outside_timescale is enabled in configuration
assert(indexHtml.includes('show_tasks_outside_timescale = true'), 'gantt.config.show_tasks_outside_timescale must be true');

// Ensure getTimelineWindow and jumpToTask are defined
assert(indexHtml.includes('function getTimelineWindow('), 'getTimelineWindow function must be defined');
assert(indexHtml.includes('function jumpToTask('), 'jumpToTask function must be defined');
assert(indexHtml.includes('gantt.attachEvent("onTaskClick"'), 'onTaskClick event must be attached');
assert(indexHtml.includes('const isFine = ["minute", "15-min", "hour"].includes(zoomName)'), 'checkAndExpandTimeline must handle fine zoom');

// ===================================================================
// 2. Behavioral Unit Tests for getTimelineWindow
// ===================================================================

// Extract getTimelineWindow function from index.html
const fnMatch = indexHtml.match(/function\s+getTimelineWindow\s*\([\s\S]*?\n    \}/);
assert(fnMatch, 'Could not extract getTimelineWindow from index.html');

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(fnMatch[0], sandbox);
const getTimelineWindow = sandbox.getTimelineWindow;

const now = new Date('2026-11-06T12:00:00Z');

// Test minute zoom
const minuteWin = getTimelineWindow(now, 'minute');
assert(minuteWin, 'Minute window must be returned');
const minuteStart = minuteWin.startDate || minuteWin.start;
const minuteEnd = minuteWin.endDate || minuteWin.end;
assert.strictEqual(minuteStart.getTime(), now.getTime() - 6 * 3600 * 1000, 'Minute window start must be -6h');
assert.strictEqual(minuteEnd.getTime(), now.getTime() + 6 * 3600 * 1000, 'Minute window end must be +6h');
const totalMinutes = (minuteEnd.getTime() - minuteStart.getTime()) / (60 * 1000);
assert(totalMinutes <= 720, `Minute window must not exceed 720 columns, got ${totalMinutes}`);

// Test 15-min zoom
const fifteenWin = getTimelineWindow(now, '15-min');
assert(fifteenWin, '15-min window must be returned');
const fifteenStart = fifteenWin.startDate || fifteenWin.start;
const fifteenEnd = fifteenWin.endDate || fifteenWin.end;
assert.strictEqual(fifteenStart.getTime(), now.getTime() - 24 * 3600 * 1000, '15-min window start must be -24h');
assert.strictEqual(fifteenEnd.getTime(), now.getTime() + 24 * 3600 * 1000, '15-min window end must be +24h');
const total15Min = (fifteenEnd.getTime() - fifteenStart.getTime()) / (15 * 60 * 1000);
assert(total15Min <= 192, `15-min window must not exceed 192 columns, got ${total15Min}`);

// Test hour zoom
const hourWin = getTimelineWindow(now, 'hour');
assert(hourWin, 'Hour window must be returned');
const hourStart = hourWin.startDate || hourWin.start;
const hourEnd = hourWin.endDate || hourWin.end;
assert.strictEqual(hourStart.getTime(), now.getTime() - 4 * 24 * 3600 * 1000, 'Hour window start must be -4d');
assert.strictEqual(hourEnd.getTime(), now.getTime() + 4 * 24 * 3600 * 1000, 'Hour window end must be +4d');
const totalHours = (hourEnd.getTime() - hourStart.getTime()) / (3600 * 1000);
assert(totalHours <= 192, `Hour window must not exceed 192 columns, got ${totalHours}`);

// Test zoom level as object
const objWin = getTimelineWindow(now, { name: 'minute' });
assert(objWin, 'getTimelineWindow must support zoom level object');
assert.strictEqual((objWin.endDate || objWin.end).getTime() - (objWin.startDate || objWin.start).getTime(), 12 * 3600 * 1000);

// Test coarse zoom levels (month, year, day, etc.) return null
assert.strictEqual(getTimelineWindow(now, 'month'), null, 'Month zoom should return null (uses project bounds)');
assert.strictEqual(getTimelineWindow(now, 'day'), null, 'Day zoom should return null');
assert.strictEqual(getTimelineWindow(now, 'year'), null, 'Year zoom should return null');

// ===================================================================
// 3. Behavioral Unit Tests for initTimelineDateRange & jumpToTask
// ===================================================================

const testContext = {
    getTimelineWindow,
    gantt: {
        config: {},
        getState: () => ({ min_date: null, max_date: null }),
        getTask: (id) => testContext.tasks[id],
        showTask: (id) => { testContext.shownTaskId = id; },
        render: () => { testContext.rendered = true; },
        posFromDate: () => 100,
        scrollTo: (x, y) => { testContext.scrolledTo = { x, y }; },
        $task: { getBoundingClientRect: () => ({ width: 800 }) },
        date: {
            add: (d, count, unit) => {
                const res = new Date(d);
                if (unit === 'month') res.setMonth(res.getMonth() + count);
                if (unit === 'year') res.setFullYear(res.getFullYear() + count);
                return res;
            }
        }
    },
    zoomLevels: [
        { name: 'month', pad: { unit: 'month', before: 12, after: 18 } },
        { name: 'hour' },
        { name: '15-min' },
        { name: 'minute' }
    ],
    currentZoomIndex: 3, // 'minute'
    getProjectDateRange: () => ({
        minDate: new Date('2024-01-01T00:00:00Z'),
        maxDate: new Date('2027-01-01T00:00:00Z')
    }),
    renderFullGridLines: () => {},
    updateTodayMarker: () => {},
    isExpandingTimeline: false,
    setTimeout: (fn) => fn(),
    tasks: {
        10: { id: 10, text: 'In-scale Task', start_date: '2026-11-06 13:00' },
        20: { id: 20, text: 'Far Future Task', start_date: '2028-05-15 09:00' }
    },
    shownTaskId: null,
    scrolledTo: null,
    rendered: false
};

vm.createContext(testContext);

// Extract initTimelineDateRange and jumpToTask
const initTimelineMatch = indexHtml.match(/function\s+initTimelineDateRange\s*\([\s\S]*?\n    \}/);
assert(initTimelineMatch, 'Could not extract initTimelineDateRange from index.html');
vm.runInContext(initTimelineMatch[0], testContext);

const jumpToTaskMatch = indexHtml.match(/function\s+jumpToTask\s*\([\s\S]*?\n    \}/);
assert(jumpToTaskMatch, 'Could not extract jumpToTask from index.html');
vm.runInContext(jumpToTaskMatch[0], testContext);

// Test initTimelineDateRange with minute zoom
testContext.currentZoomIndex = 3; // minute
testContext.initTimelineDateRange(now);
assert(testContext.gantt.config.start_date, 'start_date must be set');
assert(testContext.gantt.config.end_date, 'end_date must be set');
const minuteDiff = (testContext.gantt.config.end_date - testContext.gantt.config.start_date) / (60 * 1000);
assert.strictEqual(minuteDiff, 720, 'Minute zoom must be windowed to exactly 720 minutes (12h)');

// Test initTimelineDateRange with coarse zoom (month)
testContext.currentZoomIndex = 0; // month
testContext.initTimelineDateRange(now);
const startMonth = testContext.gantt.config.start_date;
const endMonth = testContext.gantt.config.end_date;
// Month zoom should cover approx 2024-01-01 - 12 months (2023) and 2027-01-01 + 18 months (mid 2028)
assert(startMonth.getFullYear() <= 2023, 'Coarse zoom must retain full wide project padding (start <= 2023)');
assert(endMonth.getFullYear() >= 2028 && endMonth.getMonth() >= 6, 'Coarse zoom must retain full wide project padding (end >= July 2028)');

// Test jumpToTask when task is within timescale
testContext.currentZoomIndex = 3; // minute
testContext.initTimelineDateRange(now);
testContext.rendered = false;
testContext.shownTaskId = null;
testContext.jumpToTask(10);
assert.strictEqual(testContext.shownTaskId, 10, 'jumpToTask must show task 10');
assert.strictEqual(testContext.rendered, false, 'jumpToTask should not re-render if task is within timescale');

// Test jumpToTask when task is outside timescale (2028 task on minute zoom)
testContext.jumpToTask(20);
assert.strictEqual(testContext.shownTaskId, 20, 'jumpToTask must show task 20');
assert.strictEqual(testContext.rendered, true, 'jumpToTask must re-render when task is outside timescale');
assert(testContext.gantt.config.start_date <= new Date('2028-05-15T09:00:00Z'), 'Window must slide to include task 20 start date');
assert(testContext.gantt.config.end_date >= new Date('2028-05-15T09:00:00Z'), 'Window must slide to include task 20 start date');

// ===================================================================
// 4. Behavioral Unit Tests for checkAndExpandTimeline sliding window
// ===================================================================

const expandContext = {
    isExpandingTimeline: false,
    isTaskDragging: false,
    gantt: {
        $task: { offsetWidth: 800 },
        getScrollState: () => ({ x: expandContext.scrollX, y: 0 }),
        getState: () => ({ min_date: null, max_date: null }),
        config: {
            start_date: new Date('2026-11-06T06:00:00Z'),
            end_date: new Date('2026-11-06T18:00:00Z'), // 12h window
            min_column_width: 44
        },
        posFromDate: (d) => {
            const start = expandContext.gantt.config.start_date.getTime();
            const end = expandContext.gantt.config.end_date.getTime();
            const totalW = 1000;
            return ((d.getTime() - start) / (end - start)) * totalW;
        },
        dateFromPos: (x) => {
            const start = expandContext.gantt.config.start_date.getTime();
            const end = expandContext.gantt.config.end_date.getTime();
            const totalW = 1000;
            return new Date(start + (x / totalW) * (end - start));
        },
        render: () => { expandContext.rendered = true; },
        scrollTo: (x, y) => { expandContext.scrolledTo = { x, y }; },
        date: { add: (d, count, unit) => new Date(d) }
    },
    zoomLevels: [
        { name: 'minute', expandStep: { unit: 'hour', amount: 4 } }
    ],
    currentZoomIndex: 0,
    getExpansionStep: () => ({ unit: 'hour', amount: 4 }),
    renderFullGridLines: () => {},
    updateTodayMarker: () => {},
    setTimeout: (fn) => fn(),
    scrollX: 50, // near left edge (< threshold)
    rendered: false,
    scrolledTo: null
};

vm.createContext(expandContext);
const expandMatch = indexHtml.match(/function\s+checkAndExpandTimeline\s*\([\s\S]*?\n    \}/);
assert(expandMatch, 'Could not extract checkAndExpandTimeline from index.html');
vm.runInContext(expandMatch[0], expandContext);

// Test sliding left (near 0)
const origStart = expandContext.gantt.config.start_date.getTime();
const origEnd = expandContext.gantt.config.end_date.getTime();
expandContext.checkAndExpandTimeline();
assert(expandContext.rendered, 'Timeline should re-render on sliding window');
const newStart = expandContext.gantt.config.start_date.getTime();
const newEnd = expandContext.gantt.config.end_date.getTime();
// Should have slid back by 6 hours (half of 12h window)
assert.strictEqual(origStart - newStart, 6 * 3600 * 1000, 'start_date should shift backward by 6 hours');
assert.strictEqual(origEnd - newEnd, 6 * 3600 * 1000, 'end_date should shift backward by 6 hours');
assert.strictEqual(newEnd - newStart, 12 * 3600 * 1000, 'Window size must remain invariant at 12 hours');

// Test sliding right (near right edge)
expandContext.scrollX = 950; // totalWidth is 1000, visibleWidth is 800 => distFromRight = 1000 - (950 + 800) < 0 < threshold
expandContext.rendered = false;
const prevStart = expandContext.gantt.config.start_date.getTime();
const prevEnd = expandContext.gantt.config.end_date.getTime();
expandContext.checkAndExpandTimeline();
assert(expandContext.rendered, 'Timeline should re-render on sliding window right');
const rightStart = expandContext.gantt.config.start_date.getTime();
const rightEnd = expandContext.gantt.config.end_date.getTime();
assert.strictEqual(rightStart - prevStart, 6 * 3600 * 1000, 'start_date should shift forward by 6 hours');
assert.strictEqual(rightEnd - prevEnd, 6 * 3600 * 1000, 'end_date should shift forward by 6 hours');
assert.strictEqual(rightEnd - rightStart, 12 * 3600 * 1000, 'Window size must remain invariant at 12 hours');

console.log('Task 2 streaming window tests passed.');
