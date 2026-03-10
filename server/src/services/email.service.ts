import nodemailer from 'nodemailer';
import { generatePDF, PDFData } from '../utils/pdfGenerator';

interface EmailConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
    from: string;
    replyTo: string;
}

const emailConfig: EmailConfig = {
    host: process.env.SMTP_HOST || 'webmail.geb.fr',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER || 'hfannir@geb.fr',
        pass: process.env.SMTP_PASS || '',
    },
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'hfannir@geb.fr',
    replyTo: process.env.SMTP_FROM || process.env.SMTP_USER || 'hfannir@geb.fr',
};

const allowSelfSigned =
    process.env.SMTP_ALLOW_SELF_SIGNED === 'true' ||
    process.env.SMTP_REJECT_UNAUTHORIZED === 'false';

const transporter = nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    auth: emailConfig.auth,
    ...(allowSelfSigned && {
        tls: { rejectUnauthorized: false },
    }),
});

export interface EmailOptions {
    to: string;
    subject: string;
    text: string;
    html?: string;
    attachments?: Array<{
        filename: string;
        content: Buffer;
        contentType: string;
    }>;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
    const forceEmailSend = process.env.FORCE_EMAIL_SEND === 'true';
    const isDevelopment = process.env.NODE_ENV === 'development';

