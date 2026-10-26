/** DASH-06. */
export const NEW_ANIMAL_PATH = '/painel/animais/novo';

export const editAnimalPath = (id: string) => `/painel/animais/${id}`;

/** PROF-01: the NGO profile, linked from the dashboard header. */
export const PROFILE_PATH = '/painel/perfil';

/** The NGO area home (DASH-01). */
export const DASHBOARD_PATH = '/painel';

/** The public page of the NGO, linked from the area menu (T184). */
export const publicNgoPath = (slug: string) => `/ong/${slug}`;
