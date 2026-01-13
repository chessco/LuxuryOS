import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

async function main() {
    console.log('--- ENV DEBUG ---');
    console.log('process.env.DATABASE_URL:', process.env.DATABASE_URL);

    try {
        const app = await NestFactory.create(AppModule);
        const configService = app.get(ConfigService);
        console.log('ConfigService DATABASE_URL:', configService.get('DATABASE_URL'));
        await app.close();
    } catch (err) {
        console.log('Could not initialize Nest app for debug');
    }
}

main();
