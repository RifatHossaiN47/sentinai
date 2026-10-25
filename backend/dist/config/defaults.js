"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ENDPOINTS = void 0;
exports.DEFAULT_ENDPOINTS = [
    {
        name: 'PatientDataAPI',
        description: 'Core EHR demographic and clinical record synchronization service',
        target_url: 'https://api.cottagehomecare.internal/v1/patients',
        is_critical: true,
        sla_latency_ms: 2500,
        current_health: 'HEALTHY',
    },
    {
        name: 'AppointmentAPI',
        description: 'Home care caregiver scheduling and visit dispatch engine',
        target_url: 'https://api.cottagehomecare.internal/v1/appointments',
        is_critical: true,
        sla_latency_ms: 2500,
        current_health: 'HEALTHY',
    },
    {
        name: 'BillingAPI',
        description: 'Medicaid/Medicare claim verification and payroll ledger service',
        target_url: 'https://api.cottagehomecare.internal/v1/billing',
        is_critical: true,
        sla_latency_ms: 2500,
        current_health: 'HEALTHY',
    },
    {
        name: 'CaregiverComplianceAPI',
        description: 'EVV (Electronic Visit Verification) and state compliance check service',
        target_url: 'https://api.cottagehomecare.internal/v1/compliance',
        is_critical: false,
        sla_latency_ms: 3000,
        current_health: 'HEALTHY',
    },
];
