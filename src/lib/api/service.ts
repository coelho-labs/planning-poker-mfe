import { realRoomService } from "./client";
import { mockRoomService } from "./mock";
import type { RoomService } from "./types";

const useMocks = (import.meta.env.VITE_USE_MOCKS ?? "1") === "1";

export const roomService: RoomService = useMocks ? mockRoomService : realRoomService;
