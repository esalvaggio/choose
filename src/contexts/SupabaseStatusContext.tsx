import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import supabase from '../supabaseClient';

interface SupabaseStatusContextType {
  isDbAvailable: boolean;
  isChecking: boolean;
  error: string | null;
}

const SupabaseStatusContext = createContext<SupabaseStatusContextType>({
  isDbAvailable: true,
  isChecking: true,
  error: null,
});

export function useSupabaseStatus() {
  return useContext(SupabaseStatusContext);
}

interface SupabaseStatusProviderProps {
  children: ReactNode;
}

export function SupabaseStatusProvider({ children }: SupabaseStatusProviderProps) {
  const [isDbAvailable, setIsDbAvailable] = useState(true);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSupabaseStatus = async () => {
      try {
        // Simple ping to check if Supabase is responding
        // We just need to make any lightweight query to see if the DB is up
        const { error } = await supabase
          .from('sessions')
          .select('id')
          .limit(1);

        if (error) {
          // Check for common "project paused" error patterns
          const errorMessage = error.message?.toLowerCase() || '';
          const errorCode = error.code?.toLowerCase() || '';
          
          const isPaused = 
            errorMessage.includes('project') ||
            errorMessage.includes('paused') ||
            errorMessage.includes('suspended') ||
            errorMessage.includes('inactive') ||
            errorCode.includes('pgrst') ||
            error.code === '503' ||
            error.code === 'PGRST000';

          if (isPaused) {
            setIsDbAvailable(false);
            setError('Database is currently paused');
          } else {
            // Other errors might just be network issues, assume available
            // PGRST116 means "no rows" which is fine
            if (error.code !== 'PGRST116') {
              console.warn('Supabase check returned error:', error);
            }
            setIsDbAvailable(true);
          }
        } else {
          setIsDbAvailable(true);
        }
      } catch (e) {
        // Network error or Supabase completely down
        console.error('Supabase status check failed:', e);
        setIsDbAvailable(false);
        setError('Unable to connect to database');
      } finally {
        setIsChecking(false);
      }
    };

    checkSupabaseStatus();
  }, []);

  return (
    <SupabaseStatusContext.Provider value={{ isDbAvailable, isChecking, error }}>
      {children}
    </SupabaseStatusContext.Provider>
  );
}
