import { useParams } from "react-router-dom";
import supabase from "../../supabaseClient";
import { useEffect, useState } from "react";
import { useUser } from "../../contexts/UserContext";
import { ISession } from "../../interfaces/ISession";
import styles from "./index.module.scss";
import { UserColorBar } from "../UserColorBar/index";

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
  const [selectedStrategy, setSelectedStrategy] = useState<
    "elimination" | "ranked_choice" | "simple_vote"
  >(session.voting_strategy);
  const [allowedNoms, setAllowedNoms] = useState<number>(
    session.allowed_noms || 1,
  );
  const isAdmin = userData.color === session.admin_color;
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (session) {
      setTakenColors(session.users.map((u: { color: any }) => u.color));
    }
  }, [session]);

  useEffect(() => {
    // Skip the initial render
    if (selectedStrategy === session.voting_strategy && allowedNoms === session.allowed_noms) {
      return;
    }

    // Debounce the save operation
    const saveTimeout = setTimeout(() => {
      if (isAdmin) {
        saveSettings();
      }
    }, 500);

    return () => clearTimeout(saveTimeout);
  }, [selectedStrategy, allowedNoms]);

  const chooseColor = async (color: string) => {
    if (session.users.some((u: { color: string }) => u.color === color)) {
      return;
    }

    // If this is the first user, they become the admin
    const isFirstUser = session.users.length === 0;
    const updates: Partial<ISession> = {
      users: [...session.users, { color, ready: false, votes: {} }],
    };

    // Set this user as admin if they're the first one
    if (isFirstUser) {
      updates.admin_color = color;
    }

    const { error: updateError } = await supabase
      .from("sessions")
      .update(updates)
      .eq("id", sessionId);
    if (updateError) {
      console.error("Error updating user color", updateError);
      return;
    }
    setUserData(color, sessionId!);
  };

  const handleAllHere = async () => {
    // Only the admin can advance to nomination stage
    if (!isAdmin) return;

    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        stage: "nom",
        voting_strategy: selectedStrategy,
        allowed_noms: allowedNoms,
      })
      .eq("id", sessionId);
    if (updateError) {
      console.error("Error updating session stage", updateError);
      return;
    }
    setAllHere(true);
  };

  const saveSettings = async () => {
    // Only the admin can change settings
    if (!isAdmin) return;
    
    setIsSaving(true);

    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        voting_strategy: selectedStrategy,
        allowed_noms: allowedNoms,
      })
      .eq("id", sessionId);

    if (updateError) {
      console.error("Error updating settings", updateError);
    }
    
    setIsSaving(false);
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
            <UserColorBar colors={takenColors} />
            <div className={styles.waitingContent}>
              <h2 className={styles.title}>waiting room</h2>
              <div className={styles.joinedText}>{`${takenColors.length} ${takenColors.length === 1 ? 'person (you) has joined' : 'people have joined'}`}</div>
              {session.admin_color && (
                <div className={styles.adminText}>
                  {isAdmin ? (
                    <>
                      you are the admin
                      <div className={styles.adminSubtext}>(send the link to ur friends)</div>
                    </>
                  ) : (
                    ``
                  )}
                </div>
              )}
            </div>

            <div className={styles.bottomContent}>
              {isAdmin ? (
                <>
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
                          <option disabled={true} value="ranked_choice">ranked choice - not yet implemented</option>
                          <option value="elimination">elimination</option>
                          <option value="simple_vote">simple vote</option>
                        </select>
                        {isSaving && <span className={styles.savingIndicator}>saving...</span>}
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
                        onClick={() => handleAllHere()}
                        disabled={isSaving}
                      >
                        we're all here
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className={styles.nonAdminMessage}>
                  waiting for the admin to start the session...
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