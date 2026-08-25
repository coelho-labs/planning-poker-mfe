import { useState, type FormEvent } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { roomService, type DeckValue } from "@/lib/api";
import { saveSelf } from "@/lib/api/identity";

type DeckPreset = {
  key: string;
  label: string;
  values: DeckValue[];
};

const DECK_PRESETS: DeckPreset[] = [
  { key: "fibonacci", label: "Fibonacci · 1 a 13", values: [1, 2, 3, 5, 8, 13] },
  {
    key: "fibonacci-full",
    label: "Fibonacci completo · 0 a 89",
    values: [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89],
  },
  { key: "short", label: "Escala curta · 1 a 8", values: [1, 2, 3, 5, 8] },
  { key: "linear", label: "Linear · 0 a 10", values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
];

type Status = "idle" | "creating";

export default function CreateRoom() {
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState("");
  const [moderatorName, setModeratorName] = useState("");
  const [deckKey, setDeckKey] = useState(DECK_PRESETS[0].key);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const deck = DECK_PRESETS.find((preset) => preset.key === deckKey) ?? DECK_PRESETS[0];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "creating") return;
    const name = roomName.trim();
    const moderatorNameValue = moderatorName.trim();
    if (!name || !moderatorNameValue) {
      setError("Preencha o nome da sala e o seu nome para começar.");
      return;
    }
    setStatus("creating");
    window.dispatchEvent(
      new CustomEvent('cd-vignette:show', { detail: { message: "Criando sua sala..." } })
    );

    setError(null);
    try {
      const [, room] = await Promise.all([
        new Promise((resolve) => setTimeout(resolve, 5000)),
        roomService.createRoom({
          name,
          moderatorName: moderatorNameValue,
          deck: deck.values,
        }),
      ]);
      const moderator = room.participants[0];
      saveSelf({
        roomId: room.id,
        participantId: moderator?.id ?? "",
        name: moderatorNameValue,
        role: "moderator",
      });
      window.dispatchEvent(new CustomEvent('cd-vignette:hide'));
      navigate(`../${room.id}`, { replace: true, relative: "path" });
    } catch {
      setStatus("idle");
      setError("Não foi possível criar a sala. Verifique o backend e tente novamente.");
    }
  }

  if (status === "creating") {
    return (
      <div className="flex flex-1 items-center justify-center p-6" aria-busy="true">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-6 animate-spin text-foreground" aria-hidden="true" />
          <p className="text-sm">Criando sua sala...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full min-w-3xl max-w-md px-4 py-10">
      <Link
        to=".."
        relative="path"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Voltar
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Criar sala</CardTitle>
          <CardDescription>
            Monte uma sala de votação e convide o time para estimar.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="room-name">Nome da sala</Label>
              <Input
                id="room-name"
                required
                value={roomName}
                onChange={(event) => setRoomName(event.target.value)}
                placeholder="Ex.: Sprint 24 — Backlog"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="moderator-name">Seu nome (moderador)</Label>
              <Input
                id="moderator-name"
                required
                value={moderatorName}
                onChange={(event) => setModeratorName(event.target.value)}
                placeholder="Ex.: Joãozinho"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deck">Escala de estimativa</Label>
              <Select value={deckKey} onValueChange={(value) => value !== null && setDeckKey(value)}>
                <SelectTrigger id="deck" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DECK_PRESETS.map((preset) => (
                    <SelectItem key={preset.key} value={preset.key}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </CardContent>

          <CardFooter>
            <Button type="submit" size="lg" className="w-full">
              Criar sala
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
