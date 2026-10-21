// Safe for Client Components: Server Actions become references in the client bundle.
export { geocodeAddress } from './actions/geocode-address';
export { lookupCep } from './actions/lookup-cep';
export type {
  CepAddress,
  GeocodeInput,
  GeocodeResult,
  LookupCepResult,
} from './location.types';
