import { User, Prontuario, Movimentacao, UserType, ProntuarioStatus, SystemConfig, AgendaHistory } from '../types';

const DB_KEYS = {
  USERS: 'sgp_users',
  PRONTUARIOS: 'sgp_prontuarios',
  MOVIMENTACOES: 'sgp_movimentacoes',
  DESTINATIONS: 'sgp_destinations',
  CONFIG: 'sgp_config',
  AGENDA_HISTORY: 'sgp_agenda_history'
};

class DatabaseService {
  constructor() {
    this.init();
  }

  private init() {
    // Seed Users
    if (!localStorage.getItem(DB_KEYS.USERS)) {
      const defaultAdmin: User = {
        id: 1,
        nome: 'Administrador',
        login: 'admin',
        senha_hash: 'admin123',
        tipo: UserType.ADMIN
      };
      localStorage.setItem(DB_KEYS.USERS, JSON.stringify([defaultAdmin]));
    }

    // Seed Destinations
    if (!localStorage.getItem(DB_KEYS.DESTINATIONS)) {
      const defaultDest = [
        'Ambulatório', 'Internação', 'Faturamento', 'Arquivo',
        'Recepção', 'Autorização', 'Estatística',
        'Auditoria', 'Outros', 'Arquivo Morto'
      ];
      localStorage.setItem(DB_KEYS.DESTINATIONS, JSON.stringify(defaultDest));
    }

    // Seed Config
    if (!localStorage.getItem(DB_KEYS.CONFIG)) {
      const defaultConfig: SystemConfig = {
        requiredFields: { idade: true, sexo: false, nascimento: false },
        permissions: { 
          commonCanViewHistory: true, 
          commonCanImportAgenda: true,
          commonCanEditProntuario: false,
          commonCanDeleteProntuario: false,
          commonCanManageDestinations: false,
          commonCanManageRequiredFields: false
        }
      };
      localStorage.setItem(DB_KEYS.CONFIG, JSON.stringify(defaultConfig));
    }

    // Seed Prontuarios
    if (!localStorage.getItem(DB_KEYS.PRONTUARIOS)) {
      const dummyProntuarios: Prontuario[] = [
        { id: 1, numero_prontuario: '1001', nome_paciente: 'Maria Silva', idade: 34, sexo: 'F', data_nascimento: '1990-05-15', status: ProntuarioStatus.ATIVO, local_atual: 'Arquivo', local_anterior: 'Recepção', ultima_movimentacao: new Date().toISOString() },
        { id: 2, numero_prontuario: '1002', nome_paciente: 'João Santos', idade: 28, sexo: 'M', data_nascimento: '1996-02-20', status: ProntuarioStatus.ATIVO, local_atual: 'Internação', local_anterior: 'Ambulatório', ultima_movimentacao: new Date().toISOString() },
        { id: 3, numero_prontuario: '1003', nome_paciente: 'Ana Pereira', idade: 45, sexo: 'F', data_nascimento: '1979-11-10', status: ProntuarioStatus.DESATIVADO, local_atual: 'Arquivo Morto', local_anterior: 'Internação', ultima_movimentacao: new Date().toISOString() },
      ];
      localStorage.setItem(DB_KEYS.PRONTUARIOS, JSON.stringify(dummyProntuarios));
    }

    if (!localStorage.getItem(DB_KEYS.MOVIMENTACOES)) {
      localStorage.setItem(DB_KEYS.MOVIMENTACOES, JSON.stringify([]));
    }
    
    if (!localStorage.getItem(DB_KEYS.AGENDA_HISTORY)) {
      localStorage.setItem(DB_KEYS.AGENDA_HISTORY, JSON.stringify([]));
    }
  }

