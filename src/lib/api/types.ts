export type DeckValue = number | "?";

export type ParticipantRole = "moderator" | "voter";

export interface Participant {
  id: string;
  name: string;
  role: ParticipantRole;
  hasVoted: boolean;
}

export interface Vote {
  participantId: string;
  value: DeckValue;
}

export type RoomStatus = "voting" | "revealed";

export interface Room {
  id: string;
  name: string;
  deck: DeckValue[];
  status: RoomStatus;
  participants: Participant[];
  votes: Vote[];
}

export interface AiSuggestion {
  suggested_story_points: number;
  confidence_score: number;
  justification: string;
}

export interface CreateRoomInput {
  name: string;
  moderatorName: string;
  deck: DeckValue[];
}

export interface JoinRoomInput {
  name: string;
}

export interface SelfIdentity {
  roomId: string;
  participantId: string;
  name: string;
  role: ParticipantRole;
}

export type ServerMessage =
  | { type: "room_state"; room: Room }
  | { type: "participant_joined"; participant: Participant }
  | { type: "vote_cast"; participantId: string; value: DeckValue }
  | { type: "votes_revealed"; votes: Vote[] }
  | { type: "ai_suggestion"; suggestion: AiSuggestion };

export interface RoomService {
  createRoom(input: CreateRoomInput): Promise<Room>;
  getRoom(roomId: string): Promise<Room>;
  joinRoom(roomId: string, input: JoinRoomInput): Promise<Participant>;
  vote(roomId: string, participantId: string, value: DeckValue): Promise<void>;
  reveal(roomId: string): Promise<Vote[]>;
  subscribe(roomId: string, onMessage: (message: ServerMessage) => void): () => void;
}
