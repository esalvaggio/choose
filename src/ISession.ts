export interface ISession {
    id: string;
    created_at?: string;
    voting_strategy: 'elimination' | 'ranked_choice' | 'simple_vote';
    films: IFilm[];
    stage: "color" | "nom" | "vote" | "result";
    users: {
        votes: {
            eliminated_choice?: string;
            ranked_choices?: string[];
            selected_films?: string[]
        };
        color: string;
        ready: boolean;
    }[];
    current_round?: number
    allowed_noms: number
}

export interface IFilm {
    title: string;
    nominated_by: string;
    eliminated?: boolean;
    votes?: number;
}