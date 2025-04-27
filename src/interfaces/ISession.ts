export interface ISession {
  id: string;
  created_at?: string;
  voting_strategy: "elimination" | "ranked_choice" | "simple_vote";
  films: IFilm[];
  stage: "color" | "nom" | "vote" | "result";
  users: {
    color: string;
    ready: boolean;
    votes: {
      [filmTitle: string]: number;
    };
  }[];
  round: number;
  current_round_films?: IFilm[];
  winners?: IFilm[];
  allow_multiple_winners?: boolean;
  allowed_noms: number;
  admin_color?: string;
}

export interface IFilm {
  title: string;
  nominated_by: string;
  eliminated?: boolean;
}
