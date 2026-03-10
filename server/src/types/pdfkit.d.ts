declare module 'pdfkit' {
    import { Stream } from 'stream';

    interface PDFDocumentOptions {
        margin?: number;
        size?: string | [number, number];
        layout?: 'portrait' | 'landscape';
        info?: {
            Title?: string;
            Author?: string;
            Subject?: string;
            Keywords?: string;
            Creator?: string;
            Producer?: string;
        };
    }

    interface TextOptions {
        align?: 'left' | 'center' | 'right' | 'justify';
        width?: number;
        height?: number;
        ellipsis?: boolean;
        lineGap?: number;
        paragraphGap?: number;
    }

    class PDFDocument extends Stream {
        constructor(options?: PDFDocumentOptions);
        text(text: string, options?: TextOptions): PDFDocument;
        text(text: string, x: number, y: number, options?: TextOptions): PDFDocument;
        moveDown(y?: number): PDFDocument;
        end(): void;
        on(event: 'data', listener: (chunk: Buffer) => void): this;
        on(event: 'end', listener: () => void): this;
        on(event: 'error', listener: (error: Error) => void): this;
    }

    export = PDFDocument;
}

