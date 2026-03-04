"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rowToContract = rowToContract;
function rowToContract(row) {
    return {
        id: row.id,
        userId: row.user_id,
        vendorType: row.vendor_type,
        eventDetails: {
            coupleName: row.couple_name,
            eventDate: row.event_date.toISOString().split('T')[0],
            location: row.location,
            startTime: row.start_time,
        },
        pricing: {
            totalAmount: parseFloat(row.total_amount),
            advancePayment: parseFloat(row.advance_payment),
            paymentSchedule: row.payment_schedule || [],
        },
        cancellationTermIds: row.cancellation_term_ids || [],
        status: row.status,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
        clientName: row.couple_name,
        clientPhone: row.client_phone ?? undefined,
    };
}
