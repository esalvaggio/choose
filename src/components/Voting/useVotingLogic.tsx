import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ISession, IFilm } from '../../interfaces/ISession';
import supabase from '../../supabaseClient';

type VotingStrategy = 'simple_vote' | 'elimination' | 'ranked_choice';

interface UseVotingLogicProps {
  session: ISession;
  userData: { color: string | null };
  strategy: VotingStrategy;
}

export function useVotingLogic({ session, userData, strategy }: UseVotingLogicProps) {
  const { sessionId } = useParams();
  const [chosenFilm, setChosenFilm] = useState<string>('');
  const [sendToResults, setSendToResults] = useState(false);
  const [tiedFilms, setTiedFilms] = useState<IFilm[]>([]);
  const [showTieOptions, setShowTieOptions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [filmsInRound, setFilmsInRound] = useState<IFilm[]>(
    session.current_round_films && session.current_round_films.length
      ? session.current_round_films
      : session.films
  );

  // Update local state when session films change
  useEffect(() => {
    if (session.current_round_films && session.current_round_films.length > 0) {
      setFilmsInRound(session.current_round_films);
    }
  }, [session.current_round_films]);

  // Initialize current_round_films on first mount
  useEffect(() => {
    const initializeRoundFilms = async () => {
      if (!session.current_round_films || session.current_round_films.length === 0) {
        const { error } = await supabase
          .from('sessions')
          .update({ current_round_films: session.films })
          .eq('id', sessionId);

        if (!error) {
          setFilmsInRound(session.films);
        } else {
          console.error('Error initializing round films:', error);
        }
      }
    };
    initializeRoundFilms();
  }, [session.films, session.current_round_films, sessionId]);

  // Count votes for each film title
  const calculateVoteCounts = useCallback((): Record<string, number> => {
    const counts: Record<string, number> = {};
    session.users.forEach((user) => {
      Object.keys(user.votes || {}).forEach((title) => {
        counts[title] = (counts[title] || 0) + 1;
      });
    });
    return counts;
  }, [session.users]);

  // Find films with max votes
  const findMaxVotedFilms = useCallback((voteCounts: Record<string, number>) => {
    const votes = Object.values(voteCounts);
    const maxVotes = votes.length > 0 ? Math.max(...votes) : 0;
    const filmsWithMaxVotes = Object.keys(voteCounts).filter(
      (title) => voteCounts[title] === maxVotes
    );
    return { maxVotes, filmsWithMaxVotes };
  }, []);

  // Calculate which films should be eliminated and which remain for next round
  const getEliminationInfo = useCallback(() => {
    const voteCounts = calculateVoteCounts();
    const { filmsWithMaxVotes } = findMaxVotedFilms(voteCounts);
    
    // For simple voting, max votes = winners
    // For elimination, max votes = eliminate
    let toEliminate: IFilm[] = [];
    let nextRoundFilms: IFilm[] = [];
    let winningFilms: IFilm[] = [];
    
    if (strategy === 'elimination') {
      toEliminate = filmsInRound.filter(film =>
        filmsWithMaxVotes.includes(film.title)
      );
      nextRoundFilms = filmsInRound.filter(film =>
        !toEliminate.some(el => el.title === film.title)
      );
      winningFilms = nextRoundFilms;
    } else if (strategy === 'simple_vote') {
      toEliminate = filmsInRound.filter(film =>
        !filmsWithMaxVotes.includes(film.title)
      );
      nextRoundFilms = filmsInRound.filter(film =>
        !toEliminate.some(el => el.title === film.title)
      );
      winningFilms = session.films.filter(film => 
        filmsWithMaxVotes.includes(film.title)
      );
    } else if (strategy === 'ranked_choice') {
      // For ranked choice, we need to calculate based on rankings
      const { eliminated, winners } = computeRankedChoiceResults(session.users);
      toEliminate = filmsInRound.filter(film =>
        eliminated.includes(film.title)
      );
      nextRoundFilms = filmsInRound.filter(film =>
        !toEliminate.some(el => el.title === film.title)
      );
      winningFilms = session.films.filter(film => 
        winners.includes(film.title)
      );
    }
    
    return { toEliminate, nextRoundFilms, winningFilms };
  }, [filmsInRound, calculateVoteCounts, findMaxVotedFilms, strategy, session.films, session.users]);

  // Function to compute ranked choice voting results
  const computeRankedChoiceResults = (users: ISession['users']) => {
    // Get all rankings from all users who have voted
    const allRankings = users
      .filter(user => user.votes && Object.keys(user.votes).length > 0)
      .map(user => user.votes);
    
    if (allRankings.length === 0) {
      return { eliminated: [], winners: [] };
    }
    
    // Get all film titles that have been ranked
    const allFilmTitles = Array.from(
      new Set(
        allRankings.flatMap(ranking => Object.keys(ranking))
      )
    );
    
    // If there's only one film left, it's the winner
    if (allFilmTitles.length <= 1) {
      return { eliminated: [], winners: allFilmTitles };
    }
    
    // Initialize counts for first preference
    let roundCounts: Record<string, number> = {};
    let eliminated: string[] = [];
    let winners: string[] = [];
    
    // Implement Instant Runoff Voting algorithm
    while (winners.length === 0) {
      // Count first preferences for remaining films
      roundCounts = {};
      
      // For each user's vote
      allRankings.forEach(ranking => {
        // Filter to only valid remaining films and sort by preference
        const validRankings = Object.entries(ranking)
          .filter(([title]) => !eliminated.includes(title))
          .sort((a, b) => a[1] - b[1]);
        
        // If user has valid ranking, count their first preference
        if (validRankings.length > 0) {
          const [title] = validRankings[0];
          roundCounts[title] = (roundCounts[title] || 0) + 1;
        }
      });
      
      // Find film(s) with highest count
      const counts = Object.values(roundCounts);
      const maxCount = counts.length > 0 ? Math.max(...counts) : 0;
      const maxFilms = Object.keys(roundCounts).filter(
        title => roundCounts[title] === maxCount
      );
      
      // Check if any film has majority (more than 50%)
      const voteTotal = counts.reduce((sum, count) => sum + count, 0);
      const majorityThreshold = voteTotal / 2;
      
      if (maxCount > majorityThreshold || Object.keys(roundCounts).length <= 1) {
        // We have winner(s)
        winners = maxFilms;
      } else {
        // Eliminate film(s) with lowest votes
        const minCount = Math.min(...counts);
        const filmsToEliminate = Object.keys(roundCounts).filter(
          title => roundCounts[title] === minCount
        );
        eliminated = [...eliminated, ...filmsToEliminate];
        
        // If all films would be eliminated, the current max films are winners
        if (eliminated.length >= allFilmTitles.length) {
          winners = maxFilms;
        }
      }
    }
    
    return { eliminated, winners };
  };

  // Derived data
  const { toEliminate, nextRoundFilms, winningFilms } = getEliminationInfo();
  const allUsersVoted = session.users.length > 0 &&
    session.users.every((u) => u.votes && Object.keys(u.votes).length > 0);
  const currUser = session.users.find((u) => u.color === userData.color);
  const currUserVoted = Boolean(currUser?.votes && Object.keys(currUser.votes || {}).length > 0);
  const isUserInSession = !!currUser;
  const remainingUsers = session.users.filter(
    (u) => !u.votes || Object.keys(u.votes).length === 0
  ).length;

  // Auto-detect ties based on voting strategy
  useEffect(() => {
    if (allUsersVoted && filmsInRound.length > 1 && !showTieOptions) {
      if (strategy === 'elimination') {
        // Elimination strategy - tie if all would be eliminated
        if (toEliminate.length === filmsInRound.length && filmsInRound.length > 1) {
          setTiedFilms(toEliminate);
          setShowTieOptions(true);
        }
      } else if (strategy === 'simple_vote') {
        // Simple voting - tie if multiple films have max votes
        const voteCounts = calculateVoteCounts();
        const { filmsWithMaxVotes } = findMaxVotedFilms(voteCounts);
        if (filmsWithMaxVotes.length > 1) {
          const tiedFilmsData = filmsInRound.filter(film =>
            filmsWithMaxVotes.includes(film.title)
          );
          setTiedFilms(tiedFilmsData);
          setShowTieOptions(true);
        }
      } else if (strategy === 'ranked_choice') {
        // For ranked choice, we detect ties from our algorithm
        const { winners } = computeRankedChoiceResults(session.users);
        if (winners.length > 1) {
          const tiedFilmsData = filmsInRound.filter(film =>
            winners.includes(film.title)
          );
          setTiedFilms(tiedFilmsData);
          setShowTieOptions(true);
        }
      }
    }
  }, [allUsersVoted, filmsInRound, calculateVoteCounts, findMaxVotedFilms, 
      showTieOptions, strategy, toEliminate, session.users]);

  // Auto-handle case where only one film remains after elimination
  useEffect(() => {
    const handleSingleFilm = async () => {
      // For elimination, auto-finish when only one film remains
      if (strategy === 'elimination' && 
          filmsInRound.length === 1 && 
          !sendToResults && 
          !isLoading) {
        await acceptSingleWinner(filmsInRound);
      }
    };
    handleSingleFilm();
  }, [filmsInRound, sendToResults, isLoading, strategy]);

  // Clear tie state when only one film would remain
  useEffect(() => {
    if (nextRoundFilms.length === 1 && showTieOptions) {
      setShowTieOptions(false);
    }
  }, [nextRoundFilms.length, showTieOptions]);

  // Cast a vote
  const vote = async () => {
    if (!chosenFilm) return;
    
    setIsLoading(true);
    setShowTieOptions(false);
    
    const voteData = strategy === 'ranked_choice' 
      ? JSON.parse(chosenFilm) // chosenFilm contains JSON rankings
      : { [chosenFilm]: 1 }; // Simple vote for the chosen film
    
    const { error } = await supabase.rpc('cast_new_vote', {
      p_session_id: sessionId,
      p_user_color: userData.color,
      p_vote_data: voteData
    });

    if (error) console.error('Error casting vote', error);
    setIsLoading(false);
  };

  // Finalize with a single winner
  const acceptSingleWinner = async (winners = nextRoundFilms) => {
    setIsLoading(true);
    
    const { error } = await supabase
      .from('sessions')
      .update({
        stage: 'result',
        winners: winners,
        allow_multiple_winners: false
      })
      .eq('id', sessionId);
    
    if (error) console.error('Error finalizing single winner', error);
    setSendToResults(true);
    setIsLoading(false);
  };

  // For SimpleVoting: send to results
  const handleSendToResults = async () => {
    setIsLoading(true);
    
    const { error } = await supabase
      .from('sessions')
      .update({
        stage: 'result',
        winners: winningFilms,
        allow_multiple_winners: winningFilms.length > 1
      })
      .eq('id', sessionId);

    if (error) console.error('Error updating session stage', error);
    setSendToResults(true);
    setIsLoading(false);
  };

  // Handle elimination or advancing to next round
  const handleElimination = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setShowTieOptions(false);

    const { data, error } = await supabase.rpc('process_elimination_round', {
      p_session_id: sessionId
    });

    if (error) {
      console.error('Error processing elimination round', error);
      setIsLoading(false);
      return;
    }

    if (!data.success) {
      console.error('Elimination failed:', data.error);
      setIsLoading(false);
      return;
    }

    // Handle the three possible outcomes from the RPC
    switch (data.status) {
      case 'tie':
        // All films had same votes - show tie options
        setTiedFilms(data.tied_films as IFilm[]);
        setShowTieOptions(true);
        break;
      case 'winner':
        // Single winner found - real-time subscription will update UI
        setSendToResults(true);
        break;
      case 'next_round':
        // Advanced to next round - real-time subscription will update UI
        // Update local state immediately for responsiveness
        setFilmsInRound(data.remaining as IFilm[]);
        break;
    }

    setChosenFilm('');
    setIsLoading(false);
  };

  // Start a tiebreaker round
  const startTiebreakerRound = async () => {
    if (isLoading) return;
    setIsLoading(true);
    
    // Update local state first
    setFilmsInRound(tiedFilms);
    
    const { error } = await supabase
      .from('sessions')
      .update({
        users: session.users.map(u => ({ ...u, votes: {}, ready: false })),
        round: session.round + 1,
        current_round_films: tiedFilms
      })
      .eq('id', sessionId);
      
    if (error) console.error('Error starting tie-breaker round', error);
    setShowTieOptions(false);
    setChosenFilm('');
    setIsLoading(false);
  };

  // Accept multiple winners
  const acceptMultipleWinners = async () => {
    if (isLoading) return;
    setIsLoading(true);
    
    const { error } = await supabase
      .from('sessions')
      .update({
        stage: 'result',
        winners: tiedFilms,
        allow_multiple_winners: true
      })
      .eq('id', sessionId);
      
    if (error) console.error('Error accepting multiple winners', error);
    setSendToResults(true);
    setIsLoading(false);
  };

  // Get films eliminated in previous rounds
  const getEliminatedFilms = useCallback(() => {
    // Simple voting - show eliminated films after round 1 or in tie situation
    if (strategy === 'simple_vote') {
      if (session.round <= 1 && !showTieOptions) return [];

      // If we have tied films but haven't started the next round yet
      if (showTieOptions && tiedFilms.length > 0) {
        // Films are eliminated if they're in the current round but not in the tied films
        return filmsInRound.filter(film =>
          !tiedFilms.some(tiedFilm => tiedFilm.title === film.title)
        );
      }

      // Standard case: films in full list but not in current round
      return session.films.filter(film =>
        !filmsInRound.some(currentFilm =>
          currentFilm.title === film.title
        )
      );
    } else {
      // Elimination voting - show what will be eliminated
      return toEliminate;
    }
  }, [strategy, session.round, session.films, filmsInRound, showTieOptions, tiedFilms, toEliminate]);

  // Create and update rankings (for ranked choice)
  const [rankings, setRankings] = useState<Record<string, number>>({});
  
  // Update rankings when films change (for ranked choice)
  useEffect(() => {
    if (strategy === 'ranked_choice') {
      // Initialize with default ranking
      const initialRankings: Record<string, number> = {};
      filmsInRound.forEach((film, index) => {
        initialRankings[film.title] = index + 1;
      });
      setRankings(initialRankings);
    }
  }, [filmsInRound, strategy]);
  
  // Update rankings (for ranked choice)
  const updateRanking = (filmTitle: string, newRank: number) => {
    if (strategy !== 'ranked_choice') return;
    
    // Create new rankings object
    const updatedRankings = { ...rankings };
    const oldRank = updatedRankings[filmTitle];
    
    // Handle reordering
    Object.keys(updatedRankings).forEach(title => {
      if (title === filmTitle) {
        updatedRankings[title] = newRank;
      } else if (updatedRankings[title] === newRank) {
        updatedRankings[title] = oldRank;
      }
    });
    
    setRankings(updatedRankings);
    // For ranked choice, store rankings as JSON in chosenFilm
    setChosenFilm(JSON.stringify(updatedRankings));
  };

  return {
    filmsInRound,
    chosenFilm,
    setChosenFilm,
    sendToResults,
    tiedFilms,
    showTieOptions,
    isLoading,
    allUsersVoted,
    currUserVoted,
    isUserInSession,
    remainingUsers,
    toEliminate,
    nextRoundFilms,
    winningFilms,
    eliminatedFilms: getEliminatedFilms(),
    vote,
    acceptSingleWinner,
    handleSendToResults,
    handleElimination,
    startTiebreakerRound,
    acceptMultipleWinners,
    // Ranked choice specific
    rankings,
    updateRanking
  };
} 