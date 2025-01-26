import { IFilm } from "./ISession"

function NominationPhase({ films, onNominate }: {
    films: IFilm[]
    onNominate: (title: string) => void
}) {
    console.log(films, onNominate)
    // allow one person to nominate multiple movies
    return <>{}</>
}

export default NominationPhase; 