import { ISession } from "./ISession";

function Results({ session }: { session: ISession }) {
  console.log(session);
  return <>Results</>;
}

export default Results;
