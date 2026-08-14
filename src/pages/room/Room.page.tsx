import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Eye,
  Loader2,
  Sparkles,
  Users,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  fetchAiSuggestion,
  roomService,
  type AiSuggestion,
  type DeckValue,
  type Participant,
  type Room,
  type ServerMessage,
  type Vote,
} from "@/lib/api";
import { loadSelf, saveSelf } from "@/lib/api/identity";

function formatValue(value: DeckValue): string {
  return typeof value === "number" ? String(value) : value;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

type NumericVote = Vote & { value: number };

function AiSuggestionCard({
  suggestion,
  loading,
}: {
  suggestion: AiSuggestion | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            <Sparkles className="size-4" aria-hidden="true" />
            Sugestão da IA
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Analisando os votos...
        </CardContent>
      </Card>
    );
  }

  if (!suggestion) return null;

  const confidence = Math.round(Math.min(1, Math.max(0, suggestion.confidence_score)) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <Sparkles className="size-4" aria-hidden="true" />
          Sugestão da IA
        </CardTitle>
        <CardDescription>Estimativa sugerida pelo backend</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums">
            {suggestion.suggested_story_points}
          </span>
          <span className="text-sm text-muted-foreground">story points</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Confiança</span>
          <span className="text-muted-foreground tabular-nums">{confidence}%</span>
        </div>
        <Progress
          value={confidence}
          aria-valuetext={`${confidence}% de confiança`}
        />
        <p className="text-sm text-muted-foreground">{suggestion.justification}</p>
      </CardContent>
    </Card>
  );
}

