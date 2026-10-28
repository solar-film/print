import { createContext, useContext } from 'react';

export const FilmEditAccessContext = createContext(null);

export function useFilmEditAccess() {
  return useContext(FilmEditAccessContext);
}