  // --- Config ---
  getConfig(): SystemConfig {
    const stored = localStorage.getItem(DB_KEYS.CONFIG);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Ensure new permissions exist if config is old
      if (parsed.permissions.commonCanManageDestinations === undefined) {
        parsed.permissions.commonCanManageDestinations = false;
        parsed.permissions.commonCanManageRequiredFields = false;
        this.saveConfig(parsed);
      }
      return parsed;
    }
    return JSON.parse(localStorage.getItem(DB_KEYS.CONFIG) || '{}');
  }

  saveConfig(config: SystemConfig): void {
    localStorage.setItem(DB_KEYS.CONFIG, JSON.stringify(config));
  }

  // --- Users ---
  getUsers(): User[] {
    return JSON.parse(localStorage.getItem(DB_KEYS.USERS) || '[]');
  }

  addUser(user: Omit<User, 'id'>): void {
    const users = this.getUsers();
    const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
    users.push({ ...user, id: newId });
    localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
  }

  updateUser(updatedUser: User): void {
    const users = this.getUsers().map(u => u.id === updatedUser.id ? updatedUser : u);
    localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
  }

  deleteUser(id: number): void {
    let users = this.getUsers();
    users = users.filter(u => u.id !== id);
    localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
  }

  // --- Destinations ---
  getDestinations(): string[] {
    return JSON.parse(localStorage.getItem(DB_KEYS.DESTINATIONS) || '[]');
  }

  saveDestinations(dests: string[]): void {
    localStorage.setItem(DB_KEYS.DESTINATIONS, JSON.stringify(dests));
  }

  // --- Prontuarios ---
  getProntuarios(): Prontuario[] {
    return JSON.parse(localStorage.getItem(DB_KEYS.PRONTUARIOS) || '[]');
  }

  getProntuarioByNumber(num: string): Prontuario | undefined {
    // Normalize comparison to avoid string/number mismatch
    return this.getProntuarios().find(p => String(p.numero_prontuario) === String(num));
  }

  addProntuario(p: Omit<Prontuario, 'id'>): void {
    const list = this.getProntuarios();
    if (list.some(existing => existing.numero_prontuario === p.numero_prontuario)) {
      throw new Error("Número de prontuário já existe.");
    }
    const newId = list.length > 0 ? Math.max(...list.map(i => i.id)) + 1 : 1;
    // When created, local_anterior is usually undefined or same as current
    list.push({ ...p, id: newId, ultima_movimentacao: new Date().toISOString() });
    localStorage.setItem(DB_KEYS.PRONTUARIOS, JSON.stringify(list));
  }

  // Update full data (Edit Prontuario)
  updateProntuario(updated: Prontuario): void {
    const list = this.getProntuarios();
    const idx = list.findIndex(p => p.id === updated.id);
    if (idx !== -1) {
      // Prevent duplicate numbers if number changed
      const duplicate = list.find(p => p.numero_prontuario === updated.numero_prontuario && p.id !== updated.id);
      if (duplicate) throw new Error("Já existe outro prontuário com este número.");
      
      list[idx] = updated;
      localStorage.setItem(DB_KEYS.PRONTUARIOS, JSON.stringify(list));
    }
  }

  deleteProntuario(id: number): void {
    let list = this.getProntuarios();
    list = list.filter(p => p.id !== id);
    localStorage.setItem(DB_KEYS.PRONTUARIOS, JSON.stringify(list));
  }

  // Método padrão de movimentação (Muda local e atualiza local_anterior)
  updateProntuarioLocation(numero: string, novoLocal: string): void {
    const list = this.getProntuarios();
    const idx = list.findIndex(p => p.numero_prontuario === numero);
    if (idx !== -1) {
      list[idx].local_anterior = list[idx].local_atual;
      list[idx].local_atual = novoLocal;
      list[idx].ultima_movimentacao = new Date().toISOString();
      localStorage.setItem(DB_KEYS.PRONTUARIOS, JSON.stringify(list));
    }
  }

  // Método de Edição de Localização (Correção/Edição)
  correctProntuarioLocation(numero: string, novoLocal: string, usuario: string, isDeletion: boolean = false): void {
    const list = this.getProntuarios();
    const idx = list.findIndex(p => p.numero_prontuario === numero);
    
    if (idx !== -1) {
      const oldLocal = list[idx].local_atual;
      
      if (isDeletion) {
         // Revert to previous if possible
         if (list[idx].local_anterior) {
             list[idx].local_atual = list[idx].local_anterior!;
             // We don't change local_anterior here to avoid losing history track completely
         }
      } else {
         // Standard manual edit
         list[idx].local_atual = novoLocal;
      }
      
      list[idx].ultima_movimentacao = new Date().toISOString();
      localStorage.setItem(DB_KEYS.PRONTUARIOS, JSON.stringify(list));

      // Log the correction/deletion in History
      this.addHistoryLog({
        numero_prontuario: list[idx].numero_prontuario,
        nome_paciente: list[idx].nome_paciente,
        idade: list[idx].idade,
        origem: oldLocal, 
        destino: isDeletion ? (list[idx].local_anterior || oldLocal) : novoLocal, 
        usuario_responsavel: usuario,
        observacao: isDeletion ? 'Exclusão da movimentação' : 'Correção Manual (Editado)'
      });
    }
  }

  // --- Movimentacoes ---
  getMovimentacoes(): Movimentacao[] {
    return JSON.parse(localStorage.getItem(DB_KEYS.MOVIMENTACOES) || '[]');
  }

  // Internal helper to just push to history without logic
  private addHistoryLog(mov: Omit<Movimentacao, 'id' | 'data_hora'>) {
    const list = this.getMovimentacoes();
    const newId = list.length > 0 ? Math.max(...list.map(i => i.id)) + 1 : 1;
    const newMov: Movimentacao = {
      ...mov,
      id: newId,
      data_hora: new Date().toISOString()
    };
    list.push(newMov);
    localStorage.setItem(DB_KEYS.MOVIMENTACOES, JSON.stringify(list));
  }

  addMovimentacao(mov: Omit<Movimentacao, 'id' | 'data_hora'>): void {
    // 1. Add History
    this.addHistoryLog(mov);
    
    // 2. Update Prontuario Logic (Standard Move)
    this.updateProntuarioLocation(mov.numero_prontuario, mov.destino);
  }

  // --- Agenda History ---
  getAgendaHistory(): AgendaHistory[] {
      return JSON.parse(localStorage.getItem(DB_KEYS.AGENDA_HISTORY) || '[]');
  }

  addAgendaHistory(agenda: AgendaHistory): void {
      const list = this.getAgendaHistory();
      list.push(agenda);
      localStorage.setItem(DB_KEYS.AGENDA_HISTORY, JSON.stringify(list));
  }

  deleteAgendaHistory(id: string): void {
      let list = this.getAgendaHistory();
      list = list.filter(a => a.id !== id);
      localStorage.setItem(DB_KEYS.AGENDA_HISTORY, JSON.stringify(list));
  }
}

export const db = new DatabaseService();