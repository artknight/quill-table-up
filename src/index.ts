import * as formats from './formats';
import * as modules from './modules';
import * as tableUpCore from './table-up';
import * as utils from './utils';
import * as types from './utils/types';

// Safely access TableUp (don't re-import it separately)
const TableUp = tableUpCore.TableUp;

// Only include JS objects and functions in the global bundle
const TableUpGlobal = {
    TableUp,
    ...formats,
    ...modules,
    ...tableUpCore,
    // pull out named utils individually to avoid TS4023 issues
    blotName: utils.blotName,
    createColorPicker: utils.createColorPicker,
    createSelectBox: utils.createSelectBox,
    createTooltip: utils.createTooltip,
    findParentBlot: utils.findParentBlot,
    findParentBlots: utils.findParentBlots,
    randomId: utils.randomId,
    tableUpEvent: utils.tableUpEvent,
    tableUpInternal: utils.tableUpInternal,
    tableUpSize: utils.tableUpSize,
};

// ✅ Export default ONLY — Rollup will map this to `window.TableUp` in IIFE build
export default TableUpGlobal;
