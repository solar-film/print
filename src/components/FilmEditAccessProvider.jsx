import { useCallback, useEffect, useRef, useState } from 'react';
import { FilmEditAccessContext } from './filmEditAccessContext';

export default function FilmEditAccessProvider({ children }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const unlockedRef = useRef(false);

  const canEdit = useCallback(() => unlockedRef.current, []);
  const lock = useCallback(() => {
    unlockedRef.current = false;
    setIsUnlocked(false);
  }, []);
  const unlock = useCallback(() => {
    unlockedRef.current = true;
    setIsUnlocked(true);
  }, []);

  useEffect(() => {
    window.addEventListener('hashchange', lock);
    return () => window.removeEventListener('hashchange', lock);
  }, [lock]);

  return (
    <FilmEditAccessContext.Provider value={{ isUnlocked, canEdit, unlock, lock }}>
      {children}
    </FilmEditAccessContext.Provider>
  );
}
