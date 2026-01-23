import { Injectable } from '@nestjs/common';
import { Order, OrderStatus, OrderStage } from '@prisma/client';
import { OrderStrategy } from './order-strategy.interface';

@Injectable()
export class StandardStrategy implements OrderStrategy {
    getInitialStatus(): OrderStatus {
        return OrderStatus.DRAFT;
    }

    validateStatusTransition(currentStatus: OrderStatus, nextStatus: OrderStatus): void {
        // Standard orders currently rely more on OrderStage, 
        // but we'll allow standard status transitions if needed.
    }

    getNextStatus(currentStatus: OrderStatus): OrderStatus | null {
        // Fallback for status-based progression
        return null;
    }

    getNextStage(currentStage: OrderStage): OrderStage | null {
        const stages = Object.values(OrderStage);
        const currentIndex = stages.indexOf(currentStage);
        if (currentIndex !== -1 && currentIndex < stages.length - 1) {
            return stages[currentIndex + 1];
        }
        return null;
    }

    canDeliver(order: Order): boolean {
        return order.stage === OrderStage.LISTO_ENTREGA || order.stage === OrderStage.ENTREGADO_POSTVENTA;
    }
}
