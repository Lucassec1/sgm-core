import { UsuarioAutenticado } from '../types/usuario-autenticado';

// Autor gravado no LogAtividade (R9). Sem atuação continua o texto livre informado pela tela; com
// a madrinha atuando pela afilhada, o servidor define o autor — o log da afilhada mostra que a
// ação veio da madrinha.
export function autorDoLog(user: UsuarioAutenticado, informado?: string): string | undefined {
  return user.paroquiaOrigemId ? 'Madrinha (atuando pela afilhada)' : informado;
}
