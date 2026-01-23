import { Order, OrderStatus } from '@prisma/client';

export interface OrderStrategy {
    validateStatusTransition(currentStatus: OrderStatus, nextStatus: OrderStatus): void;
    getNextStatus(currentStatus: OrderStatus): OrderStatus | null;
    canDeliver(order: Order): boolean;
    getInitialStatus(): OrderStatus;
}
