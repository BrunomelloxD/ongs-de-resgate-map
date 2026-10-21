import { Readable } from 'node:stream';
import { StreamableFile } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppConfigService } from '@/common/config/app-config.service.js';
import type { Mocked } from 'vitest';
import { SessionGuard } from '@/modules/sessions/guards/session.guard.js';
import { NGO_ID } from '../../test-fixtures.js';
import { MediaService } from '../../services/media.service.js';
import { MediaController } from '../media.controller.js';

describe('MediaController', () => {
  let controller: MediaController;
  let media: Mocked<MediaService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        {
          provide: MediaService,
          useValue: { uploadAnimalImage: vi.fn(), getPublicImage: vi.fn() },
        },
        // Needed by the route's UploadTooLargeFilter.
        { provide: AppConfigService, useValue: {} },
      ],
    })
      .overrideGuard(SessionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(MediaController);
    media = module.get(MediaService);
  });

  it('upload envia o arquivo para a ONG da sessão (SEC-05)', async () => {
    const file = { buffer: Buffer.from('jpg'), size: 3 };
    const uploaded = {
      id: 'img-1',
      thumbUrl: '/img/ngos/n/images/img-1-160.webp',
      width: 1200,
      height: 900,
    };
    media.uploadAnimalImage.mockResolvedValue(uploaded);

    const result = await controller.upload(
      { ngoId: NGO_ID, sessionId: 's-1' },
      file,
    );

    expect(result).toBe(uploaded);
    expect(media.uploadAnimalImage).toHaveBeenCalledWith(NGO_ID, file);
  });

  it('read junta os segmentos da chave e devolve o stream como image/webp (PERF-02)', async () => {
    media.getPublicImage.mockResolvedValue(Readable.from([Buffer.from('w')]));

    const result = await controller.read([
      'ngos',
      NGO_ID,
      'images',
      'img-1-1200.webp',
    ]);

    expect(media.getPublicImage).toHaveBeenCalledWith(
      `ngos/${NGO_ID}/images/img-1-1200.webp`,
    );
    expect(result).toBeInstanceOf(StreamableFile);
    expect(result.getHeaders().type).toBe('image/webp');
  });
});
