import { useState } from "react"
import { useUser } from "./contexts/UserContext"
import { IFilm } from "./ISession"

function NominationPhase({ films, onNominate }: {
    films: IFilm[]
    onNominate: (title: string) => void
}) {
    const { userData } = useUser()
    console.log(films, onNominate)
    const [newFilm, setNewFilm] = useState("")

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (newFilm.trim()) {
            onNominate(newFilm.trim())
            setNewFilm("")
        }
    }

    return (
        <div>
            <div>Your color: {userData.color}</div>
            
            <div>
                <h3>Nominated Films:</h3>
                <ul>/
                    {films.map(film => (
                        <li key={film.title}>
                            {film.title} (nominated by {film.nominated_by})
                        </li>
                    ))}
                </ul>
            </div>

            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={newFilm}
                    onChange={(e) => setNewFilm(e.target.value)}
                    placeholder="Enter film title"
                />
                <button type="submit">Nominate Film</button>
            </form>
        </div>
    )
}

export default NominationPhase; 