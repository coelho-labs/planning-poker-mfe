import type {
  AiSuggestion,
  CreateRoomInput,
  DeckValue,
  JoinRoomInput,
  Participant,
  Room,
  RoomService,
  ServerMessage,
  Vote,
} from "./types";

type Listener = (message: ServerMessage) => void;

const rooms = new Map<string, Room>();
const listeners = new Map<string, Set<Listener>>();

const BOT_NAMES = ["Ana", "Bruno", "Carla"];
const BOT_DELAYS = [700, 1600, 2400];

function emit(roomId: string, message: ServerMessage): void {
  listeners.get(roomId)?.forEach((listener) => listener(message));
}

function nextId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function numericDeck(deck: DeckValue[]): number[] {
  return deck.filter((value): value is number => typeof value === "number");
}

function pickBotValues(deck: DeckValue[]): DeckValue[] {
  const numbers = numericDeck(deck);
  if (numbers.length < 3) {
    return [numbers[0] ?? 1, numbers[numbers.length - 1] ?? 13, numbers[1] ?? 5];
  }
  const low = numbers[1];
  const high = numbers[numbers.length - 2];
  const mid = numbers[Math.floor(numbers.length / 2)];
  return [low, high, mid];
}

function buildAiSuggestion(votes: Vote[]): AiSuggestion {
  const numbers = votes
    .map((vote) => vote.value)
    .filter((value): value is number => typeof value === "number")
    .sort((a, b) => a - b);

  const mid = numbers.length / 2;
  const median = numbers.length
    ? Math.round((numbers[Math.floor(mid - 0.5)] + numbers[Math.ceil(mid + 0.5) - 1]) / 2)
    : 3;
  const suggested = Math.max(0, median);
  const spread = numbers.length > 1 ? numbers[numbers.length - 1] - numbers[0] : 0;
  const confidence = spread === 0 ? 0.92 : spread <= 2 ? 0.8 : 0.64;

  return {
    suggested_story_points: suggested,
    confidence_score: confidence,
    justification:
      spread === 0
        ? `Todos os votos convergiram para ${suggested} pontos — consenso total.`
        : `Há divergência de ${spread} pontos entre o menor e o maior voto. A mediana sugere ${suggested} pontos; debata os extremos antes de fechar.`,
  };
}

function scheduleBotVotes(roomId: string, values: DeckValue[]): void {
  const room = rooms.get(roomId);
  if (!room) return;

  BOT_NAMES.forEach((name, index) => {
    setTimeout(() => {
      const bot = room.participants.find((participant) => participant.name === name);
      if (!bot || room.status !== "voting") return;
      bot.hasVoted = true;
      room.votes.push({ participantId: bot.id, value: values[index] ?? 3 });
      emit(roomId, { type: "vote_cast", participantId: bot.id, value: values[index] ?? 3 });
    }, BOT_DELAYS[index] ?? 2400);
  });
}

export const mockRoomService: RoomService = {
  async createRoom(input: CreateRoomInput): Promise<Room> {
    const room: Room = {
      id: nextId("room"),
      name: input.name,
      deck: input.deck,
      status: "voting",
      participants: [
        {
          id: nextId("me"),
          name: input.moderatorName,
          role: "moderator",
          hasVoted: false,
        },
        ...BOT_NAMES.map((name) => ({
          id: nextId("p"),
          name,
          role: "voter" as const,
          hasVoted: false,
        })),
      ],
      votes: [],
    };
    rooms.set(room.id, room);
    emit(room.id, { type: "room_state", room });
    scheduleBotVotes(room.id, pickBotValues(room.deck));
    return room;
  },

  async getRoom(roomId: string): Promise<Room> {
    const room = rooms.get(roomId);
    if (!room) throw new Error("Sala não encontrada.");
    return room;
  },

  async joinRoom(roomId: string, input: JoinRoomInput): Promise<Participant> {
    const room = rooms.get(roomId);
    if (!room) throw new Error("Sala não encontrada.");
    const participant: Participant = {
      id: nextId("me"),
      name: input.name,
      role: "voter",
      hasVoted: false,
    };
    room.participants.push(participant);
    emit(roomId, { type: "participant_joined", participant });
    emit(roomId, { type: "room_state", room });
    return participant;
  },

  async vote(roomId: string, participantId: string, value: DeckValue): Promise<void> {
    const room = rooms.get(roomId);
    if (!room || room.status !== "voting") return;
    const participant = room.participants.find((item) => item.id === participantId);
    if (!participant) return;
    participant.hasVoted = true;
    room.votes = room.votes.filter((vote) => vote.participantId !== participantId);
    room.votes.push({ participantId, value });
    emit(roomId, { type: "vote_cast", participantId, value });
  },

  async reveal(roomId: string): Promise<Vote[]> {
    const room = rooms.get(roomId);
    if (!room) throw new Error("Sala não encontrada.");
    room.status = "revealed";
    emit(roomId, { type: "votes_revealed", votes: room.votes });

    setTimeout(() => {
      const suggestion = buildAiSuggestion(room.votes);
      emit(roomId, { type: "ai_suggestion", suggestion });
    }, 800);

    return room.votes;
  },

  subscribe(roomId: string, onMessage: (message: ServerMessage) => void): () => void {
    const room = rooms.get(roomId);
    const set = listeners.get(roomId) ?? new Set<Listener>();
    set.add(onMessage);
    listeners.set(roomId, set);

    if (room) {
      onMessage({ type: "room_state", room });
    }

    return () => {
      set.delete(onMessage);
    };
  },
};