    try {
        const mailOptions = {
            from: emailConfig.from,
            replyTo: emailConfig.replyTo,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html || options.text,
            attachments: options.attachments || [],
        };

        // In development, log emails by default unless FORCE_EMAIL_SEND=true
        if (isDevelopment && !forceEmailSend) {
            console.log('\n📧 Email Preview (not sent in development):');
            console.log(`To: ${options.to}`);
            console.log(`Subject: ${options.subject}`);
            console.log(`Body:\n${options.text}`);
            if (options.attachments && options.attachments.length > 0) {
                console.log(`Attachments: ${options.attachments.map((a) => a.filename).join(', ')}`);
            }
            console.log('---\n');
            return;
        }

        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${options.to}`);
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

export const sendCheckoutEmail = async (
    collaboratorEmail: string,
    collaboratorName: string,
    equipmentList: string,
    accountsList: string,
    loanDate: string
): Promise<void> => {
    const subject = `[GEB IT] Confirmation de prêt de matériel et création de comptes - ${collaboratorName}`;

    // Format equipment list for HTML
    const formattedEquipmentList = equipmentList
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => `<li>${line}</li>`)
        .join('');

    // Format accounts list for HTML
    const formattedAccountsList = accountsList
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => `<li>${line}</li>`)
        .join('');

    const text = `
Bonjour ${collaboratorName},

Vous avez emprunté le matériel suivant au service informatique de GEB :

Détails du matériel :
${equipmentList}

Comptes informatiques fournis / créés :
${accountsList}

Date du prêt : ${loanDate}
Retour prévu : Lors de votre départ de l'entreprise

Veuillez vous rappeler de :
- Utiliser le matériel conformément à la charte informatique de GEB
- Signaler immédiatement tout problème au service informatique
- Retourner tout le matériel lors de votre départ de l'entreprise

Cordialement,
Service Informatique GEB
hfannir@geb.fr
  `.trim();

    const html = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="background-color: #0056b3; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0; font-size: 24px;">Confirmation de Prêt de Matériel</h2>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Service Informatique GEB</p>
        </div>
        
        <div style="padding: 30px;">
            <p style="font-size: 16px; margin-top: 0;">Bonjour <strong>${collaboratorName}</strong>,</p>
            
            <p style="font-size: 15px;">Vous avez emprunté le matériel suivant au service informatique de GEB :</p>
            
            <div style="background-color: #f8f9fa; border-left: 4px solid #0056b3; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0;">
                <h3 style="margin-top: 0; color: #0056b3; font-size: 16px;">💻 Détails du matériel</h3>
                <ul style="margin-bottom: 0; padding-left: 20px; color: #444;">
                    ${formattedEquipmentList || '<li>Aucun matériel</li>'}
                </ul>
            </div>

            <div style="background-color: #f8f9fa; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0;">
                <h3 style="margin-top: 0; color: #28a745; font-size: 16px;">🔑 Comptes fournis / créés</h3>
                <ul style="margin-bottom: 0; padding-left: 20px; color: #444;">
                    ${formattedAccountsList || '<li>Aucun compte</li>'}
                </ul>
            </div>

            <table style="width: 100%; margin: 25px 0; border-collapse: collapse;">
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; width: 40%; color: #666;"><strong>Date du prêt</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; width: 60%;">${loanDate}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; color: #666;"><strong>Retour prévu</strong></td>
                    <td style="padding: 10px;">Lors de votre départ de l'entreprise</td>
                </tr>
            </table>

            <div style="background-color: #fff3cd; color: #856404; padding: 15px; border-radius: 4px; margin-top: 25px;">
                <h4 style="margin-top: 0; margin-bottom: 10px; font-size: 15px;">⚠️ Rappels importants :</h4>
                <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
                    <li style="margin-bottom: 5px;">Utiliser le matériel conformément à la charte informatique de GEB</li>
                    <li style="margin-bottom: 5px;">Signaler immédiatement tout problème au service informatique</li>
                    <li>Retourner tout le matériel lors de votre départ de l'entreprise</li>
                </ul>
            </div>
        </div>
        
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; color: #666; font-size: 13px; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0;">Cordialement,<br><strong>Service Informatique GEB</strong></p>
            <p style="margin: 5px 0 0 0;"><a href="mailto:hfannir@geb.fr" style="color: #0056b3; text-decoration: none;">hfannir@geb.fr</a></p>
        </div>
    </div>
    `;

    const pdfData: PDFData = {
        headerTitle: 'Confirmation de Prêt de Matériel',
        headerSubtitle: 'Service Informatique GEB',
        greeting: `Bonjour ${collaboratorName},`,
        description: 'Vous avez emprunté le matériel suivant au service informatique de GEB :',
        sections: [
            {
                title: 'Détails du matériel',
                items: equipmentList.split('\n').filter(l => l.trim() !== '')
            },
            {
                title: 'Comptes fournis / créés',
                items: accountsList.split('\n').filter(l => l.trim() !== '')
            }
        ],
        details: [
            { label: 'Date du prêt', value: loanDate },
            { label: 'Retour prévu', value: "Lors de votre départ de l'entreprise" }
        ],
        warnings: [
            'Utiliser le matériel conformément à la charte informatique de GEB',
            'Signaler immédiatement tout problème au service informatique',
            "Retourner tout le matériel lors de votre départ de l'entreprise"
        ],
        isReturn: false
    };

    // Generate PDF attachment
    const pdfBuffer = await generatePDF(pdfData);
    const fileName = `confirmation_pret_${collaboratorName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

    await sendEmail({
        to: collaboratorEmail,
        subject,
        text,
        html,
        attachments: [
            {
                filename: fileName,
                content: pdfBuffer,
                contentType: 'application/pdf',
            },
        ],
    });
};

export const sendReturnEmail = async (
    collaboratorEmail: string,
    collaboratorName: string,
    equipmentList: string,
    accountsList: string,
    returnDate: string,
    itStaffName: string
): Promise<void> => {
    const subject = `[GEB IT] Confirmation de retour de matériel et désactivation de comptes - ${collaboratorName}`;

    // Format equipment list for HTML
    const formattedEquipmentList = equipmentList
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => `<li>${line}</li>`)
        .join('');

    // Format accounts list for HTML
    const formattedAccountsList = accountsList
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => `<li>${line}</li>`)
        .join('');

    const text = `
Bonjour,

Le matériel suivant a été retourné au service informatique :

${equipmentList}

Les comptes suivants ont été désactivés :
${accountsList}

Date de retour : ${returnDate}
Validé par : ${itStaffName}

Cordialement,
Service Informatique GEB
hfannir@geb.fr
  `.trim();

    const html = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0; font-size: 24px;">Confirmation de Retour de Matériel</h2>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Service Informatique GEB</p>
        </div>
        
        <div style="padding: 30px;">
            <p style="font-size: 16px; margin-top: 0;">Bonjour,</p>
            
            <p style="font-size: 15px;">Le matériel suivant a été retourné au service informatique de GEB :</p>
            
            <div style="background-color: #f8f9fa; border-left: 4px solid #6c757d; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0;">
                <h3 style="margin-top: 0; color: #6c757d; font-size: 16px;">💻 Matériel retourné</h3>
                <ul style="margin-bottom: 0; padding-left: 20px; color: #444;">
                    ${formattedEquipmentList || '<li>Aucun matériel</li>'}
                </ul>
            </div>

            <div style="background-color: #f8f9fa; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0;">
                <h3 style="margin-top: 0; color: #dc3545; font-size: 16px;">❌ Comptes désactivés</h3>
                <ul style="margin-bottom: 0; padding-left: 20px; color: #444;">
                    ${formattedAccountsList || '<li>Aucun compte désactivé</li>'}
                </ul>
            </div>

            <table style="width: 100%; margin: 25px 0; border-collapse: collapse;">
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; width: 40%; color: #666;"><strong>Date de retour</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; width: 60%;">${returnDate}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; color: #666;"><strong>Validé par</strong></td>
                    <td style="padding: 10px;">${itStaffName}</td>
                </tr>
            </table>
        </div>
        
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; color: #666; font-size: 13px; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0;">Cordialement,<br><strong>Service Informatique GEB</strong></p>
            <p style="margin: 5px 0 0 0;"><a href="mailto:hfannir@geb.fr" style="color: #28a745; text-decoration: none;">hfannir@geb.fr</a></p>
        </div>
    </div>
    `;

    const pdfData: PDFData = {
        headerTitle: 'Confirmation de Retour de Matériel',
        headerSubtitle: 'Service Informatique GEB',
        greeting: 'Bonjour,',
        description: 'Le matériel suivant a été retourné au service informatique de GEB :',
        sections: [
            {
                title: 'Matériel retourné',
                items: equipmentList.split('\n').filter(l => l.trim() !== '')
            },
            {
                title: 'Comptes désactivés',
                items: accountsList.split('\n').filter(l => l.trim() !== '')
            }
        ],
        details: [
            { label: 'Date de retour', value: returnDate },
            { label: 'Validé par', value: itStaffName }
        ],
        isReturn: true
    };

    // Generate PDF attachment
    const pdfBuffer = await generatePDF(pdfData);
    const fileName = `confirmation_retour_${collaboratorName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

    await sendEmail({
        to: collaboratorEmail,
        subject,
        text,
        html,
        attachments: [
            {
                filename: fileName,
                content: pdfBuffer,
                contentType: 'application/pdf',
            },
        ],
    });
};
