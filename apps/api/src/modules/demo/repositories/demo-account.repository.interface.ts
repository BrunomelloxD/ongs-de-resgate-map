export interface DemoAccountNgo {
  id: string;
  lat: number;
  lng: number;
  city: string;
  uf: string;
}

export interface Point {
  lat: number;
  lng: number;
}

/**
 * The shared account of the locked demo (AD-008), found by DEMO_ACCOUNT_EMAIL.
 * Abstract class (not an interface) so it works as a DI token.
 */
export abstract class IDemoAccountRepository {
  abstract findByEmail(email: string): Promise<DemoAccountNgo | null>;
  /** Active NGOs of a city, for the map's first frame (DEP-22). */
  abstract findActivePoints(city: string, uf: string): Promise<Point[]>;
  /** Animals and pending uploads of the NGO; returns how many animals. */
  abstract deleteAnimals(ngoId: string): Promise<number>;
}
