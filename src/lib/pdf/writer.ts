import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'

const NAVY = rgb(15 / 255, 31 / 255, 61 / 255)
const GREY = rgb(0.42, 0.45, 0.5)
const A4: [number, number] = [595.28, 841.89]
const MARGIN = 48

/**
 * A small top to bottom PDF writer on pdf-lib (A4, Helvetica). Text is plain; WinAnsi can't print some
 * characters, so they are replaced. Used for invoices, credit notes, letters and the claim pack.
 */
export class PdfWriter {
  private doc!: PDFDocument
  private page!: PDFPage
  private font!: PDFFont
  private bold!: PDFFont
  private y = 0

  static async create(): Promise<PdfWriter> {
    const w = new PdfWriter()
    w.doc = await PDFDocument.create()
    w.font = await w.doc.embedFont(StandardFonts.Helvetica)
    w.bold = await w.doc.embedFont(StandardFonts.HelveticaBold)
    w.newPage()
    return w
  }

  newPage(): void {
    this.page = this.doc.addPage(A4)
    this.y = A4[1] - MARGIN
  }

  private clean(s: string): string {
    return s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, ' ').replace(/[^\x20-\x7E£\n]/g, '')
  }

  private ensure(height: number): void {
    if (this.y - height < MARGIN) this.newPage()
  }

  private wrap(text: string, size: number, width: number, font: PDFFont): string[] {
    const out: string[] = []
    for (const para of this.clean(text).split('\n')) {
      let line = ''
      for (const word of para.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word
        if (font.widthOfTextAtSize(next, size) > width && line) {
          out.push(line)
          line = word
        } else line = next
      }
      out.push(line)
    }
    return out
  }

  text(t: string, opts: { size?: number; bold?: boolean; color?: 'navy' | 'grey' | 'black'; indent?: number; gap?: number } = {}): void {
    const size = opts.size ?? 10
    const font = opts.bold ? this.bold : this.font
    const x = MARGIN + (opts.indent ?? 0)
    const width = A4[0] - MARGIN - x
    const color = opts.color === 'navy' ? NAVY : opts.color === 'grey' ? GREY : rgb(0.1, 0.1, 0.1)
    for (const line of this.wrap(t, size, width, font)) {
      this.ensure(size + 4)
      this.page.drawText(line, { x, y: this.y - size, size, font, color })
      this.y -= size + 4
    }
    this.y -= opts.gap ?? 2
  }

  /** Two columns: label on the left, value right aligned. */
  row(label: string, value: string, opts: { bold?: boolean; size?: number } = {}): void {
    const size = opts.size ?? 10
    const font = opts.bold ? this.bold : this.font
    this.ensure(size + 6)
    const v = this.clean(value)
    const labelLines = this.wrap(label, size, A4[0] - 2 * MARGIN - 120, font)
    this.page.drawText(v, { x: A4[0] - MARGIN - font.widthOfTextAtSize(v, size), y: this.y - size, size, font })
    for (const l of labelLines) {
      this.ensure(size + 4)
      this.page.drawText(l, { x: MARGIN, y: this.y - size, size, font })
      this.y -= size + 4
    }
    this.y -= 2
  }

  rule(): void {
    this.ensure(10)
    this.page.drawLine({ start: { x: MARGIN, y: this.y - 4 }, end: { x: A4[0] - MARGIN, y: this.y - 4 }, thickness: 0.5, color: GREY })
    this.y -= 12
  }

  space(h = 8): void {
    this.y -= h
  }

  /** A photo, scaled to fit the width (max 220pt high). Unsupported formats are skipped. */
  async image(bytes: Uint8Array, kind: 'jpg' | 'png', caption?: string): Promise<void> {
    try {
      const img = kind === 'png' ? await this.doc.embedPng(bytes) : await this.doc.embedJpg(bytes)
      const maxW = A4[0] - 2 * MARGIN
      const scale = Math.min(maxW / img.width, 220 / img.height, 1)
      const w = img.width * scale
      const h = img.height * scale
      this.ensure(h + 20)
      this.page.drawImage(img, { x: MARGIN, y: this.y - h, width: w, height: h })
      this.y -= h + 4
      if (caption) this.text(caption, { size: 8, color: 'grey' })
    } catch {
      if (caption) this.text(`${caption} (photo could not be included)`, { size: 8, color: 'grey' })
    }
  }

  stamp(label: string): void {
    this.page.drawText(this.clean(label), { x: A4[0] - MARGIN - 140, y: A4[1] - MARGIN - 30, size: 22, font: this.bold, color: rgb(0.1, 0.55, 0.25), opacity: 0.8 })
  }

  async bytes(): Promise<Uint8Array> {
    return this.doc.save()
  }

  /** Copy all pages of other PDFs onto the end (bundles and the claim pack). */
  static async merge(parts: Uint8Array[]): Promise<Uint8Array> {
    const out = await PDFDocument.create()
    for (const p of parts) {
      const src = await PDFDocument.load(p)
      const pages = await out.copyPages(src, src.getPageIndices())
      pages.forEach(pg => out.addPage(pg))
    }
    return out.save()
  }
}
