"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
const morgan_1 = __importDefault(require("morgan"));
exports.requestLogger = (0, morgan_1.default)((tokens, req, res) => {
    const status = Number(tokens.status(req, res) || 200);
    const statusTag = status >= 500 ? 'ERR' : status >= 400 ? 'WARN' : 'OK';
    return [
        `[${new Date().toISOString()}]`,
        `[${statusTag}]`,
        tokens.method(req, res),
        tokens.url(req, res),
        status,
        `${tokens['response-time'](req, res)}ms`,
    ].join(' ');
});
