import configuration from './configuration';

describe('Configuration', () => {
  it('should return default values when env is not set', () => {
    const config = configuration();
    expect(config).toHaveProperty('app');
    expect(config).toHaveProperty('database');
    expect(config).toHaveProperty('jwt');
    expect(config).toHaveProperty('redis');
    expect(config).toHaveProperty('cors');
    expect(config).toHaveProperty('swagger');
    expect(config).toHaveProperty('log');

    expect(config.app.name).toBe('nextjs-server');
    expect(config.app.port).toBe(3000);
    expect(config.database.host).toBe('127.0.0.1');
    expect(config.swagger.enabled).toBe(false);
  });

  it('should respect environment variables', () => {
    process.env.APP_NAME = 'test-app';
    process.env.APP_PORT = '4000';

    const config = configuration();
    expect(config.app.name).toBe('test-app');
    expect(config.app.port).toBe(4000);

    delete process.env.APP_NAME;
    delete process.env.APP_PORT;
  });
});
