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
      const { data: existingSession, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (error) {
        console.error("Failed to pull session details from supabase", error);
      }

      if (!existingSession && sessionId) {
        const newSession: ISession = {
          id: sessionId,
          films: [],
          voting_strategy: "simple_vote",
          stage: "color",
          users: [],
          current_round: 0,
          allowed_noms: 1,
        };
        const { data: createdSession, error } = await supabase
          .from("sessions")
          .insert(newSession)
          .select()
          .single();

        if (error) {
          console.error("Failed to create session:", error);
          return;
        }
        if (createdSession) {
          setSession(newSession);
        }
      } else {
        setSession(existingSession);
      }
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
