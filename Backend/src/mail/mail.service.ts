import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendApplicationAccepted(candidateName: string, candidateEmail: string, offerTitle: string, companyName: string, companyEmail: string) {
    try {
      await this.mailerService.sendMail({
        to: candidateEmail,
        from: `"${companyName} (via ApplyAI)" <${process.env.MAIL_USER}>`, // El nombre visible será el de la empresa
        subject: `¡Buenas noticias! ${companyName} quiere avanzar con tu postulación`,
        template: './accepted',
        context: {
          candidateName,
          offerTitle,
          companyName,
          companyEmail,
        },
        replyTo: companyEmail, // Permite que el candidato le responda directo a la empresa
      });
      this.logger.log(`Mail de aceptación enviado a ${candidateEmail}`);
    } catch (error) {
      this.logger.error(`Error enviando mail a ${candidateEmail}`, error);
    }
  }

  async sendApplicationRejected(candidateName: string, candidateEmail: string, offerTitle: string, companyName: string) {
    try {
      await this.mailerService.sendMail({
        to: candidateEmail,
        from: `"${companyName} (via ApplyAI)" <${process.env.MAIL_USER}>`,
        subject: `Actualización sobre tu postulación en ${companyName}`,
        template: './rejected',
        context: {
          candidateName,
          offerTitle,
          companyName,
        },
      });
      this.logger.log(`Mail de rechazo enviado a ${candidateEmail}`);
    } catch (error) {
      this.logger.error(`Error enviando mail a ${candidateEmail}`, error);
    }
  }

  async sendWelcomeEmail(userName: string, userEmail: string, role: string) {
    try {
      await this.mailerService.sendMail({
        to: userEmail,
        from: `"ApplyAI" <${process.env.MAIL_USER}>`,
        subject: `¡Bienvenido a ApplyAI, ${userName}!`,
        template: './welcome',
        context: {
          userName,
          isCompany: role === 'COMPANY',
        },
      });
      this.logger.log(`Mail de bienvenida enviado a ${userEmail}`);
    } catch (error) {
      this.logger.error(`Error enviando mail de bienvenida a ${userEmail}`, error);
    }
  }

  async sendNewApplication(candidateName: string, candidateEmail: string, offerTitle: string, companyName: string) {
    try {
      await this.mailerService.sendMail({
        to: candidateEmail,
        from: `"ApplyAI" <${process.env.MAIL_USER}>`,
        subject: `Postulación enviada: ${offerTitle} en ${companyName}`,
        template: './new-application',
        context: {
          candidateName,
          offerTitle,
          companyName,
        },
      });
      this.logger.log(`Mail de postulación enviado a ${candidateEmail}`);
    } catch (error) {
      this.logger.error(`Error enviando mail de postulación a ${candidateEmail}`, error);
    }
  }
}
