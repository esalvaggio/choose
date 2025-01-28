import { useParams } from "react-router-dom"
import supabase from "./supabaseClient"
import { useEffect, useState } from "react"
import { useUser } from "./contexts/UserContext"
import { ISession } from "./ISession"

function ColorPicker({ session }: { session: ISession }) {
  const [takenColors, setTakenColors] = useState<string[]>([])
  const COLORS = ["white", "yellow", "teal", "green", "magenta", "red", "blue", "black", "grey"]
  const { sessionId } = useParams()
  const { userData, setUserData } = useUser()
  const [allHere, setAllHere] = useState<boolean>(false)

  useEffect(() => {
    if (session) {
      setTakenColors(session.users.map((u: { color: any }) => u.color))
    }
  }, [session])

  const chooseColor = async (color: string) => {
    if (session.users.some((u: { color: string }) => u.color === color)) {
      alert('Color already taken!') // consider better ui for this
      return
    }

    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        users: [...session.users, { color, ready: false }]
      })
      .eq('id', sessionId)
    if (updateError) {
      console.error("Error updating user color", updateError)
      return
    }
    setUserData(color, sessionId!)
  }

  const handleAllHere = async () => {
    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        stage: "nom"
      })
      .eq('id', sessionId)
    if (updateError) {
      console.error("Error updating session stage", updateError)
      return
    }
    setAllHere(true)
  }

  return (
    <>
      {!userData.color ? (
        COLORS.filter((color) => !takenColors.includes(color)).map((color) => (
          <button key={color} onClick={() => chooseColor(color)}>
            {color}
          </button>
        ))
      ) : (
        !allHere && (
          <div>
            <div>Waiting Room</div>
            <div>{`${takenColors.length} users have joined`}</div>
            <button>settings</button>
            <button onClick={() => handleAllHere()}>we're all here</button>
          </div>
        )
      )}
    </>
  )
}

export default ColorPicker; 