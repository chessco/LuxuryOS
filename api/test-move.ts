
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { OrdersService } from './src/orders/orders.service';

async function testMove() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const service = app.get(OrdersService);

    const standardId = '0cc22d9d-2548-4b31-896a-bf8dd9bc7d55';
    const repairId = '2673a8c2-eb30-43e0-b050-f8c7d749f796';

    try {
        const standardInfo = await (service as any).prisma.order.findUnique({ where: { id: standardId } });
        console.log('--- Testing STANDARD Order ---');
        const standardOrder = await service.moveOrder(standardId, standardInfo.tenantId, 'APROBADO_ANTICIPO');
        console.log('Standard Order updated:', { id: standardOrder.id, stage: standardOrder.stage, status: standardOrder.status });

        const repairInfo = await (service as any).prisma.order.findUnique({ where: { id: repairId } });
        console.log('\n--- Testing REPAIR Order ---');
        const repairOrder = await service.moveOrder(repairId, repairInfo.tenantId, 'REPAIR_COMPLETED');
        console.log('Repair Order updated:', { id: repairOrder.id, stage: repairOrder.stage, status: repairOrder.status });

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await app.close();
    }
}

testMove();
