import type { LucideIcon } from "lucide-react";
import { EyeOff, Sparkles, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const FEATURES: Feature[] = [
  {
    icon: EyeOff,
    title: "Votação Oculta",
    description:
      "Cada participante vota em privado e os votos permanecem ocultos até o moderador revelar as cartas.",
  },
  {
    icon: Users,
    title: "Consenso Guiado",
    description:
      "Divergências extremas são destacadas, apontando os valores discrepantes (maior e menor) para o debate do time.",
  },
  {
    icon: Sparkles,
    title: "Sugestão de IA",
    description:
      "O backend estima story points com score de confiança e justificativa para apoiar a decisão da equipe.",
  },
];

function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <Card className="h-full">
      <CardContent className="flex flex-col items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
          <feature.icon className="size-5" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <CardTitle>{feature.title}</CardTitle>
          <CardDescription>{feature.description}</CardDescription>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-4 px-4 pt-20 pb-12 text-center">
        <Badge variant="outline" className="uppercase tracking-wide">
          Micro Frontend · Module Federation
        </Badge>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Planning Poker
        </h1>
        <p className="max-w-xl text-pretty text-muted-foreground">
          Estimativas ágeis em equipe com votação oculta, consenso guiado e
          sugestão de IA — servido como módulo remoto do portal-shell.
        </p>
        <Button size="lg" className="mt-2" render={<Link to="rooms/new" relative="path" />}>
          Criar Sala
        </Button>
      </section>

      <section
        className="mx-auto w-full max-w-5xl px-4 pb-16"
        aria-labelledby="features-heading"
      >
        <h2
          id="features-heading"
          className="mb-6 text-center text-xl font-semibold"
        >
          Como funciona
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="h-full">
              <FeatureCard feature={feature} />
            </li>
          ))}
        </ul>
      </section>

      <footer className="border-t border-border py-4 text-center text-sm text-muted-foreground">
        Módulo remoto de negócio · Coelho Labs
      </footer>
    </div>
  );
}
