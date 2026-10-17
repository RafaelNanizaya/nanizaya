/*
 * Configuração do site — ajuste aqui ao usar para um comerciante real.
 *
 * whatsapp.numero: número no formato internacional, só dígitos (ex.: "5511999999999").
 *   Enquanto estiver null, o site funciona em MODO DEMONSTRATIVO: os botões montam a
 *   mensagem, mas apenas exibem uma prévia, sem abrir nenhuma conversa.
 */
window.NAVALHA_CONFIG = {
  whatsapp: {
    numero: null,
    exibicao: "(00) 00000-0000 — número demonstrativo",
    mensagemPadrao: "Olá! Vim pelo site da Barbearia Navalha e gostaria de agendar um horário."
  },
  fusoHorario: "America/Sao_Paulo",
  // Horário de funcionamento por dia da semana (0 = domingo). null = fechado.
  funcionamento: {
    0: null,
    1: ["09:00", "20:00"],
    2: ["09:00", "20:00"],
    3: ["09:00", "20:00"],
    4: ["09:00", "20:00"],
    5: ["09:00", "20:00"],
    6: ["08:00", "17:00"]
  },
  // Intervalo entre horários oferecidos no formulário, em minutos.
  intervaloAgenda: 30
};
