import { render, screen } from '@testing-library/react';
import {
  makeDemoInfo,
  makeLockedDemoInfo,
  makePhotoCredit,
} from '../test-fixtures';
import { AboutDemo } from './about-demo';

function valueOf(label: string) {
  return screen.getByText(label, { selector: 'dt' }).nextElementSibling;
}

const INFO = makeDemoInfo({
  retentionDays: 7,
  quotas: {
    maxNgos: 30,
    signupsPerIpPerDay: 2,
    maxAnimalsPerNgo: 10,
    maxImagesPerAnimal: 3,
    maxUploadMb: 5,
    maxStorageMb: 500,
  },
});

describe('AboutDemo', () => {
  it('explica a exclusão automática com os dias de retenção (DEMO-02)', () => {
    render(<AboutDemo info={INFO} credits={[]} />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Sobre a demonstração' }),
    ).toBeVisible();
    expect(
      screen.getByText(
        'Esta é uma demonstração. Cada ONG cadastrada aqui é apagada automaticamente 7 dias depois do cadastro, junto com os animais e as fotos. As ONGs de exemplo não são apagadas.',
      ),
    ).toBeVisible();
  });

  it('demo fechada (DEP-63): explica a conta de demonstração e o reset diário, sem os 7 dias', () => {
    render(<AboutDemo info={makeLockedDemoInfo()} credits={[]} />);

    expect(
      screen.getByText(
        'Esta é uma demonstração fechada: não é possível cadastrar ONGs. Entre com a conta de demonstração, mostrada na tela de login, para conhecer o painel. Os animais cadastrados nela são apagados todos os dias; as ONGs de exemplo não são apagadas.',
      ),
    ).toBeVisible();
    expect(
      screen.queryByText(/apagada automaticamente 7 dias/),
    ).not.toBeInTheDocument();
  });

  it('mostra as 6 cotas e os dias de retenção com os valores recebidos', () => {
    render(<AboutDemo info={INFO} credits={[]} />);

    expect(valueOf('Dias até a exclusão automática')).toHaveTextContent(/^7$/);
    expect(valueOf('ONGs cadastradas ao mesmo tempo')).toHaveTextContent(
      /^30$/,
    );
    expect(valueOf('Cadastros por rede a cada 24 horas')).toHaveTextContent(
      /^2$/,
    );
    expect(valueOf('Animais por ONG')).toHaveTextContent(/^10$/);
    expect(valueOf('Fotos por animal')).toHaveTextContent(/^3$/);
    expect(valueOf('Tamanho máximo de cada arquivo (MB)')).toHaveTextContent(
      /^5$/,
    );
    expect(
      valueOf('Armazenamento total da demonstração (MB)'),
    ).toHaveTextContent(/^500$/);
    expect(screen.getAllByRole('definition')).toHaveLength(7);
  });

  it('demo desligada (DEMO-20): avisa que nada é apagado', () => {
    render(<AboutDemo info={makeDemoInfo({ enabled: false })} credits={[]} />);

    expect(
      screen.getByText(
        'O modo demonstração está desligado: nada é apagado automaticamente e os limites abaixo não se aplicam.',
      ),
    ).toBeVisible();
    expect(screen.queryByText(/apagada automaticamente/)).toBeNull();
  });

  it('cada foto tem título, autor e licença com link', () => {
    const credits = [
      makePhotoCredit(),
      makePhotoCredit({
        title: 'Rescue dog in Finland',
        creator: 'Havu Pellikka',
        license: 'CC BY-SA 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
        page: 'https://commons.wikimedia.org/wiki/File:Rescue_dog_in_Finland.jpg',
      }),
    ];
    render(<AboutDemo info={INFO} credits={credits} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[1]).toHaveTextContent('por Havu Pellikka');
    expect(
      screen.getByRole('link', { name: 'Rescue dog in Finland' }),
    ).toHaveAttribute(
      'href',
      'https://commons.wikimedia.org/wiki/File:Rescue_dog_in_Finland.jpg',
    );
    expect(
      screen.getAllByRole('link', { name: 'Licença: CC BY-SA 4.0' })[0],
    ).toHaveAttribute('href', 'https://creativecommons.org/licenses/by-sa/4.0');
    expect(items[0]).toHaveTextContent('por Marilyn Peddle');
    expect(items[0]).toHaveTextContent('Licença: CC BY 2.0');
  });
});
