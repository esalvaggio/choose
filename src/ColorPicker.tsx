import { useParams } from "react-router-dom";
import supabase from "./supabaseClient";
import { useEffect, useState } from "react";
import { useUser } from "./contexts/UserContext";
import { ISession } from "./ISession";

function ColorPicker({ session }: { session: ISession }) {
  const COLORS = [
    "white",
    "yellow",
    "teal",
    "green",
    "magenta",
    "red",
    "blue",
    "black",
    "grey",
  ];
  const [takenColors, setTakenColors] = useState<string[]>([]);
  const { sessionId } = useParams();
  const { userData, setUserData } = useUser();
  const [allHere, setAllHere] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [selectedStrategy, setSelectedStrategy] = useState<
    "elimination" | "ranked_choice" | "simple_vote"
  >(session.voting_strategy);
  const [allowedNoms, setAllowedNoms] = useState<number>(
    session.allowed_noms || 1,
  );

  useEffect(() => {
    if (session) {
      setTakenColors(session.users.map((u: { color: any }) => u.color));
    }
  }, [session]);

  const chooseColor = async (color: string) => {
    if (session.users.some((u: { color: string }) => u.color === color)) {
      alert("Color already taken!"); // consider better ui for this
      return;
    }

    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        users: [...session.users, { color, ready: false }],
      })
      .eq("id", sessionId);
    if (updateError) {
      console.error("Error updating user color", updateError);
      return;
    }
    setUserData(color, sessionId!);
  };

  const handleAllHere = async () => {
    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        stage: "nom",
      })
      .eq("id", sessionId);
    if (updateError) {
      console.error("Error updating session stage", updateError);
      return;
    }
    setAllHere(true);
  };

  const handleSaveSettings = async () => {
    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        voting_strategy: selectedStrategy,
        allowed_noms: allowedNoms,
      })
      .eq("id", sessionId);

    if (updateError) {
      console.error("Error updating settings", updateError);
      return;
    }
    setShowSettings(false);
  };

  const handleCloseSettings = () => {
    setSelectedStrategy(session.voting_strategy);
    setAllowedNoms(session.allowed_noms || 1);
    setShowSettings(false);
  };

  return (
    <>
      {!userData.color
        ? COLORS.filter((color) => !takenColors.includes(color)).map(
            (color) => (
              <button key={color} onClick={() => chooseColor(color)}>
                {color}
              </button>
            ),
          )
        : !allHere && (
            <div>
              <div>Waiting Room</div>
              <div>{`${takenColors.length} users have joined`}</div>
              {!showSettings && (
                <>
                  <button onClick={() => setShowSettings(true)}>
                    settings
                  </button>
                  <button onClick={() => handleAllHere()}>
                    we're all here
                  </button>
                </>
              )}
              {showSettings && (
                <>
                  <div>voting strategy:</div>
                  <select
                    value={selectedStrategy}
                    onChange={(e) =>
                      setSelectedStrategy(
                        e.target.value as
                          | "elimination"
                          | "ranked_choice"
                          | "simple_vote",
                      )
                    }
                  >
                    <option value="elimination">elimination</option>
                    <option value="ranked_choice">ranked choice</option>
                    <option value="simple_vote">simple vote</option>
                  </select>
                  <div>nominations per person:</div>
                  <input
                    type="number"
                    min="1"
                    value={allowedNoms}
                    onChange={(e) =>
                      setAllowedNoms(Math.max(1, parseInt(e.target.value)))
                    }
                  />
                  <button onClick={() => handleSaveSettings()}>
                    save settings
                  </button>
                  <button onClick={() => handleCloseSettings()}>go back</button>
                </>
              )}
            </div>
          )}
    </>
  );
}

export default ColorPicker;
