import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe.skip('API Key authentication (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  // 成功访问：使用有效的 dk_ 密钥访问 POST /api/pages/recent，返回 200
  it.skip('should allow access with valid API key', async () => {
    // Setup:
    // 1. 通过数据库工厂或 service 创建一个 workspace 与对应的 user
    // 2. 调用 ApiKeyService.create() 生成一个有效 API Key（以 dk_ 前缀）
    //    - 设置 userId、workspaceId
    //    - 设置 scopes: ['page:read']
    //    - 设置 expiresAt 为未来时间或 null
    // 3. 将返回的明文密钥保存到变量 apiKey
    //
    // Action:
    //   request(app.getHttpServer())
    //     .post('/api/pages/recent')
    //     .set('Authorization', `Bearer ${apiKey}`)
    //     .send({ ... })
    //
    // Assert:
    //   .expect(200)
  });

  // 过期密钥被拒：使用 expiresAt < now 的密钥，返回 401
  it.skip('should reject expired API key with 401', async () => {
    // Setup:
    // 1. 创建 workspace 与 user
    // 2. 通过 ApiKeyService.create() 生成 API Key
    //    - 设置 expiresAt 为过去时间（例如 new Date(Date.now() - 86400000)）
    //    - scopes: ['page:read']
    // 3. 保存明文密钥 apiKey
    //
    // Action:
    //   request(app.getHttpServer())
    //     .post('/api/pages/recent')
    //     .set('Authorization', `Bearer ${apiKey}`)
    //
    // Assert:
    //   .expect(401)
    //   响应体应包含过期相关的错误信息
  });

  // scope 不足被拒：使用 scopes 为 ['space:read'] 的密钥访问 /api/pages/recent，返回 403
  it.skip('should reject API key with insufficient scope with 403', async () => {
    // Setup:
    // 1. 创建 workspace 与 user
    // 2. 通过 ApiKeyService.create() 生成 API Key
    //    - scopes: ['space:read']  // 不包含 page:read
    //    - expiresAt 为未来时间或 null
    // 3. 保存明文密钥 apiKey
    //
    // Action:
    //   request(app.getHttpServer())
    //     .post('/api/pages/recent')
    //     .set('Authorization', `Bearer ${apiKey}`)
    //
    // Assert:
    //   .expect(403)
    //   响应体应包含 scope 不足相关错误
  });

  // scope 匹配成功：使用 scopes 为 ['page:read'] 的密钥访问 /api/pages/recent，返回 200
  it.skip('should allow access with correct scope', async () => {
    // Setup:
    // 1. 创建 workspace 与 user
    // 2. 通过 ApiKeyService.create() 生成 API Key
    //    - scopes: ['page:read']
    //    - expiresAt 为未来时间或 null
    // 3. 保存明文密钥 apiKey
    //
    // Action:
    //   request(app.getHttpServer())
    //     .post('/api/pages/recent')
    //     .set('Authorization', `Bearer ${apiKey}`)
    //     .send({ ... })  // 视接口参数而定
    //
    // Assert:
    //   .expect(200)
  });

  // 无效密钥被拒：使用不存在的 dk_ 密钥，返回 401
  it.skip('should reject invalid API key with 401', async () => {
    // Setup:
    //   无需创建任何数据库记录
    //   构造一个不存在但格式合法的密钥：'dk_invalid_nonexistent_key_xxxxxxxxxxxx'
    //
    // Action:
    //   request(app.getHttpServer())
    //     .post('/api/pages/recent')
    //     .set('Authorization', 'Bearer dk_invalid_nonexistent_key_xxxxxxxxxxxx')
    //
    // Assert:
    //   .expect(401)
    //   响应体应包含无效密钥相关错误
  });
});
