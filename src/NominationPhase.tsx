import { useUser } from "./contexts/UserContext"
import { IFilm } from "./ISession"

function NominationPhase({ films, onNominate }: {
    films: IFilm[]
    onNominate: (title: string) => void
}) {
    const { userData } = useUser()
    console.log(films, onNominate)
    // allow one person to nominate multiple movies
    return <>{userData.color}</>
}

export default NominationPhase; 