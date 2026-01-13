import { Exercise } from '../types';
import { convertMarkdownToDocx } from './api';

interface RenderedImage {
  id: string; // matches exercise.id + suffix
  base64: string;
  width: number;
  height: number;
}

export class DocxService {
  
  public async generateDocx(exercises: Exercise[], images: Map<string, RenderedImage>): Promise<Blob> {
    let md = "";

    // 1. Header Information
    md += `# BÀI TẬP TRẮC NGHIỆM\n\n`;
    md += `**Biên soạn: Nguyễn Hữu Phúc**\n\n`;

    // 2. Iterate Exercises
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      const index = i + 1;

      // Question Title (Teal Color via HTML span - Pandoc handles this well for DOCX)
      md += `<span style="color: #0d9488">**Câu ${index}.**</span> ${ex.question}\n\n`;

      // Question Image
      const qImgKey = `${ex.id}_question`;
      if (images.has(qImgKey)) {
        const img = images.get(qImgKey)!;
        // CHANGE: Use Markdown syntax ![]() instead of <img>
        // Add attributes {width=... height=...} for Pandoc to handle sizing correctly without distortion
        md += `![](data:image/png;base64,${img.base64}){width=${img.width}px height=${img.height}px}\n\n`;
      }

      // Choices
      if (ex.type === 'multiple_choice' && ex.choices) {
        ex.choices.forEach((choice, cIdx) => {
          const letter = String.fromCharCode(65 + cIdx); // A, B, C...
          const isCorrect = cIdx === ex.correctChoice;
          
          // Correct answer is RED and Bold. Others are Bold Black.
          const style = isCorrect ? 'color: #dc2626' : 'color: #000000';
          
          md += `<span style="${style}">**${letter}.**</span> ${choice}\n\n`;
        });
      } else if (ex.type === 'true_false' && ex.statements) {
        ex.statements.forEach((stmt, sIdx) => {
          const letter = String.fromCharCode(97 + sIdx); // a, b, c...
          const ans = ex.tfAnswers?.[sIdx] ? "(Đúng)" : "(Sai)";
          
          md += `**${letter})** ${stmt} *${ans}*\n\n`;
        });
      } else if (ex.type === 'short_answer' && ex.answer) {
         md += `**Đáp án:** ${ex.answer}\n\n`;
      }

      // Solution Section
      if (ex.solution || ex.solutionTikz) {
        md += `*Lời giải:*\n\n`;
        
        if (ex.solution) {
          md += `${ex.solution}\n\n`;
        }

        // Solution Image
        const sImgKey = `${ex.id}_solution`;
        if (images.has(sImgKey)) {
          const img = images.get(sImgKey)!;
          md += `![](data:image/png;base64,${img.base64}){width=${img.width}px height=${img.height}px}\n\n`;
        }
      }

      // Separator
      md += `***\n\n`;
    }

    // 3. Call Pandoc API
    return await convertMarkdownToDocx(md);
  }
}