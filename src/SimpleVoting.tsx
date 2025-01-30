import { ISession } from "./ISession";

function SimpleVoting({ session }: { session: ISession }) {
  console.log(session);
  return <>Simple</>;
}

export default SimpleVoting;
