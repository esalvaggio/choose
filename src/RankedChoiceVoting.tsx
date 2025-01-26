import { IFilm } from "./ISession"

function RankedChoiceVoting({ films, onSubmitRanking }: {
    films: IFilm[]
    onSubmitRanking: (ranking: string[]) => void
}) {
    console.log(films, onSubmitRanking)
    return <></>
}

export default RankedChoiceVoting; 