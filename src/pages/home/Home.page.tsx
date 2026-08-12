import styles from "./Home.page.module.css";

type Feature = {
  title: string;
  description: string;
  icon: "hidden" | "consensus" | "ai";
};

const FEATURES: Feature[] = [
  {
    icon: "hidden",
    title: "Votação Oculta",
    description:
      "Cada participante vota em privado e os votos permanecem ocultos até o moderador revelar as cartas.",
  },
  {
    icon: "consensus",
    title: "Consenso Guiado",
    description:
      "Divergências extremas são destacadas, apontando os valores discrepantes (maior e menor) para o debate do time.",
  },
  {
    icon: "ai",
    title: "Sugestão de IA",
    description:
      "O backend estima story points com score de confiança e justificativa para apoiar a decisão da equipe.",
  },
];

function FeatureIcon({ icon }: { icon: Feature["icon"] }) {
  if (icon === "hidden") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1.5 1.5 0 0 1 0 .698 10.747 10.747 0 0 1-1.444 2.49" />
        <path d="M14.71 14.71a2.25 2.25 0 0 1-3.42-3.42" />
        <path d="M3.196 3.196l17.608 17.608" />
        <path d="M4.636 8.318a10.668 10.668 0 0 0-2.843 4.331 1.5 1.5 0 0 0 0 .702 10.75 10.75 0 0 0 10.715 7.534" />
      </svg>
    );
  }

  if (icon === "consensus") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
    </svg>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <li className={styles.card}>
      <span className={styles.cardIcon}>
        <FeatureIcon icon={feature.icon} />
      </span>
      <h3 className={styles.cardTitle}>{feature.title}</h3>
      <p className={styles.cardText}>{feature.description}</p>
    </li>
  );
}

export default function Home() {
  return (
    <main className={styles.landing}>
      <header className={styles.hero}>
        <p className={styles.badge}>Micro Frontend · Module Federation</p>
        <h1 className={styles.title}>Planning Poker</h1>
        <p className={styles.subtitle}>
          Estimativas ágeis em equipe com votação oculta, consenso guiado e
          sugestão de IA — servido como módulo remoto do portal-shell.
        </p>
        <button type="button" className={styles.cta} disabled>
          Criar Sala
        </button>
        <p className={styles.ctaNote}>
          Disponível quando o módulo estiver conectado ao backend e ao
          portal-shell.
        </p>
      </header>

      <section className={styles.features} aria-labelledby="features-heading">
        <h2 id="features-heading" className={styles.featuresHeading}>
          Como funciona
        </h2>
        <ul className={styles.grid}>
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </ul>
      </section>

      <footer className={styles.footer}>Módulo remoto de negócio · Coelho Labs</footer>
    </main>
  );
}
