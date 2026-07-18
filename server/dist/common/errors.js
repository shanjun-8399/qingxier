"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.limited = exports.conflict = exports.notFound = exports.forbidden = exports.unauthorized = exports.invalid = exports.DomainError = void 0;
const common_1 = require("@nestjs/common");
class DomainError extends common_1.HttpException {
    code;
    error;
    data;
    constructor(status, code, error, message, data) {
        super(message, status);
        this.code = code;
        this.error = error;
        this.data = data;
    }
}
exports.DomainError = DomainError;
const invalid = (m = '请求参数错误', d) => new DomainError(400, 400001, 'INVALID_ARGUMENT', m, d);
exports.invalid = invalid;
const unauthorized = (m = '未登录或凭据无效') => new DomainError(401, 401001, 'UNAUTHORIZED', m);
exports.unauthorized = unauthorized;
const forbidden = (m = '没有权限访问该资源') => new DomainError(403, 403001, 'FORBIDDEN', m);
exports.forbidden = forbidden;
const notFound = (m = '资源不存在') => new DomainError(404, 404001, 'NOT_FOUND', m);
exports.notFound = notFound;
const conflict = (m = '资源状态冲突', d) => new DomainError(409, 409001, 'CONFLICT', m, d);
exports.conflict = conflict;
const limited = (m = '已达到套餐容量限制') => new DomainError(403, 700001, 'SUBSCRIPTION_LIMIT', m);
exports.limited = limited;
//# sourceMappingURL=errors.js.map