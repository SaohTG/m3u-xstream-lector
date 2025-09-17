import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('PlaylistsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('ok', true);
      });
  });

  describe('/api/playlists', () => {
    it('/link (POST) with invalid M3U should fail', () => {
      return request(app.getHttpServer())
        .post('/api/playlists/link')
        .send({
          type: 'M3U',
          url: 'http://example.com/nonexistent.m3u',
        })
        .expect(400)
        .then((res) => {
            expect(res.body.message).toContain('Could not fetch M3U content');
        });
    });

    it('/link (POST) with invalid Xtream should fail', () => {
        return request(app.getHttpServer())
          .post('/api/playlists/link')
          .send({
            type: 'XTREAM',
            host: 'invalid-xtream-host.xyz',
            username: 'user',
            password: 'password'
          })
          .expect(400)
          .then((res) => {
              expect(res.body.message).toContain('Discovery failed');
          });
      });

    it('/active (GET) should initially be empty', async () => {
        // First unlink everything to ensure a clean state
        await request(app.getHttpServer()).post('/api/playlists/unlink').expect(200);

        return request(app.getHttpServer())
            .get('/api/playlists/active')
            .expect(200)
            .expect((res) => {
                expect(res.body).toEqual(""); // or null, depending on NestJS version
            });
    });
  });
});
