export interface EventDetails {
  coupleName: string;
  eventDate: string; // ISO date
  location: string;
  startTime: string; // ISO time or full ISO
}

export interface PaymentScheduleItem {
  id: string;
  amount: number;
  dueDate: string;
  note?: string;
}

export interface PricingDetails {
  totalAmount: number;
  advancePayment: number;
  paymentSchedule: PaymentScheduleItem[];
}

export type ContractStatus = 'טיוטה' | 'ממתין' | 'נחתם' | 'פעיל' | 'בוטל';

export interface Contract {
  id: string;
  userId: string;
  vendorType: string;
  eventDetails: EventDetails;
  pricing: PricingDetails;
  cancellationTermIds: string[];
  status: ContractStatus;
  createdAt: string;
  updatedAt: string;
  clientName?: string;
  clientAvatarURL?: string;
}

export interface ContractRow {
  id: string;
  user_id: string;
  vendor_type: string;
  couple_name: string;
  event_date: Date;
  location: string;
  start_time: string;
  total_amount: string;
  advance_payment: string;
  payment_schedule: unknown;
  cancellation_term_ids: string[];
  status: string;
  created_at: Date;
  updated_at: Date;
}

export function rowToContract(row: ContractRow): Contract {
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
      paymentSchedule: (row.payment_schedule as PaymentScheduleItem[]) || [],
    },
    cancellationTermIds: row.cancellation_term_ids || [],
    status: row.status as ContractStatus,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    clientName: row.couple_name,
  };
}
