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

// Set to true to test the "database paused" warning UI
const FORCE_DB_UNAVAILABLE = false;

export function SupabaseStatusProvider({ children }: SupabaseStatusProviderProps) {
  const [isDbAvailable, setIsDbAvailable] = useState(true);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSupabaseStatus = async () => {
      // For testing the warning UI
      if (FORCE_DB_UNAVAILABLE) {
        setIsDbAvailable(false);
        setError('Database is currently paused (forced for testing)');
        setIsChecking(false);
        return;
      }

      try {
        // Simple ping to check if Supabase is responding
        // We just need to make any lightweight query to see if the DB is up
        const { error } = await supabase
          .from('sessions')
          .select('id')
          .limit(1);

        if (error) {
          // PGRST116 means "no rows" which is fine - DB is working
          if (error.code === 'PGRST116') {
            setIsDbAvailable(true);
            return;
          }

          // Any other error means the database is not available
          // This includes:
          // - Network errors (ERR_NAME_NOT_RESOLVED when project is paused)
          // - Project paused/suspended errors
          // - Connection timeouts
          // - Any unexpected errors
          console.warn('Supabase check returned error:', error);
          setIsDbAvailable(false);
          
          // Check for common "project paused" error patterns for a nicer message
          const errorMessage = error.message?.toLowerCase() || '';
          const isPaused = 
            errorMessage.includes('project') ||
            errorMessage.includes('paused') ||
            errorMessage.includes('suspended') ||
            errorMessage.includes('inactive');

          if (isPaused) {
            setError('Database is currently paused');
          } else {
            setError('Unable to connect to database');
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
