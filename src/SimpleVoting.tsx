import { IFilm } from "./ISession"

function SimpleVoting({ films, onVoteSubmit }: {
    films: IFilm[]
    onVoteSubmit: (selectedFilms: string[]) => void
}) {
    console.log(films, onVoteSubmit)
    return <></>
}

export default SimpleVoting; 