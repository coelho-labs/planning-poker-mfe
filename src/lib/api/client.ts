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

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    throw new Error(`Requisição falhou (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const realRoomService: RoomService = {
  async createRoom(input: CreateRoomInput): Promise<Room> {
    return request<Room>("/rooms", { method: "POST", body: JSON.stringify(input) });
  },

  async getRoom(roomId: string): Promise<Room> {
    return request<Room>(`/rooms/${roomId}`);
  },

  async joinRoom(roomId: string, input: JoinRoomInput): Promise<Participant> {
    return request<Participant>(`/rooms/${roomId}/participants`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async vote(roomId: string, participantId: string, value: DeckValue): Promise<void> {
    await request(`/rooms/${roomId}/vote`, {
      method: "POST",
      body: JSON.stringify({ participant_id: participantId, value }),
    });
  },

  async reveal(roomId: string): Promise<Vote[]> {
    return request<Vote[]>(`/rooms/${roomId}/reveal`, { method: "POST" });
  },

  subscribe(roomId: string, onMessage: (message: ServerMessage) => void): () => void {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${protocol}://${new URL(API_BASE).host}/rooms/${roomId}/ws`;
    const socket = new WebSocket(url);

    socket.addEventListener("message", (event) => {
      try {
        const parsed = JSON.parse(String(event.data)) as ServerMessage;
        onMessage(parsed);
      } catch {
        // ignora frames não-JSON do backend
      }
    });

    return () => socket.close();
  },
};

export async function fetchAiSuggestion(roomId: string): Promise<AiSuggestion> {
  return request<AiSuggestion>(`/rooms/${roomId}/ai-suggestion`);
}
