// Every user-facing text, in Brazilian Portuguese, in the app's voice (docs/GLOSSARIO.md has the
// terms). The UI imports from here; it never writes its own text.
import type { TimeLeft } from './award/brasilia';
import type { Phase } from './award/phases';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const strings = {
  appName: 'Paçoca AUwards',
  genericError: 'Algo deu errado. Tenta de novo?',
  retry: 'Tentar de novo',
  forbidden: 'Você não tem permissão para isso.',
  offline: 'Sem conexão. Mostrando o último estado carregado.',

  signIn: {
    tagline: 'O que eu assisti no ano, minhas indicações e a premiação do grupo.',
    button: 'Entrar com Google',
    noInvite: 'Não há convite para esse e-mail. Peça a um admin para te convidar.',
    failed: 'O login não deu certo. Tenta de novo?',
    devTitle: 'Entrar sem Google (só para testes neste computador)',
    devEmail: 'E-mail',
    devName: 'Nome',
    devButton: 'Entrar para testar',
    devHint: 'Precisa de DEV_SIGN_IN=1 no .dev.vars. As mesmas regras de convite valem.',
    devOff: 'O login de teste está desligado. Ponha DEV_SIGN_IN=1 no .dev.vars e reinicie o servidor.',
  },

  nav: {
    main: 'Navegação principal',
    home: 'Início',
    members: 'Membros',
    invites: 'Convites',
    calendar: 'Calendário',
    signOut: 'Sair',
  },

  phases: {
    collection: 'Coleta',
    registration: 'Registro de indicações',
    open: 'Indicações abertas',
    voting: 'Votação',
    announcement: 'Anúncio',
  } satisfies Record<Phase, string>,

  /** "Fase 1: Coleta", or just "Anúncio". */
  phaseTitle: (number: number | null, name: string) => (number ? `Fase ${number}: ${name}` : name),

  home: {
    hello: (name: string) => `Oi, ${name}!`,
    endsAt: (when: string) => `Termina em ${when}, horário de Brasília.`,
    timeLeft: ({ days, hours, minutes }: TimeLeft) => {
      if (days > 0) return `Faltam ${plural(days, 'dia', 'dias')} e ${plural(hours, 'hora', 'horas')}.`;
      if (hours > 0) return `Faltam ${plural(hours, 'hora', 'horas')} e ${plural(minutes, 'minuto', 'minutos')}.`;
      return minutes > 0 ? `Faltam ${plural(minutes, 'minuto', 'minutos')}.` : 'Falta menos de um minuto.';
    },
    ending: 'Esta fase está terminando. A próxima começa em instantes.',
    noEnd: 'O Organizador ainda não marcou quando esta fase termina.',
    /** "Fase 1: Coleta terminou." in the break before the next phase. */
    phaseEnded: (phase: string) => `${phase} terminou.`,
    nextStartsAt: (phase: string, when: string) => `${phase} começa em ${when}, horário de Brasília.`,
    starting: 'A próxima fase começa em instantes.',
    nameLabel: 'Meu nome',
    save: 'Salvar',
  },

  calendar: {
    title: 'Calendário',
    intro:
      'Quando cada fase começa e termina, no horário de Brasília. Uma fase sem data de início começa no fim da anterior; pode haver um intervalo entre as duas.',
    start: 'Início',
    end: 'Fim',
    startNow: 'Iniciar agora',
    startNowConfirm: (phase: string) => `Iniciar a ${phase} agora? A fase atual, se ainda estiver aberta, termina neste instante.`,
    started: (phase: string) => `${phase} começou.`,
    ended: 'Já terminou.',
    save: 'Salvar calendário',
    saved: 'Calendário salvo.',
    invalid:
      'As datas precisam estar no futuro e em ordem: cada fase termina depois de começar e começa no fim da anterior ou depois dele.',
  },

  invites: {
    title: 'Convites',
    emailLabel: 'E-mail da conta Google',
    send: 'Convidar',
    revoke: 'Revogar',
    pending: 'Pendente',
    accepted: 'Aceito',
    revoked: 'Revogado',
    invalidEmail: 'Esse e-mail não parece certo.',
    alreadyMember: 'Essa pessoa já está no grupo.',
    empty: 'Nenhum convite ainda.',
  },

  members: {
    title: 'Membros',
    you: '(você)',
    admin: 'Admin',
    member: 'Participante',
    organizer: 'Organizador',
    makeAdmin: 'Admin',
    makeOrganizer: 'Organizador',
    rolesOf: (name: string) => `Papéis de ${name}`,
    lastAdmin: 'O grupo precisa de pelo menos um admin. Dê o papel a outra pessoa antes.',
    remove: 'Remover',
    removeOf: (name: string) => `Remover ${name} do grupo`,
    removeConfirm: (name: string) => `Remover ${name} do grupo? O acesso acaba na hora. Para voltar, é só convidar de novo.`,
    empty: 'Só você por aqui. Convide alguém!',
  },
} as const;
