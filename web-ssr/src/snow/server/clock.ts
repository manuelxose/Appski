/** Reloj inyectable para determinismo en tests (C22, FIXED_NOW). */
export type Clock = () => Date;

export const systemClock: Clock = () => new Date();
