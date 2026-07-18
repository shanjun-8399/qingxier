"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortDesc = exports.entity = exports.id = exports.now = void 0;
const node_crypto_1 = require("node:crypto");
const now = () => new Date().toISOString();
exports.now = now;
const id = (p) => `${p}_${(0, node_crypto_1.randomUUID)().replaceAll('-', '').slice(0, 16)}`;
exports.id = id;
const entity = (p, v) => { const t = (0, exports.now)(); return { id: (0, exports.id)(p), createdAt: t, updatedAt: t, ...v }; };
exports.entity = entity;
const sortDesc = (xs) => [...xs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
exports.sortDesc = sortDesc;
//# sourceMappingURL=helpers.js.map