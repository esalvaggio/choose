import { useParams } from "react-router-dom";
import supabase from "../supabaseClient";
import { useEffect, useState } from "react";
import { ISession } from "../interfaces/ISession";
import EliminationVoting from "./EliminationVoting";
import RankedChoiceVoting from "./RankedChoiceVoting";
import SimpleVoting from "./SimpleVoting";
import ColorPicker from "./ColorPicker";
import NominationPhase from "./NominationPhase";
import { useUser } from "../contexts/UserContext";
import Results from "./Results";

export default function Session() {
  const { sessionId } = useParams();
  const [session, setSession] = useState<ISession | null>(null);
  const { userData, clearUserData } = useUser();

  useEffect(() => {
    if (userData.sessionId && userData.sessionId !== sessionId) {
      clearUserData();
    }
  }, [sessionId, userData.sessionId]);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: session, error } = await supabase.rpc('get_or_create_session', {
        p_session_id: sessionId
      });

      if (error) {
        console.error("Failed to get or create session:", error);
        return;
      }
      
      setSession(session);
    };
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          console.log("Received real-time update:", {
            event: payload.eventType,
            old: payload.old,
            new: payload.new,
            timestamp: new Date().toISOString(),
          });
          setSession(payload.new as ISession);
        },
      )
      .subscribe();

    fetchSession();
    return () => {
      channel.unsubscribe();
    };
  }, [sessionId]);

  if (!session) return <div></div>;

  return (
    <div>
      {session.stage == "color" ? (
        <ColorPicker session={session} />
      ) : (
        <div>
          {session.stage === "nom" && <NominationPhase session={session} />}
          {session.stage === "vote" && (
            <>
              {session.voting_strategy === "elimination" && (
                <EliminationVoting session={session} />
              )}
              {session.voting_strategy === "ranked_choice" && (
                <RankedChoiceVoting session={session} />
              )}
              {session.voting_strategy === "simple_vote" && (
                <SimpleVoting session={session} />
              )}
            </>
          )}
          {session.stage === "result" && <Results session={session} />}
        </div>
      )}
    </div>
  );
}
