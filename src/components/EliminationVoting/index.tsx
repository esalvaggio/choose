import { useParams } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";
import { ISession } from "../../interfaces/ISession";
import supabase from "../../supabaseClient";

function EliminationVoting({ session }: { session: ISession }) {
  // i want to keep doing rounds of elimination voting until there is only movie left
  const { sessionId } = useParams();
  const { userData } = useUser();

  const vote = async (title: string) => {
    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        users: session.users.map((user) =>
          user.color === userData.color ? { ...user, [title]: 1 } : user,
        ),
      })
      .eq("id", sessionId);
    if (updateError) {
      console.error("Error voting", updateError);
      return;
    }
  }
  return (
    <div>
      <div>vote for the one you don't want</div>
      <div>this is round {session.round}</div>
      {session.films.map((film) => (
        <li key={film.title}>
          {film.nominated_by} -{" "}
          <span>
            {film.title}
          </span>
          <input type="checkbox" onChange={(e) => vote(e.target.checked ? film.title : "")} />
        </li>
      ))}
    </div>
  );
}

export default EliminationVoting;
