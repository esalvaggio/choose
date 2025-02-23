import { useParams } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import { ISession } from "../interfaces/ISession";
import supabase from "../supabaseClient";
import { useState } from "react";

function SimpleVoting({ session }: { session: ISession }) {
  const { sessionId } = useParams();
  const { userData } = useUser();
  const [chosenFilm, setChosenFilm] = useState("");
  const [sendToResults, setSendToResults] = useState(false)

  const vote = async () => {
    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        users: session.users.map((user) =>
          user.color === userData.color
            ? {
              ...user,
              votes: { ...user.votes, [chosenFilm]: 1 },
              ready: true
            }
            : user
        ),
      })
      .eq("id", sessionId);
    if (updateError) {
      console.error("Error voting", updateError);
      return;
    }
  }

  const handleSendToResults = async () => {
    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        stage: "result",
      })
      .eq("id", sessionId);
    if (updateError) {
      console.error("Error updating session stage", updateError);
      return;
    }
    setSendToResults(true);
  };

  const getRemainingUsers = () => {
    const remainingVotes = session.users.filter((user) =>
      !user.votes || Object.keys(user.votes).length === 0
    );
    return remainingVotes.length;
  };

  const currUserVoted = Object.keys(
    session.users.find((u) => u.color === userData.color)?.votes || {}
  ).length > 0;
  const allUsersVoted = session.users.every((user) =>
    user.votes && Object.keys(user.votes).length > 0
  );

  return sendToResults ? null : !currUserVoted ? (
    <div>
      <div>vote for the one you want</div>
      {session.films.map((film) => (
        <li key={film.title}>
          {film.nominated_by} - <span>{film.title}</span>
          <input
            type="radio"
            name="film-choice"
            checked={chosenFilm === film.title}
            onChange={() => setChosenFilm(film.title)}
          />
        </li>
      ))}
      <button onClick={vote} disabled={!chosenFilm}>
        submit
      </button>
    </div>
  ) : (
    <div>
      <div>waiting room</div>
      {!allUsersVoted ? (
        <div># of people we're waiting on: {getRemainingUsers()}</div>
      ) : (
        <div>everyone has voted</div>
      )}
      {allUsersVoted && (
        <button onClick={() => handleSendToResults()}>
          see results!
        </button>
      )}
    </div>
  );
}

export default SimpleVoting;
