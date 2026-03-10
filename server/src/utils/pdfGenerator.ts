import PDFDocument from 'pdfkit';

export interface PDFSection {
    title: string;
    items: string[];
}

export interface PDFData {
    headerTitle: string;
    headerSubtitle: string;
    greeting: string;
    description: string;
    sections: PDFSection[];
    details: { label: string; value: string }[];
    warnings?: string[];
    isReturn?: boolean;
}

export const generatePDF = (data: PDFData): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                margin: 50,
                size: 'A4',
            });

            const chunks: Buffer[] = [];

            doc.on('data', (chunk: Buffer) => {
                chunks.push(chunk);
            });

            doc.on('end', () => {
                const buffer = Buffer.concat(chunks);
                resolve(buffer);
            });

            doc.on('error', (error: Error) => {
                reject(error);
            });

            // Colors
            const primaryColor = data.isReturn ? '#28a745' : '#0056b3';
            const textColor = '#333333';
            const lightGray = '#f8f9fa';
            const borderGray = '#e0e0e0';

            // --- Header part ---
            doc.rect(0, 0, doc.page.width, 100).fill(primaryColor);
            doc.fillColor('#ffffff').fontSize(24).text(data.headerTitle, 50, 35, { align: 'center' });
            doc.fontSize(14).text(data.headerSubtitle, { align: 'center' });

            doc.moveDown(3);

            // --- Body part ---
            doc.fillColor(textColor);
            doc.fontSize(16).font('Helvetica-Bold').text(data.greeting);
            doc.moveDown(0.5);
            doc.fontSize(14).font('Helvetica').text(data.description);
            doc.moveDown(1.5);

            // --- Sections ---
            data.sections.forEach((section) => {
                // Section background
                const yPos = doc.y;
                doc.roundedRect(50, yPos, doc.page.width - 100, 25, 3).fill(lightGray);

                doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text(section.title, 60, yPos + 7);
                doc.moveDown(0.5);

                doc.fillColor(textColor).fontSize(12).font('Helvetica');
                if (section.items.length === 0) {
                    doc.text('Aucun', 70, doc.y);
                } else {
                    section.items.forEach(item => {
                        doc.text(`• ${item}`, 70, doc.y);
                    });
                }
                doc.moveDown(1);
            });

            // --- Details Table ---
            doc.moveDown(1);
            const startY = doc.y;
            data.details.forEach((detail, index) => {
                const y = startY + (index * 25);
                doc.rect(50, y, doc.page.width - 100, 25).stroke(borderGray);
                doc.font('Helvetica-Bold').fontSize(12).text(detail.label, 60, y + 7, { width: 200 });
                doc.font('Helvetica').text(detail.value, 260, y + 7);
            });
            doc.y = startY + (data.details.length * 25) + 20;

            // --- Warnings ---
            if (data.warnings && data.warnings.length > 0) {
                doc.moveDown(1);
                doc.font('Helvetica-Bold').fontSize(14).fillColor('#856404').text('Rappels importants :');
                doc.moveDown(0.5);
                doc.font('Helvetica').fontSize(12).fillColor(textColor);
                data.warnings.forEach(warning => {
                    doc.text(`- ${warning}`, 60, doc.y);
                });
            }

            // --- Footer ---
            doc.moveDown(3);
            doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke(borderGray);
            doc.moveDown(1);
            doc.font('Helvetica').fontSize(12).text('Cordialement,', { align: 'center' });
            doc.font('Helvetica-Bold').text('Service Informatique GEB', { align: 'center' });
            doc.fillColor(primaryColor).text('informatique@geb.fr', { align: 'center', link: 'mailto:hfannir@geb.fr' });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

