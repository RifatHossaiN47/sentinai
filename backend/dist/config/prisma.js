"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.getPrisma = getPrisma;
exports.initializeDatabase = initializeDatabase;
const client_1 = require("@prisma/client");
require("./env");
const defaults_1 = require("./defaults");
const globalForPrisma = globalThis;
let _prismaInstance = null;
function getPrisma() {
    if (!_prismaInstance) {
        _prismaInstance =
            globalForPrisma.prisma ??
                new client_1.PrismaClient({
                    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
                });
        if (process.env.NODE_ENV !== 'production') {
            globalForPrisma.prisma = _prismaInstance;
        }
    }
    return _prismaInstance;
}
exports.prisma = new Proxy({}, {
    get(_target, prop) {
        const client = getPrisma();
        const value = client[prop];
        if (typeof value === 'function') {
            return value.bind(client);
        }
        return value;
    },
});
async function initializeDatabase() {
    try {
        const count = await exports.prisma.apiEndpoint.count();
        if (count === 0) {
            for (const endpoint of defaults_1.DEFAULT_ENDPOINTS) {
                await exports.prisma.apiEndpoint.upsert({
                    where: { name: endpoint.name },
                    update: {},
                    create: endpoint,
                });
            }
        }
    }
    catch (err) {
        console.warn('[Database] Initialization warning:', err.message);
    }
}