export default function RoomPage() {
  const { roomId = "" } = useParams();
  const [room, setRoom] = useState<Room | null>(null);
  const [self, setSelf] = useState(() => loadSelf(roomId));
  const [myVote, setMyVote] = useState<DeckValue | null>(null);
  const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const aiTimerRef = useRef<number | null>(null);
  const copiedTimerRef = useRef<number | null>(null);

  const cancelAiTimer = useCallback(() => {
    if (aiTimerRef.current !== null) {
      window.clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }
  }, []);

  const requestAiSuggestion = useCallback(
    (targetRoomId: string) => {
      cancelAiTimer();
      setAiLoading(true);
      aiTimerRef.current = window.setTimeout(() => {
        fetchAiSuggestion(targetRoomId)
          .then((suggestion) => setSuggestion(suggestion))
          .catch(() => {
            // sem sugestão disponível: esconde o card de loading
          })
          .finally(() => setAiLoading(false));
      }, 1200);
    },
    [cancelAiTimer]
  );

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    function handleMessage(message: ServerMessage) {
      switch (message.type) {
        case "room_state":
          setRoom(message.room);
          break;
        case "participant_joined":
          setRoom((current) =>
            current
              ? { ...current, participants: [...current.participants, message.participant] }
              : current
          );
          break;
        case "vote_cast":
          setRoom((current) =>
            current
              ? {
                  ...current,
                  participants: current.participants.map((participant) =>
                    participant.id === message.participantId
                      ? { ...participant, hasVoted: true }
                      : participant
                  ),
                }
              : current
          );
          break;
        case "votes_revealed":
          setRoom((current) =>
            current ? { ...current, status: "revealed", votes: message.votes } : current
          );
          requestAiSuggestion(roomId);
          break;
        case "ai_suggestion":
          cancelAiTimer();
          setSuggestion(message.suggestion);
          setAiLoading(false);
          break;
      }
    }

    async function init() {
      try {
        let identity = loadSelf(roomId);
        if (!identity) {
          const participant = await roomService.joinRoom(roomId, {
            name: localStorage.getItem("pp-name") ?? "Visitante",
          });
          identity = {
            roomId,
            participantId: participant.id,
            name: participant.name,
            role: participant.role,
          };
          saveSelf(identity);
        }
        if (cancelled) return;
        setSelf(identity);

        const initialRoom = await roomService.getRoom(roomId);
        if (cancelled) return;
        setRoom(initialRoom);
        unsubscribe = roomService.subscribe(roomId, handleMessage);
      } catch {
        if (!cancelled) {
          setError("Sala não encontrada ou indisponível no momento.");
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      unsubscribe?.();
      cancelAiTimer();
      if (copiedTimerRef.current !== null) {
        window.clearTimeout(copiedTimerRef.current);
      }
    };
  }, [roomId, cancelAiTimer, requestAiSuggestion]);

  async function castVote(value: DeckValue) {
    if (!room || !self || room.status !== "voting") return;
    setMyVote(value);
    try {
      await roomService.vote(room.id, self.participantId, value);
    } catch {
      // mantém o voto otimista; o backend rejeitará se necessário
    }
  }

  async function revealVotes() {
    if (!room) return;
    setRevealing(true);
    try {
      const votes = await roomService.reveal(room.id);
      setRoom((current) =>
        current ? { ...current, status: "revealed", votes } : current
      );
      requestAiSuggestion(room.id);
    } finally {
      setRevealing(false);
    }
  }

  async function copyCode() {
    if (!room) return;
    await navigator.clipboard?.writeText(room.id);
    setCopied(true);
    copiedTimerRef.current = window.setTimeout(() => setCopied(false), 1500);
  }

  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button render={<Link to="../new" relative="path" />}>Criar nova sala</Button>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex flex-1 items-center justify-center p-6" aria-busy="true">
        <Loader2 className="size-6 animate-spin text-foreground" aria-hidden="true" />
      </div>
    );
  }

  const numericVotes = room.votes.filter(
    (vote): vote is NumericVote => typeof vote.value === "number"
  );
  const numericValues = numericVotes.map((vote) => vote.value);
  const minVote = numericValues.length ? Math.min(...numericValues) : null;
  const maxVote = numericValues.length ? Math.max(...numericValues) : null;
  const consensus =
    numericValues.length > 0 && minVote !== null && minVote === maxVote;

  const counts = new Map<string, number>();
  room.votes.forEach((vote) => {
    const key = formatValue(vote.value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  const voteByParticipant = new Map<string, DeckValue>();
  room.votes.forEach((vote) => voteByParticipant.set(vote.participantId, vote.value));

  const votesGiven = room.participants.filter((participant) => participant.hasVoted).length;
  const isModerator = self?.role === "moderator";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <Link
        to=".."
        relative="path"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Sair da sala
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{room.name}</h1>
            <Badge variant={room.status === "revealed" ? "default" : "secondary"}>
              {room.status === "revealed" ? "Revelado" : "Votando"}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {room.id}
            </code>
            <Button variant="ghost" size="icon-sm" onClick={copyCode} aria-label="Copiar código da sala">
              {copied ? <Check /> : <Copy />}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {room.participants.slice(0, 4).map((participant) => (
              <Avatar key={participant.id} size="sm" className="ring-2 ring-background">
                <AvatarFallback>{initials(participant.name)}</AvatarFallback>
              </Avatar>
            ))}
          </div>
          <span className="text-sm text-muted-foreground">
            {room.participants.length} participante{room.participants.length === 1 ? "" : "s"}
          </span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-1.5">
                  <Eye className="size-4" aria-hidden="true" />
                  Estimativa
                </CardTitle>
                <CardDescription>
                  {room.status === "voting"
                    ? "Escolha a carta que reflete o esforço. Os votos ficam ocultos."
                    : "Votos revelados. Valores extremos destacados para debate."}
                </CardDescription>
              </div>
              <Badge variant="secondary">
                {votesGiven}/{room.participants.length} votaram
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {room.deck.map((value) => {
                  const formatted = formatValue(value);
                  const count = counts.get(formatted) ?? 0;
                  const selected = myVote === value;
                  const isMin = value !== "?" && minVote !== null && value === minVote;
                  const isMax = value !== "?" && maxVote !== null && value === maxVote;
                  return (
                    <button
                      key={formatted}
                      type="button"
                      onClick={() => castVote(value)}
                      disabled={room.status === "revealed"}
                      aria-pressed={selected}
                      className={cn(
                        "flex h-16 flex-col items-center justify-center gap-1 rounded-lg border bg-card text-lg font-semibold transition-colors",
                        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                        room.status === "voting" &&
                          "hover:border-ring hover:bg-accent",
                        selected &&
                          "border-primary bg-primary text-primary-foreground hover:bg-primary hover:border-primary",
                        room.status === "revealed" &&
                          "cursor-default",
                        isMin &&
                          room.status === "revealed" &&
                          "border-destructive bg-destructive/10 text-destructive",
                        isMax &&
                          room.status === "revealed" &&
                          "border-foreground bg-foreground/5"
                      )}
                    >
                      {formatted}
                      {room.status === "revealed" && count > 0 ? (
                        <span className="text-xs font-normal opacity-70">
                          {count} voto{count === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {room.status === "voting" ? (
                <div className="flex flex-col gap-1" aria-live="polite">
                  <p className="text-sm text-muted-foreground">
                    {myVote ? (
                      <>
                        Você votou <strong className="font-medium text-foreground">{formatValue(myVote)}</strong>.
                        Aguardando os demais participantes...
                      </>
                    ) : (
                      "Selecione uma carta para votar."
                    )}
                  </p>
                  {isModerator ? (
                    <Button
                      className="mt-2 w-fit"
                      onClick={revealVotes}
                      disabled={revealing || votesGiven === 0}
                    >
                      {revealing ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      ) : (
                        "Revelar cartas"
                      )}
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Aguarde o moderador revelar as cartas.
                    </p>
                  )}
                </div>
              ) : (
                <div aria-live="polite">
                  {consensus ? (
                    <Badge className="w-fit" variant="secondary">
                      Consenso alcançado: {minVote} pontos
                    </Badge>
                  ) : minVote !== null && maxVote !== null ? (
                    <p className="text-sm text-muted-foreground">
                      Divergência de{" "}
                      <strong className="font-medium text-foreground">
                        {minVote} vs {maxVote}
                      </strong>{" "}
                      pontos — vale debater os extremos.
                    </p>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>

          <AiSuggestionCard suggestion={suggestion} loading={aiLoading} />
        </div>

        <aside className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <Users className="size-4" aria-hidden="true" />
                Participantes
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {room.participants.map((participant) => (
                <ParticipantRow
                  key={participant.id}
                  participant={participant}
                  vote={
                    room.status === "revealed"
                      ? voteByParticipant.get(participant.id) ?? null
                      : null
                  }
                  isSelf={self?.participantId === participant.id}
                  isMin={
                    voteByParticipant.get(participant.id) !== undefined &&
                    minVote !== null &&
                    voteByParticipant.get(participant.id) === minVote
                  }
                  isMax={
                    voteByParticipant.get(participant.id) !== undefined &&
                    maxVote !== null &&
                    voteByParticipant.get(participant.id) === maxVote
                  }
                />
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function ParticipantRow({
  participant,
  vote,
  isSelf,
  isMin,
  isMax,
}: {
  participant: Participant;
  vote: DeckValue | null;
  isSelf: boolean;
  isMin: boolean;
  isMax: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar size="sm">
        <AvatarFallback>{initials(participant.name)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <span className="truncate">{participant.name}</span>
          {isSelf ? <span className="text-muted-foreground">(você)</span> : null}
          {participant.role === "moderator" ? (
            <Badge variant="outline" className="h-4 px-1 text-[10px]">
              Moderador
            </Badge>
          ) : null}
        </span>
        <span className="text-xs text-muted-foreground">
          {vote !== null
            ? `Votou ${formatValue(vote)}`
            : participant.hasVoted
              ? "Votou em segredo"
              : "Aguardando voto"}
        </span>
      </div>
      {vote !== null ? (
        <Badge
          variant={isMin || isMax ? "destructive" : "secondary"}
          className="tabular-nums"
        >
          {formatValue(vote)}
        </Badge>
      ) : (
        <span className="size-2 rounded-full bg-muted-foreground/30" aria-hidden="true" />
      )}
    </div>
  );
}
