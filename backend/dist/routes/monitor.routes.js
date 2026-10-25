"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const monitor_controller_1 = require("../controllers/monitor.controller");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
router.post('/', (0, validate_1.validateBody)(validate_1.monitorIngestionSchema), monitor_controller_1.ingestTelemetry);
router.post('/batch', (0, validate_1.validateBody)(validate_1.monitorIngestionSchema), monitor_controller_1.ingestTelemetry);
exports.default = router;
