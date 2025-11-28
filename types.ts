export enum UserType {
  ADMIN = 'admin',
  COMUM = 'comum'
}

export enum ProntuarioStatus {
  ATIVO = 'Ativo',
  DESATIVADO = 'Desativado',
  PERDIDO = 'Perdido'
}

export interface User {
  id: number;
  nome: string;
  login: string;
  senha_hash: string;
  tipo: UserType;
  theme?: 'light' | 'dark';
}

export interface Prontuario {
  id: number;
  numero_prontuario: string;
  nome_paciente: string;
  idade: number;
  sexo?: string; // 'M' | 'F' | 'Outro'
  data_nascimento?: string; // YYYY-MM-DD
  status: ProntuarioStatus;
  local_atual: string;
  local_anterior?: string; // Tracks where it came from
  ultima_movimentacao?: string; // ISO Date String
}

export interface Movimentacao {
  id: number;
  numero_prontuario: string;
  nome_paciente: string;
  idade: number;
  origem: string;
  destino: string;
  data_hora: string;
  usuario_responsavel: string;
  observacao?: string; // Campo novo para logs de edição/correção
}

export interface AgendaItem {
  id: string; 
  numero_prontuario: string;
  nome_paciente: string;
  idade?: number;
  horario: string;
  medico: string;
  especialidade: string;
  selecionado: boolean;
  statusProcessamento?: 'pendente' | 'movido' | 'criado_e_movido' | 'erro';
}

export interface AgendaHistory {
  id: string;
  data_importacao: string; // ISO Date
  usuario: string;
  nome_medico: string; // Resumo ou primeiro médico encontrado
  especialidade: string;
  total_pacientes: number;
  items: AgendaItem[];
}

export interface SystemConfig {
  requiredFields: {
    idade: boolean;
    sexo: boolean;
    nascimento: boolean;
  };
  permissions: {
    commonCanViewHistory: boolean;
    commonCanImportAgenda: boolean;
    commonCanEditProntuario: boolean;
    commonCanDeleteProntuario: boolean;
    // New Permissions
    commonCanManageDestinations: boolean;
    commonCanManageRequiredFields: boolean;
  };
}