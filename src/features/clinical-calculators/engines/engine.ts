import { z } from "zod";
import { buildEngine } from "@/features/clinical-calculators/engines/helpers";
import { formatInteger } from "@/features/clinical-calculators/utils";

const yesNoSchema = z.string().refine((value) => value === "yes" || value === "no", {
  message: "Selecione uma opção.",
});

const oxygenScaleSchema = z.string().refine((value) => value === "1" || value === "2", {
  message: "Selecione a escala de oxigenação.",
});

const consciousnessSchema = z.string().refine(
  (value) => ["alert", "new-confusion", "voice", "pain", "unresponsive"].includes(value),
  {
    message: "Selecione o nível de consciência.",
  },
);

const schema = z.object({
  respiratoryRate: z.coerce.number().int().min(0, "Informe FR entre 0 e 80 irpm.").max(80, "Informe FR entre 0 e 80 irpm."),
  oxygenScale: oxygenScaleSchema,
  oxygenSaturation: z.coerce.number().int().min(30, "Informe SatO2 entre 30% e 100%.").max(100, "Informe SatO2 entre 30% e 100%."),
  supplementalOxygen: yesNoSchema,
  systolicBloodPressure: z.coerce.number().int().min(30, "Informe PAS entre 30 e 300 mmHg.").max(300, "Informe PAS entre 30 e 300 mmHg."),
  heartRate: z.coerce.number().int().min(20, "Informe FC entre 20 e 250 bpm.").max(250, "Informe FC entre 20 e 250 bpm."),
  temperature: z.coerce.number().min(25, "Informe temperatura entre 25 e 45 °C.").max(45, "Informe temperatura entre 25 e 45 °C."),
  consciousness: consciousnessSchema,
});

function scoreRespiratoryRate(value: number) {
  if (value <= 8) return 3;
  if (value <= 11) return 1;
  if (value <= 20) return 0;
  if (value <= 24) return 2;
  return 3;
}

function scoreOxygenSaturationScale1(value: number) {
  if (value <= 91) return 3;
  if (value <= 93) return 2;
  if (value <= 95) return 1;
  return 0;
}

function scoreOxygenSaturationScale2(value: number) {
  if (value <= 83) return 3;
  if (value <= 85) return 2;
  if (value <= 87) return 1;
  if (value <= 92) return 0;
  if (value <= 94) return 1;
  if (value <= 96) return 2;
  return 3;
}

function scoreSystolicBloodPressure(value: number) {
  if (value <= 90) return 3;
  if (value <= 100) return 2;
  if (value <= 110) return 1;
  if (value <= 219) return 0;
  return 3;
}

function scoreHeartRate(value: number) {
  if (value <= 40) return 3;
  if (value <= 50) return 1;
  if (value <= 90) return 0;
  if (value <= 110) return 1;
  if (value <= 130) return 2;
  return 3;
}

function scoreTemperature(value: number) {
  if (value <= 35) return 3;
  if (value <= 36) return 1;
  if (value <= 38) return 0;
  if (value <= 39) return 1;
  return 2;
}

function scoreConsciousness(value: string) {
  return value === "alert" ? 0 : 3;
}

export const news2Engine = buildEngine(schema, (values) => {
  const oxygenPoints =
    values.oxygenScale === "2"
      ? scoreOxygenSaturationScale2(values.oxygenSaturation)
      : scoreOxygenSaturationScale1(values.oxygenSaturation);

  const components = [
    { label: "Frequência respiratória", points: scoreRespiratoryRate(values.respiratoryRate) },
    { label: `SatO2 escala ${values.oxygenScale}`, points: oxygenPoints },
    { label: "Oxigênio suplementar", points: values.supplementalOxygen === "yes" ? 2 : 0 },
    { label: "Pressão sistólica", points: scoreSystolicBloodPressure(values.systolicBloodPressure) },
    { label: "Frequência cardíaca", points: scoreHeartRate(values.heartRate) },
    { label: "Temperatura", points: scoreTemperature(values.temperature) },
    { label: "Nível de consciência", points: scoreConsciousness(values.consciousness) },
  ];

  const total = components.reduce((acc, item) => acc + item.points, 0);
  let tone: "success" | "warning" | "danger" = "success";
  let status = "Baixo risco";
  if (total >= 5 && total <= 6) {
    tone = "warning";
    status = "Risco médio";
  } else if (total >= 7) {
    tone = "danger";
    status = "Alto risco";
  }

  return {
    headline: {
      label: "NEWS2",
      value: formatInteger(total),
      status,
      tone,
      description: "O NEWS2 soma pontuações de sete domínios fisiológicos para detectar deterioração clínica.",
    },
    interpretation: {
      title: "Interpretação clínica",
      tone,
      description:
        total <= 4
          ? "Pontuação total entre 0 e 4, compatível com menor risco relativo."
          : total <= 6
            ? "Pontuação entre 5 e 6, compatível com risco médio e necessidade de vigilância mais estreita."
            : "Pontuação de 7 ou mais, compatível com alto risco e necessidade de resposta rápida.",
      bullets: [
        "A tabela oficial NEWS2 foi respeitada sem simplificar as faixas.",
        "Considere também se algum parâmetro isolado atingiu pontuação 3 e correlacione com contexto clínico.",
      ],
    },
    calculation: {
      title: "Como foi calculado",
      rows: components.map((item) => ({
        label: item.label,
        value: `${item.points} ponto(s)`,
      })),
      bullets: [`Pontuação total do NEWS2 = ${total}.`],
    },
    extraPanels: [
      {
        title: "Leitura prática",
        tone,
        bullets: [
          total <= 4
            ? "Mantenha monitorização conforme contexto clínico e tendência dos sinais vitais."
            : total <= 6
              ? "Escalone vigilância, reavalie a causa da deterioração e ajuste frequência de monitorização."
              : "Ative resposta clínica rápida, reavalie via aérea, ventilação, circulação e causas reversíveis.",
        ],
      },
    ],
  };
});

export const calculatorEngine = news2Engine;
