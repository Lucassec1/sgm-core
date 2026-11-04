import { SESv2Client } from '@aws-sdk/client-sesv2';
import { EmailService } from './email.service';

const EMAIL = { para: 'a@b.org', assunto: 'Assunto', texto: 'texto', html: '<p>html</p>' };

describe('EmailService', () => {
  const envOriginal = { ...process.env };
  let send: jest.SpyInstance;

  beforeEach(() => {
    send = jest.spyOn(SESv2Client.prototype, 'send').mockResolvedValue({} as never);
  });

  afterEach(() => {
    process.env = { ...envOriginal };
    jest.restoreAllMocks();
  });

  it('sem EMAIL_REMETENTE, não chama o SES (dev: só loga)', async () => {
    delete process.env.EMAIL_REMETENTE;
    await new EmailService().enviar(EMAIL);
    expect(send).not.toHaveBeenCalled();
  });

  it('com EMAIL_REMETENTE, envia pelo SES com remetente e destinatário certos', async () => {
    process.env.EMAIL_REMETENTE = 'SGM Core <nao-responda@exemplo.org>';
    await new EmailService().enviar(EMAIL);
    const comando = send.mock.calls[0][0] as { input: Record<string, any> };
    expect(comando.input.FromEmailAddress).toBe('SGM Core <nao-responda@exemplo.org>');
    expect(comando.input.Destination.ToAddresses).toEqual(['a@b.org']);
  });

  it('falha do SES não derruba quem chamou', async () => {
    process.env.EMAIL_REMETENTE = 'nao-responda@exemplo.org';
    send.mockRejectedValue(new Error('MessageRejected'));
    await expect(new EmailService().enviar(EMAIL)).resolves.toBeUndefined();
  });
});
