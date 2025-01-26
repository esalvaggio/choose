import { useParams } from "react-router-dom"
import supabase from "./supabaseClient"
import { useEffect, useState } from "react"
import { useUser } from "./contexts/UserContext"

function ColorPicker() {
  const [takenColors, setTakenColors] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const COLORS = ["white", "yellow", "teal", "green", "magenta", "red", "blue", "black", "grey"]
  const { sessionId } = useParams()
  const { setUserData } = useUser()

  useEffect(() => {
    const fetchColors = async () => {
      try {
        const { data: session, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single()
        if (error) {
          console.error("error response from supabase", error)
          return
        }
        if (session) {
          setTakenColors(session.users.map((u: { color: any }) => u.color))
        }
      } finally {
        setLoading(false)
      }
    }
    fetchColors()
  }, [sessionId])

  const chooseColor = async (color: string) => {
    const { data: session, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()
    if (error) {
      console.error("error response from supabase", error)
      return
    }
    if (session.users.some((u: { color: string }) => u.color === color)) {
      setTakenColors(session.users.map((u: { color: any }) => u.color))
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
      console.error("some update error from supabase", updateError)
      return
    }
    setUserData(color, sessionId!)
  }

  if (loading) {
    return <div></div>
  }

  return (
    <>
      {COLORS.filter((color) => !takenColors.includes(color)).map((color) => {
        return <button key={color} onClick={() => chooseColor(color)}>
          {color}
        </button>
      })}
      <div>{takenColors}</div>
    </>
  )
}

export default ColorPicker; 