import { useParams } from "react-router-dom";
import supabase from "./supabaseClient";
import { useEffect, useState } from "react";
import { ISession } from "./ISession";
// import EliminationVoting from "./EliminationVoting"
// import RankedChoiceVoting from "./RankedChoiceVoting"
// import SimpleVoting from "./SimpleVoting"
import ColorPicker from "./ColorPicker"
import NominationPhase from "./NominationPhase"
import { useUser } from "./contexts/UserContext";
import Results from "./Results"

export default function Session() {
  const { sessionId } = useParams()
  const [session, setSession] = useState<ISession | null>(null)
  const { userData, clearUserData } = useUser()

  useEffect(() => {
    if (userData.sessionId && userData.sessionId !== sessionId) {
      clearUserData()
    }
  }, [sessionId, userData.sessionId])

  useEffect(() => {
    const fetchSession = async () => {
      const { data: existingSession, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (error) {
        console.error('Failed to pull session details from supabase', error)
      }

      if (!existingSession && sessionId) {
        const newSession: ISession = {
          id: sessionId,
          films: [],
          voting_strategy: 'elimination',
          stage: 'nominating',
          users: [],
          current_round: 0
        }
        const { data: createdSession, error } = await supabase
          .from('sessions')
          .insert(newSession)
          .select()
          .single()

        if (error) {
          console.error('Failed to create session:', error)
          return
        }
        if (createdSession) {
          setSession(newSession)
        }

      } else {
        console.log(existingSession)
        setSession(existingSession)
      }
    }
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sessions',
        filter: `id=eq.${sessionId}`
      },
        payload => {
          setSession(payload.new as ISession)
        })
      .subscribe()

    fetchSession()
    return () => { channel.unsubscribe() }
  }, [sessionId])

  // const submitVote = async (vote: any) => {
  //   if (!myColor || !session) return

  //   const userIndex = session.users.findIndex(u => u.color === myColor)
  //   if (userIndex === -1) return

  //   const updatedUsers = [...session.users]

  //   switch (session.voting_strategy) {
  //     case 'elimination':
  //       updatedUsers[userIndex].votes = {
  //         eliminated_choice: vote as string
  //       }
  //       break
  //     case 'ranked_choice':
  //       updatedUsers[userIndex].votes = {
  //         ranked_choices: vote as string[]
  //       }
  //       break
  //     case 'simple_vote':
  //       updatedUsers[userIndex].votes = {
  //         selected_films: vote as string[]
  //       }
  //       break
  //   }
  // }


  const nominateFilm = async (title: string) => {
    if (!userData.color || !session) return

    const newFilm = {
      title,
      nominated_by: userData.color,
      eliminated: false
    }

    await supabase
      .from('sessions')
      .update({
        films: [...session.films, newFilm]
      })
      .eq('id', sessionId)
  }

  // const renderVotingPhase = () => {
  //   if (!session || !myColor) return null

  //   switch (session.voting_strategy) {
  //     case 'elimination':
  //       return (
  //         <EliminationVoting
  //           films={session.films.filter(f => !f.eliminated)}
  //           onVote={(film: string) => submitVote(film)}
  //           currentRound={session.current_round}
  //         />
  //       )
  //     case 'ranked_choice':
  //       return (
  //         <RankedChoiceVoting
  //           films={session.films}
  //           onSubmitRanking={(ranking: string[]) => submitVote(ranking)}
  //         />
  //       )
  //     case 'simple_vote':
  //       return (
  //         <SimpleVoting
  //           films={session.films}
  //           onVoteSubmit={(selectedFilms: string[]) => submitVote(selectedFilms)}
  //         />
  //       )
  //   }
  // }
  if (!session) return <div></div>

  return (
    <div>
      {!userData.color || userData.sessionId !== sessionId ? (
        <ColorPicker />
      ) : (
        <div>
          {session.stage === 'nominating' && (
            <NominationPhase
              onNominate={nominateFilm}
              films={session.films}
            />
          )}
          {/* {session.stage === 'voting' && renderVotingPhase()} */}
          {session.stage === 'complete' && (
            <Results
              session={session}
            />
          )}
        </div>
      )}
    </div>
  )
}
