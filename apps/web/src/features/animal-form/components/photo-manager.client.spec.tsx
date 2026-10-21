import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { LiveRegion } from '@/components/ui/live-region.client';
import type {
  Photo,
  UploadPhoto,
  UploadPhotoResult,
} from '../animal-form.types';
import { makePhoto } from '../test-fixtures';
import { PhotoManager, type PhotoManagerProps } from './photo-manager.client';

const UPLOADED_ID = '7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f';
const ok: UploadPhotoResult = {
  ok: true,
  id: UPLOADED_ID,
  thumbUrl: '/t.webp',
};

function Harness({
  initial,
  ...props
}: Omit<PhotoManagerProps, 'photos' | 'onChange'> & { initial: Photo[] }) {
  const [photos, setPhotos] = useState(initial);
  return (
    <LiveRegion>
      <PhotoManager photos={photos} onChange={setPhotos} {...props} />
      <p data-testid="state">
        {photos
          .map((p) => `${p.alt ?? p.key}:${p.status}:${p.id ?? '-'}`)
          .join(' ')}
      </p>
    </LiveRegion>
  );
}

function setup(
  initial: Photo[] = [],
  upload: UploadPhoto = vi.fn(async () => ok),
  props: Partial<PhotoManagerProps> = {},
) {
  const user = userEvent.setup({ applyAccept: false });
  render(
    <Harness
      initial={initial}
      max={3}
      maxUploadMb={5}
      upload={upload}
      {...props}
    />,
  );
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
  return { user, input, upload };
}

const three = () => [
  makePhoto(1, { alt: 'A' }),
  makePhoto(2, { alt: 'B' }),
  makePhoto(3, { alt: 'C' }),
];
const order = () =>
  screen
    .getAllByRole('group')
    .map((group) => within(group).getByRole('img').getAttribute('alt'));
const state = () => screen.getByTestId('state').textContent;
const file = (name = 'mel.jpg', type = 'image/jpeg') =>
  new File([new Uint8Array(10)], name, { type });

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

