import { useState } from "react"
import { useParams } from "react-router-dom"
import { useUser } from "./contexts/UserContext"
import { ISession } from "./ISession"
import supabase from "./supabaseClient"

function NominationPhase({ session }: {
    session: ISession
}) {
    const { sessionId } = useParams()
    const { userData } = useUser()
    const [newFilm, setNewFilm] = useState("")
    const [done, setDone] = useState(false)

    const nominateFilm = async (title: string) => {
        const remainingNoms = getRemainingNoms()
        if (remainingNoms <= 0) {
            alert("You've reached your nomination limit!")
            return
        }
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (newFilm.trim()) {
            nominateFilm(newFilm.trim())
            setNewFilm("")
        }
    }

    const deleteNomination = async (titleToDelete: string) => {
        const updatedFilms = session.films.filter(film => film.title !== titleToDelete)

        const { error } = await supabase
            .from('sessions')
            .update({
                films: updatedFilms
            })
            .eq('id', sessionId)

        if (error) {
            console.error("Error deleting nomination:", error)
            alert("Failed to delete nomination")
        }
    }

    const getRemainingNoms = () => {
        const allowed_noms = session.allowed_noms
        const userNominations = session.films.filter(film => film.nominated_by === userData.color)
        return allowed_noms - userNominations.length
    }
    const remainingNoms = getRemainingNoms()

    const handleDone = async () => {
        const { error: updateError } = await supabase
            .from('sessions')
            .update({
                stage: "vote"
            })
            .eq('id', sessionId)
        if (updateError) {
            console.error("Error updating session stage", updateError)
            return
        }
        setDone(true)
    }

    return (
        (!done && <div>
            <div>your color: {userData.color}</div>

            <div>
                <h3>nominated films</h3>
                <ul>
                    {session.films
                        .filter(film => film.nominated_by === userData.color)
                        .map(film => (
                            <li key={film.title}>
                                {film.title}
                                <button
                                    onClick={() => deleteNomination(film.title)}
                                >
                                    ×
                                </button>
                            </li>
                        ))}
                </ul>
                <div>
                    number of remaining noms: {remainingNoms}
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={newFilm}
                    onChange={(e) => setNewFilm(e.target.value)}
                    placeholder="Enter film title"
                    disabled={remainingNoms <= 0}
                />
                <button
                    disabled={remainingNoms <= 0}
                    type="submit">Nominate Film</button>
            </form>
            <button onClick={() => handleDone()}>i'm done</button>
        </div>)
    )
}

export default NominationPhase; 