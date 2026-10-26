import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import {
  type ImageVariant,
  SharpImageProcessor,
  UnsupportedImage,
} from '../sharp-image-processor.js';

const FIXTURES = join(import.meta.dirname, '../../../../../test/fixtures');
const fixture = (name: string) => readFile(join(FIXTURES, name));

async function describeVariants(variants: ImageVariant[]) {
  return Promise.all(
    variants.map(async (variant) => {
      const meta = await sharp(variant.body).metadata();
      return {
        size: variant.size,
        width: variant.width,
        height: variant.height,
        format: meta.format,
        realWidth: meta.width,
        realHeight: meta.height,
        exif: meta.exif,
      };
    }),
  );
}

describe('SharpImageProcessor', () => {
  const processor = new SharpImageProcessor();

  describe('foto de animal (160, 600 e 1200 px)', () => {
    it('JPG com GPS gera 3 variantes WebP (160, 600 e 1200) sem bloco EXIF/GPS (SEC-07, AFORM-12, T174)', async () => {
      const input = await fixture('photo-gps.jpg');
      // The fixture really carries EXIF with GPS; otherwise the test proves nothing.
      expect((await sharp(input).metadata()).exif).toBeDefined();
      expect(input.includes('FixtureCam')).toBe(true);

      const variants = await processor.process(input, 'animal');

      // 1600×1200 with Orientation=6 is a 1200×1600 portrait once rotated.
      expect(await describeVariants(variants)).toEqual([
        {
          size: 160,
          width: 160,
          height: 213,
          format: 'webp',
          realWidth: 160,
          realHeight: 213,
          exif: undefined,
        },
        {
          size: 600,
          width: 600,
          height: 800,
          format: 'webp',
          realWidth: 600,
          realHeight: 800,
          exif: undefined,
        },
        {
          size: 1200,
          width: 1200,
          height: 1600,
          format: 'webp',
          realWidth: 1200,
          realHeight: 1600,
          exif: undefined,
        },
      ]);
      for (const variant of variants) {
        expect(variant.body.includes('FixtureCam')).toBe(false);
      }
    });

    it('HEIC gera as 3 variantes WebP (AFORM-08, T174)', async () => {
      const variants = await processor.process(
        await fixture('photo.heic'),
        'animal',
      );

      expect(await describeVariants(variants)).toEqual([
        {
          size: 160,
          width: 160,
          height: 120,
          format: 'webp',
          realWidth: 160,
          realHeight: 120,
          exif: undefined,
        },
        {
          size: 600,
          width: 600,
          height: 450,
          format: 'webp',
          realWidth: 600,
          realHeight: 450,
          exif: undefined,
        },
        {
          size: 1200,
          width: 1200,
          height: 900,
          format: 'webp',
          realWidth: 1200,
          realHeight: 900,
          exif: undefined,
        },
      ]);
    });

    it('largura máxima de 1200 px: reduz o maior e não amplia o menor', async () => {
      const heic = await processor.process(
        await fixture('photo.heic'),
        'animal',
      );
      const png = await processor.process(await fixture('photo.png'), 'animal');

      expect(heic.map((v) => [v.width, v.height])).toEqual([
        [160, 120],
        [600, 450],
        [1200, 900],
      ]);
      // 800×600: the large variant keeps the original width.
      expect(png.map((v) => [v.size, v.width, v.height])).toEqual([
        [160, 160, 120],
        [600, 600, 450],
        [1200, 800, 600],
      ]);
    });

    it('WebP é aceito (AFORM-08)', async () => {
      const variants = await processor.process(
        await fixture('photo.webp'),
        'animal',
      );

      expect(variants.map((v) => [v.size, v.width, v.height])).toEqual([
        [160, 160, 231],
        [600, 600, 867],
        [1200, 900, 1300],
      ]);
    });
  });

  describe('imagem da ONG (quadrada, 160 e 600 px)', () => {
    it('modo quadrado gera 160×160 e 600×600 (SIGN-09)', async () => {
      const variants = await processor.process(
        await fixture('photo-gps.jpg'),
        'ngo',
      );

      expect(await describeVariants(variants)).toEqual([
        {
          size: 160,
          width: 160,
          height: 160,
          format: 'webp',
          realWidth: 160,
          realHeight: 160,
          exif: undefined,
        },
        {
          size: 600,
          width: 600,
          height: 600,
          format: 'webp',
          realWidth: 600,
          realHeight: 600,
          exif: undefined,
        },
      ]);
    });

    it('HEIC é recusado na imagem da ONG, que aceita só JPG, PNG ou WebP (SIGN-10)', async () => {
      await expect(
        processor.process(await fixture('photo.heic'), 'ngo'),
      ).rejects.toThrow(UnsupportedImage);
    });
  });

  describe('tipos recusados (AFORM-08, SIGN-10)', () => {
    it('GIF é recusado como tipo inválido', async () => {
      await expect(
        processor.process(await fixture('animation.gif'), 'animal'),
      ).rejects.toThrow(UnsupportedImage);
    });

    it('arquivo com extensão falsa é recusado pelo conteúdo', async () => {
      await expect(
        processor.process(await fixture('fake-extension.jpg'), 'animal'),
      ).rejects.toThrow(UnsupportedImage);
    });

    it('AVIF (HEIF que não é HEIC) é recusado', async () => {
      const avif = await sharp({
        create: { width: 16, height: 16, channels: 3, background: '#336699' },
      })
        .avif()
        .toBuffer();

      await expect(processor.process(avif, 'animal')).rejects.toThrow(
        UnsupportedImage,
      );
    });
  });

  describe('limite de 40 MP', () => {
    it('HEIC acima de 40 MP é recusado antes de decodificar', async () => {
      await expect(
        processor.process(await fixture('huge-40mp.heic'), 'animal'),
      ).rejects.toThrow(UnsupportedImage);
    });

    it('PNG acima de 40 MP é recusado', async () => {
      const huge = await sharp({
        create: { width: 8000, height: 5001, channels: 3, background: '#000' },
      })
        .png({ compressionLevel: 1 })
        .toBuffer();

      await expect(processor.process(huge, 'animal')).rejects.toThrow(
        UnsupportedImage,
      );
    });
  });

  describe('uma conversão por vez', () => {
    it('conversões simultâneas rodam em fila e terminam todas, mesmo depois de uma falha', async () => {
      const queued = new SharpImageProcessor();
      const target = queued as unknown as {
        convert: (...args: unknown[]) => Promise<ImageVariant[]>;
      };
      const convert = target.convert.bind(queued);
      let active = 0;
      let maxActive = 0;
      target.convert = async (...args) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        try {
          return await convert(...args);
        } finally {
          active -= 1;
        }
      };

      const [gif, png, heic] = await Promise.allSettled([
        queued.process(await fixture('animation.gif'), 'animal'),
        queued.process(await fixture('photo.png'), 'animal'),
        queued.process(await fixture('photo.heic'), 'animal'),
      ]);

      expect(maxActive).toBe(1);
      expect(gif.status).toBe('rejected');
      expect(png.status === 'fulfilled' && png.value.at(-1)!.width).toBe(800);
      expect(heic.status === 'fulfilled' && heic.value.at(-1)!.width).toBe(
        1200,
      );
    });
  });
});