describe('PhotoManager', () => {
  it('AFORM-07: com limite 3 e 3 fotos, "Adicionar foto" fica desabilitado', () => {
    setup(three());

    expect(
      screen.getByRole('heading', { name: 'Fotos (3 de 3)' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Adicionar foto' }),
    ).toBeDisabled();
  });

  it('AFORM-07: abaixo do limite, "Adicionar foto" abre o seletor', async () => {
    const { user, input } = setup(three().slice(0, 2));
    const click = vi.spyOn(input, 'click');

    await user.click(screen.getByRole('button', { name: 'Adicionar foto' }));

    expect(click).toHaveBeenCalledTimes(1);
  });

  it('AFORM-09: a foto escolhida mostra a prévia, "Enviando…" e termina com o id da api', async () => {
    let resolve!: (result: UploadPhotoResult) => void;
    const upload = vi.fn<UploadPhoto>(
      () => new Promise<UploadPhotoResult>((r) => (resolve = r)),
    );
    const { user, input } = setup([], upload);

    await user.upload(input, file());

    expect(
      screen.getByRole('img', { name: 'Foto 1 do animal' }),
    ).toHaveAttribute('src', 'blob:preview');
    expect(screen.getByText('Enviando…')).toBeInTheDocument();
    const sent = upload.mock.calls[0]![0] as FormData;
    expect((sent.get('file') as File).name).toBe('mel.jpg');

    await act(async () => resolve(ok));

    expect(screen.queryByText('Enviando…')).not.toBeInTheDocument();
    expect(state()).toMatch(new RegExp(`^photo-\\d+:done:${UPLOADED_ID}$`));
  });

  it('AFORM-09: falha deixa a foto em erro com "Tentar de novo", que reenvia o mesmo arquivo', async () => {
    const upload = vi
      .fn<UploadPhoto>()
      .mockResolvedValueOnce({ ok: false, error: 'O arquivo passa de 5 MB.' })
      .mockResolvedValueOnce(ok);
    const { user, input } = setup([makePhoto(1, { alt: 'A' })], upload);

    await user.upload(input, file('nina.png', 'image/png'));

    const group = await screen.findByRole('group', { name: 'Foto 2 de 2' });
    expect(
      within(group).getByText('O arquivo passa de 5 MB.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'O arquivo passa de 5 MB.',
    );
    expect(state()).toMatch(/^A:done:\S+ photo-\d+:error:-$/);

    await user.click(
      within(group).getByRole('button', { name: 'Tentar de novo' }),
    );

    await waitFor(() => expect(state()).toMatch(`:done:${UPLOADED_ID}`));
    expect(upload).toHaveBeenCalledTimes(2);
    expect((upload.mock.calls[1]![0].get('file') as File).name).toBe(
      'nina.png',
    );
    expect(
      within(group).queryByText('O arquivo passa de 5 MB.'),
    ).not.toBeInTheDocument();
  });

  it('AFORM-09: um envio que cai (rejeita) vira erro genérico na foto', async () => {
    const { user, input } = setup(
      [],
      vi.fn(async () => Promise.reject(new Error('x'))),
    );

    await user.upload(input, file());

    expect(
      await screen.findByText(
        'Não foi possível enviar a foto. Tente de novo.',
        {
          selector: 'span',
        },
      ),
    ).toBeInTheDocument();
  });

  it('AFORM-08: arquivo que não é JPG, PNG, WebP ou HEIC é recusado sem envio', async () => {
    const { user, input, upload } = setup();

    await user.upload(input, file('anim.gif', 'image/gif'));

    expect(
      screen.getByText('Envie JPG, PNG, WebP ou HEIC de até 5 MB.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Adicionar foto' }),
    ).toHaveAttribute('aria-invalid', 'true');
    expect(upload).not.toHaveBeenCalled();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('AFORM-07: escolher mais fotos do que cabem adiciona só até o limite', async () => {
    const { user, input, upload } = setup(three().slice(0, 2));

    await user.upload(input, [file('a.jpg'), file('b.jpg')]);

    expect(screen.getAllByRole('group')).toHaveLength(3);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText(
        'Cabem até 3 fotos. As que passaram do limite ficaram de fora.',
      ),
    ).toBeInTheDocument();
  });

  it('AFORM-11: "Usar como capa" na 3ª a leva à posição 0 e anuncia', async () => {
    const { user } = setup(three());

    await user.click(
      within(screen.getByRole('group', { name: 'Foto 3 de 3' })).getByRole(
        'button',
        {
          name: 'Usar como capa',
        },
      ),
    );

    expect(order()).toEqual(['C', 'A', 'B']);
    expect(screen.getByRole('status')).toHaveTextContent(
      'A foto agora é a capa.',
    );
    const cover = screen.getByRole('group', { name: 'Foto 1 de 3' });
    expect(within(cover).getByText('Capa')).toBeInTheDocument();
    expect(
      within(cover).queryByRole('button', { name: 'Usar como capa' }),
    ).toBeNull();
    // The cover button left with the move: focus goes to a move button of the same photo.
    expect(
      within(cover).getByRole('button', { name: 'Mover para a direita' }),
    ).toHaveFocus();
  });

  it('AFORM-10/A11Y-07: botões de mover têm aria-label, respeitam as pontas e mantêm o foco', async () => {
    const { user } = setup(three());

    const left = screen.getAllByRole('button', {
      name: 'Mover para a esquerda',
    });
    const right = screen.getAllByRole('button', {
      name: 'Mover para a direita',
    });
    expect(left).toHaveLength(3);
    expect(right).toHaveLength(3);
    expect(left[0]).toBeDisabled();
    expect(right[2]).toBeDisabled();
    expect(
      screen.getAllByRole('button', { name: 'Remover foto' }),
    ).toHaveLength(3);

    await user.click(right[0]!);

    expect(order()).toEqual(['B', 'A', 'C']);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Foto movida para a posição 2 de 3.',
    );
    const moved = screen.getByRole('group', { name: 'Foto 2 de 3' });
    expect(
      within(moved).getByRole('button', { name: 'Mover para a direita' }),
    ).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(order()).toEqual(['B', 'C', 'A']);
    // At the end the right button is disabled: focus falls back to the left one.
    expect(
      within(screen.getByRole('group', { name: 'Foto 3 de 3' })).getByRole(
        'button',
        {
          name: 'Mover para a esquerda',
        },
      ),
    ).toHaveFocus();

    await user.click(
      within(screen.getByRole('group', { name: 'Foto 3 de 3' })).getByRole(
        'button',
        {
          name: 'Mover para a esquerda',
        },
      ),
    );
    expect(order()).toEqual(['B', 'A', 'C']);
  });

  it('AFORM-10: arrastar a 1ª foto até a 3ª guarda a nova ordem', () => {
    setup(three());
    const items = document.querySelectorAll('li');
    document.elementFromPoint = vi.fn(() => items[2]!.querySelector('img'));
    const area = items[0]!.querySelector('[data-slot="photo-drag-area"]')!;

    fireEvent.pointerDown(area);
    fireEvent.pointerUp(area);

    expect(order()).toEqual(['B', 'C', 'A']);
  });

  it('AFORM-10: soltar fora das fotos, na mesma foto ou cancelar não muda a ordem', () => {
    setup(three());
    const items = document.querySelectorAll('li');
    const area = items[0]!.querySelector('[data-slot="photo-drag-area"]')!;

    document.elementFromPoint = vi.fn(() => document.body);
    fireEvent.pointerDown(area);
    fireEvent.pointerUp(area);
    document.elementFromPoint = vi.fn(() => items[0]!);
    fireEvent.pointerDown(area);
    fireEvent.pointerUp(area);
    fireEvent.pointerDown(area, { button: 2 });
    fireEvent.pointerUp(area);
    fireEvent.pointerDown(area);
    fireEvent.pointerCancel(area);
    document.elementFromPoint = vi.fn(() => items[2]!);
    fireEvent.pointerUp(area);

    expect(order()).toEqual(['A', 'B', 'C']);
  });

  it('remover tira a foto, libera a prévia e devolve o foco a "Adicionar foto"', async () => {
    const { user, input } = setup(
      [],
      vi.fn(async () => ok),
    );
    await user.upload(input, file());

    await user.click(screen.getByRole('button', { name: 'Remover foto' }));

    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
    expect(screen.getByRole('status')).toHaveTextContent('Foto removida.');
    expect(
      screen.getByRole('button', { name: 'Adicionar foto' }),
    ).toHaveFocus();
  });

  it('remover uma foto já salva não mexe em object URL', async () => {
    const { user } = setup([makePhoto(1, { alt: 'A' })]);

    await user.click(screen.getByRole('button', { name: 'Remover foto' }));

    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it('AFORM-05: o erro do envio do formulário aparece no campo', () => {
    setup([], undefined, { error: 'Adicione pelo menos 1 foto.' });

    const add = screen.getByRole('button', { name: 'Adicionar foto' });
    expect(add).toHaveAttribute('aria-invalid', 'true');
    expect(add).toHaveAccessibleDescription(/Adicione pelo menos 1 foto\./);
  });

  it('prévia que o navegador não abre (HEIC fora do Safari) vira um ícone', () => {
    setup([makePhoto(1, { alt: 'A' })]);

    fireEvent.error(screen.getByRole('img', { name: 'A' }));

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'Foto 1 de 1' }),
    ).toBeInTheDocument();
  });
});
