export interface EpistemicConcept {
  id: string;
  keywords: string[];
  title: string;
  category: "linguagem" | "jogos" | "juridico" | "ciencia" | "filosofia" | "produtividade" | "tecnologia";
  explanation: string;
}

export const EPISTEMIC_KNOWLEDGE_BASE: EpistemicConcept[] = [
  {
    id: "jogos",
    keywords: ["jogo", "jogos", "game", "games", "gamificacao", "gamificação", "ludologia", "teoria dos jogos"],
    title: "Jogos, Ludologia & Teoria dos Jogos",
    category: "jogos",
    explanation: `Sim, com certeza! Um **jogo** é um sistema formal estruturado onde participantes interagem dentro de um conjunto de **regras**, **objetivos claros**, **desafios** e **feedback contínuo**, criando uma experiência de agência e engajamento.

📌 **Pilares Fundamentais de um Jogo:**
1. **Regras e Limites (O "Círculo Mágico"):** Conforme o historiador Johan Huizinga (*Homo Ludens*), o jogo cria um espaço temporário com regras próprias aceitas voluntariamente.
2. **Meta e Desafio:** Uma condição de vitória ou progresso que exige superação e estratégia.
3. **Feedback Imediato:** Pontuação, níveis, recompensas ou consequências que informam o jogador sobre seu desempenho.

🧠 **Dimensões Avançadas:**
• **Teoria dos Jogos (Matemática & Economia):** Criada por John von Neumann e John Nash, estuda a tomada de decisão estratégica entre agentes racionais onde o resultado de um depende das escolhas dos outros (como no Dilema do Prisioneiro).
• **Gamificação no VARYNTH OS:** Aplicamos mecânicas de jogo (como níveis, XP por projetos entregues, streaks de consistência no Chronos e desbloqueio de badges) para transformar a sua rotina de pesquisa e trabalho em um sistema estimulante e recompensador.

Você estava pensando em algum tipo específico de jogo (videogame, xadrez, RPG ou a própria teoria dos jogos aplicada à tomada de decisões)?`,
  },
  {
    id: "latim",
    keywords: ["latim", "lingua latina", "idioma latim", "latina", "romano"],
    title: "Latim (Língua Latina)",
    category: "linguagem",
    explanation: `O **Latim** é uma língua indo-europeia originária do Lácio (região da Roma Antiga) que se tornou a língua oficial do Império Romano e, posteriormente, a língua franca da cultura, da ciência, da filosofia e do Direito no Ocidente por mais de mil anos.

📌 **Principais Aspectos:**
1. **Língua Mater das Línguas Neolatinas:** Deu origem ao português, espanhol, francês, italiano e romeno.
2. **Fundamento do Direito Ocidental:** É a base dos brocardos e da terminologia jurídica tradicional (como *pacta sunt servanda*, *habeas corpus*, *in dubio pro reo*, *fumus boni iuris* e *periculum in mora*).
3. **Língua da Ciência & Filosofia:** Por séculos, obras capitais de Descartes, Newton, Spinoza e Tomás de Aquino foram publicadas em latim para garantir circulação universal.

No **VARYNTH OS**, o latim aparece frequentemente no módulo **Codex (Argument Arena)** e nas jurisprudências do **Vault**. Quer explorar algum termo ou brocardo jurídico específico?`,
  },
  {
    id: "hermeneutica",
    keywords: ["hermeneutica", "hermenêutica", "interpretacao juridica", "interpretacao"],
    title: "Hermenêutica Jurídica & Filosófica",
    category: "juridico",
    explanation: `A **Hermenêutica** é a ciência e a arte da interpretação de textos, normas e sentidos. No campo do Direito, estuda os métodos para extrair o verdadeiro alcance e finalidade das normas jurídicas.

📌 **Métodos Clássicos de Hermenêutica (Savigny):**
• **Gramatical / Literal:** Análise do significado linguístico das palavras da lei.
• **Sistemático:** Interpretação da norma em conjunto com o ordenamento jurídico e a Constituição.
• **Histórico:** Investigação da intenção do legislador (*mens legislatoris*) e do contexto histórico.
• **Teleológico / Finalístico:** Análise da finalidade social e do bem jurídico protegido pela norma.

No Codex, aplicamos a hermenêutica teleológica e sistemática para confrontar teses dialéticas.`,
  },
  {
    id: "metodo_cientifico",
    keywords: ["metodo cientifico", "metodologia cientifica", "metodologia", "evidencias", "pesquisa cientifica"],
    title: "Método Científico & Epistemologia",
    category: "ciencia",
    explanation: `O **Método Científico** é o conjunto de procedimentos sistemáticos e racionais utilizados para produzir conhecimento confiável, verificável e falseável sobre a realidade.

📌 **Etapas Fundamentais:**
1. **Observação & Problematização:** Identificação de uma lacuna no conhecimento.
2. **Hipótese:** Proposição de uma explicação provisória testável.
3. **Experimentação & Coleta de Evidências:** Levantamento empírico e rigor metodológico.
4. **Análise de Dados & Falseabilidade:** Confronto crítico das evidências (princípio de Karl Popper).
5. **Conclusão & Reprodutibilidade:** Validação por pares e síntese.

No **Evidence Board** do VARYNTH, catalogamos dados primários classificando sua robustez em Forte, Média ou Preliminar.`,
  },
  {
    id: "controle_constitucionalidade",
    keywords: ["controle de constitucionalidade", "stf", "inconstitucional", "adin", "adc", "arguição de descumprimento", "constituicao"],
    title: "Controle de Constitucionalidade",
    category: "juridico",
    explanation: `O **Controle de Constitucionalidade** é o mecanismo que assegura a supremacia da Constituição, verificando se leis e atos normativos estão em conformidade com as normas e princípios constitucionais.

📌 **Espécies no Brasil:**
• **Difuso (Incidental):** Realizado por qualquer juiz ou tribunal em um caso concreto (*inter partes*).
• **Concentrado (Abstrato):** Julgado exclusivamente pelo STF através de ações de controle direto (ADI, ADC, ADO e ADPF) com eficácia *erga omnes* e efeito vinculante.`,
  },
  {
    id: "epistemologia",
    keywords: ["epistemologia", "teoria do conhecimento", "gnosiologia", "filosofia da ciencia"],
    title: "Epistemologia (Teoria do Conhecimento)",
    category: "filosofia",
    explanation: `A **Epistemologia** é o ramo da filosofia que investiga a natureza, a origem, os limites e a validade do conhecimento humano ("o que é a verdade?", "como sabemos o que sabemos?").

No VARYNTH OS, a epistemologia fundamenta o **Graph de Conexões** e a matriz dialética do **Codex**.`,
  },
  {
    id: "inteligencia_artificial",
    keywords: ["inteligencia artificial", "ia", "como funciona ia", "o que e ia", "machine learning", "redes neurais", "llm", "deep learning"],
    title: "Inteligência Artificial & Modelos de Linguagem",
    category: "tecnologia",
    explanation: `A **Inteligência Artificial (IA)** compreende sistemas computacionais capazes de realizar tarefas que tradicionalmente exigiriam cognição humana, como reconhecimento de padrões, tradução, raciocínio lógico e síntese textual.

📌 **Arquitetura da Athena no VARYNTH OS:**
• **Local-First & Soberana:** Funciona localmente sem exigir APIs comerciais em nuvem.
• **Dual Kernel:** Combina lógica determinística (0 ms) com modelos neurais abertos locais (Ollama / Llama.cpp) e Conselho de Agentes Especialistas (Justitia, Logos, Critias).`,
  },
  {
    id: "produtividade",
    keywords: ["produtividade", "gestao de tempo", "foco", "pomodoro", "eisenhower", "organizacao"],
    title: "Produtividade & Gestão Cognitiva",
    category: "produtividade",
    explanation: `A **Produtividade** no VARYNTH OS não é sobre fazer mais coisas em menos tempo de forma caótica, mas sobre **alocação deliberada de energia e atenção** nos projetos de maior impacto.

📌 **Técnicas Integradas:**
• **Blocos de Foco & Deep Work (Cal Newport):** Períodos ininterruptos para tarefas analíticas complexas.
• **Matriz de Eisenhower:** Separação estrita entre o que é Urgente e o que é Importante.
• **Time-blocking no Chronos:** Agendamento de janelas protegidas para entregas estratégicas.`,
  },
];
