import { EMPTY_SIGNUP } from './components/signup-provider.client';
import { firstPendingStep } from './pending-step';
import { makeSignupData } from './test-fixtures';

describe('firstPendingStep', () => {
  it('assistente vazio: qualquer etapa depois da primeira volta para "about"', () => {
    expect(firstPendingStep(EMPTY_SIGNUP, 'about')).toBeNull();
    expect(firstPendingStep(EMPTY_SIGNUP, 'contact')).toBe('about');
    expect(firstPendingStep(EMPTY_SIGNUP, 'review')).toBe('about');
  });

  it('tudo válido: nenhuma etapa pendente, nem na revisão', () => {
    expect(firstPendingStep(makeSignupData(), 'review')).toBeNull();
  });

  it('a senha some ao recarregar: a revisão volta para "contact"', () => {
    const data = makeSignupData();
    data.contact = { ...data.contact, password: '', confirmation: '' };

    expect(firstPendingStep(data, 'review')).toBe('contact');
    expect(firstPendingStep(data, 'contact')).toBeNull();
  });

  it('SIGN-22: pino não confirmado → horário e revisão voltam para "address"', () => {
    const data = makeSignupData();
    data.address = { ...data.address, location: null };

    expect(firstPendingStep(data, 'hours')).toBe('address');
    expect(firstPendingStep(data, 'review')).toBe('address');
  });

  it('SIGN-25: horário inválido → a revisão volta para "hours"', () => {
    const data = makeSignupData();
    data.hours.openingHours[1] = {
      dayOfWeek: 1,
      closed: false,
      opensAt: '18:00',
      closesAt: '09:00',
    };

    expect(firstPendingStep(data, 'review')).toBe('hours');
  });
});
