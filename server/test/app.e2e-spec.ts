import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import configuration from '../src/config/configuration';
import { envValidationSchema } from '../src/config/env.validation';

describe('AppModule (base)', () => {
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
          validationSchema: envValidationSchema,
        }),
      ],
    }).compile();
  });

  it('should compile the config module', () => {
    expect(moduleRef).toBeDefined();
  });

  it('should load default config values', () => {
    const configService = moduleRef.get(ConfigModule);
    expect(configService).toBeDefined();
  });

  afterAll(async () => {
    await moduleRef.close();
  });
});
