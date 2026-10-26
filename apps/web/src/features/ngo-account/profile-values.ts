import { maskCep, maskWhatsapp } from '@/lib/masks';
import type { MyNgo, ProfileValues } from './ngo-account.types';

/** The saved profile as the form shows it (PROF-01): masked, with the saved pin. */
export function toProfileValues(ngo: MyNgo): ProfileValues {
  const { address } = ngo;
  return {
    legalName: ngo.legalName,
    description: ngo.description,
    email: ngo.email,
    // The api keeps 55 + DDD + number; the field takes DDD + number.
    whatsapp: maskWhatsapp(ngo.whatsapp.slice(2)),
    cep: maskCep(address.cep),
    street: address.street,
    number: address.number,
    complement: address.complement ?? '',
    district: address.district,
    city: address.city,
    uf: address.uf,
    location: {
      lat: ngo.lat,
      lng: ngo.lng,
      confirmedAt: ngo.locationConfirmedAt,
    },
    openingHours: ngo.weekHours.map(
      ({ dayOfWeek, closed, opensAt, closesAt }) => ({
        dayOfWeek,
        closed,
        opensAt,
        closesAt,
      }),
    ),
  };
}
