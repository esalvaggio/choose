import { useParams } from "react-router-dom";
import supabase from "../../supabaseClient";
import { useEffect, useState } from "react";
import { useUser } from "../../contexts/UserContext";
import { ISession } from "../../interfaces/ISession";
import styles from "./index.module.scss";

function ColorPicker({ session }: { session: ISession }) {
  const TOP_ROW_COLORS = [
    "whitegrey",
    "yellow",
    "teal",
    "green",
    "magenta",
    "red",
    "blue"
  ];

  const MIDDLE_ROW_COLORS = [
    "darkOrange",
    "orange2",
    "orange3",
    "orange4",
    "orange5",
    "orange6",
    "lightOrange"
  ];

  const BOTTOM_ROW_COLORS = [
    "navy",
    "whiteblue",
    "purple",
    "darkGrey",
    "grey",
    "black"
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
      return;
    }

    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        users: [...session.users, { color, ready: false, votes: {} }],
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
    <div className={styles.container}>
      {!userData.color ? (
        <>
          <div className={styles.colorGrid}>
            <div className={styles.topRow}>
              {TOP_ROW_COLORS.map((color) => (
                <button
                  key={color}
                  className={`${styles.colorButton} ${styles[color]} ${takenColors.includes(color) ? styles.taken : ''}`}
                  onClick={() => !takenColors.includes(color) && chooseColor(color)}
                  disabled={takenColors.includes(color)}
                />
              ))}
            </div>
            <div className={styles.middleRow}>
              {MIDDLE_ROW_COLORS.map((color) => (
                <button
                  key={color}
                  className={`${styles.colorButton} ${styles[color]} ${takenColors.includes(color) ? styles.taken : ''}`}
                  onClick={() => !takenColors.includes(color) && chooseColor(color)}
                  disabled={takenColors.includes(color)}
                />
              ))}
            </div>
            <div className={styles.bottomRow}>
              {BOTTOM_ROW_COLORS.map((color) => (
                <button
                  key={color}
                  className={`${styles.colorButton} ${styles[color]} ${takenColors.includes(color) ? styles.taken : ''}`}
                  onClick={() => !takenColors.includes(color) && chooseColor(color)}
                  disabled={takenColors.includes(color)}
                />
              ))}
            </div>
            <h1 className={styles.title}>choose a color</h1>
          </div>
        </>
      ) : (
        !allHere && (
          <div className={styles.waitingRoomContainer}>
            <div className={styles.usersContainer}>
              {takenColors.map((color) => (
                <div key={color} className={`${styles.userColor} ${styles[color]}`} />
              ))}
            </div>
            <div className={styles.waitingContent}>
              <h2 className={styles.title}>waiting room</h2>
              <div className={styles.joinedText}>{`${takenColors.length} ${takenColors.length === 1 ? 'person (you lol) has joined' : 'people have joined'}`}</div>
            </div>
            
            <div className={styles.bottomContent}>
              {!showSettings ? (
                <div className={styles.buttonGroup}>
                  <button className={styles.button} onClick={() => handleAllHere()}>
                    we're all here
                  </button>
                  <button className={styles.button + ' ' + styles.settingsButton} onClick={() => setShowSettings(true)}>
                    settings
                  </button>
                </div>
              ) : (
                <div className={styles.settingsContainer}>
                  <div className={styles.settingRow}>
                    <div>voting strategy:</div>
                    <div className={styles.inputWrapper}>
                      <select
                        className={styles.select}
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
                    </div>
                  </div>

                  <div className={styles.settingRow}>
                    <div>nominations per person:</div>
                    <div className={styles.inputWrapper}>
                      <input
                        className={styles.input}
                        type="number"
                        min="1"
                        value={allowedNoms}
                        onChange={(e) =>
                          setAllowedNoms(Math.max(1, parseInt(e.target.value)))
                        }
                      />
                    </div>
                  </div>

                  <div className={styles.buttonGroup}>
                    <button
                      className={styles.button}
                      onClick={() => handleSaveSettings()}
                    >
                      save settings
                    </button>
                    <button
                      className={styles.button + ' ' + styles.settingsButton}
                      onClick={() => handleCloseSettings()}
                    >
                      go back
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}

export default ColorPicker;