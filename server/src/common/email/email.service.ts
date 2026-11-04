import { Injectable, Logger } from '@nestjs/common';
import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2';

export interface EmailParaEnviar {
  para: string;
  assunto: string;
  texto: string;
  html: string;
}

// Envio de e-mail via Amazon SES — mesma conta AWS (e credenciais IAM) do S3 das fotos, sem
// serviço novo pra contratar. Precisa de EMAIL_REMETENTE com uma identidade verificada no SES
// (ver docs/deploy.md). Sem ela, não envia: em dev só registra no log (o link de redefinição
// aparece no terminal do server); em produção registra erro, sem derrubar o request — quem
// pediu recebe a mesma resposta de sempre, e o problema aparece no log do Render/Sentry.
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly ses = new SESv2Client({
    region: process.env.SES_REGION ?? process.env.AWS_REGION,
  });

  async enviar(email: EmailParaEnviar): Promise<void> {
    const remetente = process.env.EMAIL_REMETENTE;
    if (!remetente) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error(
          `EMAIL_REMETENTE não configurado — e-mail "${email.assunto}" não enviado`,
        );
      } else {
        this.logger.warn(`[dev, sem SES] Para: ${email.para} | ${email.assunto}\n${email.texto}`);
      }
      return;
    }

    try {
      await this.ses.send(
        new SendEmailCommand({
          FromEmailAddress: remetente,
          Destination: { ToAddresses: [email.para] },
          Content: {
            Simple: {
              Subject: { Data: email.assunto, Charset: 'UTF-8' },
              Body: {
                Text: { Data: email.texto, Charset: 'UTF-8' },
                Html: { Data: email.html, Charset: 'UTF-8' },
              },
            },
          },
        }),
      );
    } catch (err) {
      this.logger.error(`Falha ao enviar e-mail "${email.assunto}": ${(err as Error).message}`);
    }
  }
}
