import { IFilm } from "./ISession"

function EliminationVoting({ films, onVote, currentRound }: {
    films: IFilm[] | undefined
    onVote: (film: string) => void
    currentRound: number | undefined
}) {
    console.log(films, onVote, currentRound)
    return <></>
}

export default EliminationVoting;
