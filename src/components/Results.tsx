import { ISession } from "../interfaces/ISession";

function Results({ session }: { session: ISession }) {
  const films = session.films.map((film) => ({
    filmTitle: film.title,
    count: 0,
    nominatedBy: film.nominated_by
  }))
  session.users.forEach((user) => {
    Object.keys(user.votes).forEach((filmTitle) => {
      const foundFilm = films.find((f) => f.filmTitle === filmTitle)
      if (foundFilm) {
        foundFilm.count++
      }
    })
  })
  let maxCount = 0
  let winningFilm = films[0]

  films.forEach((film) => {
    if (film.count > maxCount) {
      maxCount = film.count
      winningFilm = film
    }
  })
  return <div>
    <div>the following has been chosen:</div>
    <div>{winningFilm.filmTitle}</div>
    <div>nominated by {winningFilm.nominatedBy}</div>
  </div>
}

export default Results;
