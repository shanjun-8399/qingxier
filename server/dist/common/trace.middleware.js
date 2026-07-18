"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraceMiddleware = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
let TraceMiddleware = class TraceMiddleware {
    use(req, res, next) { const x = req.header('X-Request-Id') ?? ''; req.traceId = /^[A-Za-z0-9_.:-]{1,128}$/.test(x) ? x : `trc_${(0, node_crypto_1.randomUUID)().replaceAll('-', '').slice(0, 20)}`; res.setHeader('X-Trace-Id', req.traceId); next(); }
};
exports.TraceMiddleware = TraceMiddleware;
exports.TraceMiddleware = TraceMiddleware = __decorate([
    (0, common_1.Injectable)()
], TraceMiddleware);
//# sourceMappingURL=trace.middleware.js.map