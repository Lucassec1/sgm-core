import { request } from './request';

export type Role = 'PAROQUIA' | 'CONSELHO';

export interface SessaoAtual {
  id: string;
  login: string;
  role: Role;
  nome: string | null;
  paroquia: { id: string; nome: string } | null;
  // Implantação: madrinha atuando como afilhada (a sessão opera a afilhada) e as afilhadas em
  // que ela pode atuar. `paroquia` continua sendo a própria (a madrinha).
  atuando: AtuacaoImplantacao | null;
  podeAtuarEm: AtuacaoImplantacao[];
}

export interface AtuacaoImplantacao {
  implantacaoId: string;
  afilhada: { id: string; nome: string };
}

export const authApi = {
  login(login: string, senha: string) {
    return request<SessaoAtual>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, senha }),
    });
  },

  logout() {
    return request<{ ok: true }>('/auth/logout', { method: 'POST' });
  },

  alterarSenha(senhaAtual: string, senhaNova: string) {
    return request<{ ok: true }>('/auth/senha', {
      method: 'PATCH',
      body: JSON.stringify({ senhaAtual, senhaNova }),
    });
  },

  // "Primeiro acesso ou esqueceu a senha?" — manda o link de criar/redefinir senha pro e-mail.
  // Resposta sempre { ok: true }, exista a conta ou não (o server não revela quais existem).
  esqueciSenha(login: string) {
    return request<{ ok: true }>('/auth/esqueci-senha', {
      method: 'POST',
      body: JSON.stringify({ login }),
    });
  },

  redefinirSenha(token: string, senhaNova: string) {
    return request<{ ok: true }>('/auth/redefinir-senha', {
      method: 'POST',
      body: JSON.stringify({ token, senhaNova }),
    });
  },

  me() {
    return request<SessaoAtual>('/auth/me');
  },

  atuar(implantacaoId: string) {
    return request<SessaoAtual>('/auth/atuar', {
      method: 'POST',
      body: JSON.stringify({ implantacaoId }),
    });
  },

  pararDeAtuar() {
    return request<SessaoAtual>('/auth/atuar', { method: 'DELETE' });
  },
};
