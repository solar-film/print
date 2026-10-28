import { useCallback, useEffect, useRef, useState } from 'react';
import { FilmEditAccessContext } from './filmEditAccessContext';
import FilmPasswordDialog from './FilmPasswordDialog';

export default function FilmEditAccessProvider({ children }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const unlockedRef = useRef(false);
  const pendingAction = useRef(null);

  const canEdit = useCallback(() => unlockedRef.current, []);
  const lock = useCallback(() => {
    unlockedRef.current = false;
    pendingAction.current = null;
    setIsUnlocked(false);
    setShowDialog(false);
  }, []);

  useEffect(() => {
    window.addEventListener('hashchange', lock);
    return () => window.removeEventListener('hashchange', lock);
  }, [lock]);

  const requestAccess = useCallback((action) => {
    if (unlockedRef.current) {
      action?.();
      return;
    }
    pendingAction.current = action || null;
    setShowDialog(true);
  }, []);

  const handleUnlock = () => {
    unlockedRef.current = true;
    setIsUnlocked(true);
    setShowDialog(false);
    const action = pendingAction.current;
    pendingAction.current = null;
    action?.();
  };

  return (
    <FilmEditAccessContext.Provider value={{ isUnlocked, canEdit, requestAccess, lock }}>
      {children}
      {showDialog && <FilmPasswordDialog onUnlock={handleUnlock} onClose={lock} />}
    </FilmEditAccessContext.Provider>
  );
}
