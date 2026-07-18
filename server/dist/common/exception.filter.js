"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const errors_1 = require("./errors");
let AllExceptionsFilter = class AllExceptionsFilter {
    catch(e, h) { const c = h.switchToHttp(), res = c.getResponse(), req = c.getRequest(); let status = 500, code = 500001, error = 'INTERNAL_ERROR', message = '服务器内部错误', data; if (e instanceof errors_1.DomainError) {
        status = e.getStatus();
        code = e.code;
        error = e.error;
        message = e.message;
        data = e.data;
    }
    else if (e instanceof common_1.HttpException) {
        status = e.getStatus();
        const body = e.getResponse();
        if (status === 404) {
            code = 404001;
            error = 'NOT_FOUND';
            message = '请求的资源不存在';
        }
        else if (status === 405) {
            code = 405001;
            error = 'METHOD_NOT_ALLOWED';
            message = '请求方法不受支持';
        }
        else if (status === 400) {
            code = 400001;
            error = 'INVALID_ARGUMENT';
            message = '请求参数校验失败';
            data = body;
        }
        else if (status === 401) {
            code = 401001;
            error = 'UNAUTHORIZED';
            message = '未登录、令牌过期或凭据无效';
        }
        else if (status === 403) {
            code = 403001;
            error = 'FORBIDDEN';
            message = '无权访问该资源';
        }
        else if (status === 429) {
            code = 429001;
            error = 'RATE_LIMITED';
            message = '请求过于频繁';
        }
        else {
            code = 400000 + status;
            error = 'HTTP_ERROR';
            message = e.message;
        }
    } res.status(status).json({ code, message, error, data, traceId: req.traceId ?? 'trc_unknown' }); }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=exception.filter.js.map