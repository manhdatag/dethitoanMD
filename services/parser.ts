import { Exercise } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class LaTeXParser {
  // Helper: Remove comments from Ex blocks
  private decommentExBlocks(latex: string): string {
    const lines = latex.split(/\r?\n/);
    let inEx = false;
    for (let i = 0; i < lines.length; i++) {
      const stripped = lines[i].replace(/^\s*%+\s?/, '');
      if (!inEx && /\\begin\s*\{\s*ex\s*\}/.test(stripped)) {
        inEx = true;
        lines[i] = stripped;
        continue;
      }
      if (inEx) {
        lines[i] = stripped;
        if (/\\end\s*\{\s*ex\s*\}/.test(stripped)) inEx = false;
      }
    }
    return lines.join('\n');
  }

  // Helper: Clean basic LaTeX commands for plain text display
  private cleanLatexContent(t: string): string {
    if (!t) return '';
    let text = t;
    text = text.replace(/\\begin\s*\{\s*(center|align|align\*|flushleft|flushright)\s*\}/g, '');
    text = text.replace(/\\end\s*\{\s*(center|align|align\*|flushleft|flushright)\s*\}/g, '');
    text = text.replace(/\\vspace\s*\{[^}]*\}/g, '');
    text = text.replace(/\\hspace\s*\{[^}]*\}/g, '');
    text = text.replace(/\\textbf\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, '$1');
    text = text.replace(/\\textit\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, '$1');
    text = text.replace(/\\text\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, '$1');
    text = text.replace(/\\emph\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, '$1');
    text = text.replace(/\\hline/g, '');
    text = text.replace(/\\noindent/g, '');
    text = text.replace(/\\par\b/g, '');
    text = text.replace(/\\\\/g, ' '); 
    text = text.replace(/\s+/g, ' ').trim();
    return text;
  }

  // Helper: Extract content after macro
  private sliceAfterMacro(full: string, start: number): string {
    let t = full.substring(start);
    const stop = t.search(/\\(loigiai|end\s*\{\s*ex\s*\})/);
    if (stop >= 0) t = t.substring(0, stop);
    return t.trim();
  }

  // Helper: Extract nested brace groups
  private extractBraceGroups(text: string, maxItems: number = 10): string[] {
    const items: string[] = [];
    let i = 0;
    while (i < text.length && items.length < maxItems) {
      if (/^\\(loigiai|end\s*\{\s*ex\s*\})/.test(text.slice(i))) break;
      
      // Skip until {
      while (i < text.length && text[i] !== '{') {
         if (/^\\(loigiai|end\s*\{\s*ex\s*\})/.test(text.slice(i))) return items;
         i++;
      }
      if (i >= text.length) break;

      let lvl = 1;
      let j = i + 1;
      while (j < text.length && lvl > 0) {
        if (text[j] === '{') lvl++;
        else if (text[j] === '}') lvl--;
        j++;
      }

      if (lvl === 0) {
        const raw = text.substring(i + 1, j - 1).trim();
        if (raw) items.push(raw);
        i = j;
      } else {
        break;
      }
    }
    return items;
  }

  // Helper: Split by A., B. or a), b)
  private splitEnumeratedList(text: string, letters: string[], maxItems: number = 10): string[] {
    const escapedLetters = letters.join('');
    const re = new RegExp(`(^|[\\s\\r\\n])([${escapedLetters}])(\\.|\\))`, 'g');
    
    const pos: number[] = [];
    let m;
    while ((m = re.exec(text)) !== null) {
      pos.push(m.index + m[1].length);
    }

    if (!pos.length) return [];

    const parts: string[] = [];
    for (let k = 0; k < pos.length; k++) {
      const start = pos[k];
      const end = (k + 1 < pos.length) ? pos[k + 1] : text.length;
      let chunk = text.substring(start, end).trim();
      // Remove the label "A." or "a)"
      chunk = chunk.replace(/^[A-Za-z](?:\.|\))\s*/, '');
      if (chunk) parts.push(chunk.trim());
      if (parts.length >= maxItems) break;
    }
    return parts;
  }

  private stripTrueMarker(s: string): { text: string; isTrue: boolean } {
    if (!s) return { text: '', isTrue: false };
    const m = s.match(/^\\True\s+/i);
    if (m) return { text: s.replace(/^\\True\s+/i, '').trim(), isTrue: true };
    return { text: s.trim(), isTrue: false };
  }

  public extractExercises(latexContent: string): string[] {
    const normalized = this.decommentExBlocks(latexContent);
    const exPattern = /\\begin\s*\{\s*ex\s*\}([\s\S]*?)\\end\s*\{\s*ex\s*\}/g;
    const exercises: string[] = [];
    let m;
    while ((m = exPattern.exec(normalized)) !== null) {
      const content = m[1].trim();
      if (content) exercises.push(content);
    }
    return exercises;
  }

  public parseExercise(exContent: string): Exercise {
    let type: Exercise['type'] = 'unknown';
    let data: Partial<Exercise> = {};

    if (exContent.includes('\\choiceTF')) {
      type = 'true_false';
      data = this.parseTrueFalse(exContent);
    } else if (exContent.includes('\\choice')) {
      type = 'multiple_choice';
      data = this.parseMultipleChoice(exContent);
    } else if (exContent.includes('\\shortans')) {
      type = 'short_answer';
      data = this.parseShortAnswer(exContent);
    }

    // Extract TikZ in Question
    const tikzMatch = exContent.match(/\\begin\s*\{\s*tikzpicture\s*\}[\s\S]*?\\end\s*\{\s*tikzpicture\s*\}/);
    const tikz = tikzMatch ? tikzMatch[0] : null;

    // Clean TikZ from Question Text if it exists
    if (data.question && tikz) {
      // We try to remove the raw TikZ string from the cleaned question
      // This is tricky because cleanLatexContent might have altered spacing.
      // A better approach is to rely on the fact that TikZ blocks are distinct.
      // We will perform a simpler removal: remove the TikZ block from the question string.
      // Note: parser.ts logic separates parsing 'data' from 'exContent'. 
      // The 'data.question' was derived from 'exContent' MINUS solution.
      
      // Let's refine: We re-clean the question specifically to remove the TikZ block.
      data.question = data.question.replace(tikz, '').trim();
      data.question = this.cleanLatexContent(data.question); // Clean again to remove leftover spacing
    }


    // Extract Solution
    const solMatch = exContent.match(/\\loigiai\s*\{((?:[^{}]|{[^{}]*})*)\}/s);
    let solution = null;
    let solutionTikz = null;

    if (solMatch) {
      let solutionContent = solMatch[1].trim();
      
      // Extract TikZ in Solution
      const solTikzMatch = solutionContent.match(/\\begin\s*\{\s*tikzpicture\s*\}[\s\S]*?\\end\s*\{\s*tikzpicture\s*\}/);
      if (solTikzMatch) {
        solutionTikz = solTikzMatch[0];
        solutionContent = solutionContent.replace(solTikzMatch[0], '').trim();
      }
      
      solution = this.cleanLatexContent(solutionContent);
    }

    return {
      id: uuidv4(),
      type,
      question: data.question || '', 
      rawQuestion: data.rawQuestion || '',
      choices: data.choices,
      correctChoice: data.correctChoice,
      statements: data.statements,
      tfAnswers: data.tfAnswers,
      answer: data.answer,
      tikz,
      solution,
      solutionTikz,
    };
  }

  private parseMultipleChoice(content: string) {
    const re = /\\choice\b/;
    const m = content.match(re);
    if (!m) return { question: this.cleanLatexContent(content), rawQuestion: content, choices: [], correctChoice: -1 };

    const idx = content.indexOf(m[0]);
    const qRaw = content.substring(0, idx).trim();

    const section = this.sliceAfterMacro(content, idx + m[0].length);
    let rawChoices = this.extractBraceGroups(section, 4);
    
    // Fallback if brace groups fail, try A. B. C. D.
    if (rawChoices.length < 2) {
      rawChoices = this.splitEnumeratedList(section, ['A', 'B', 'C', 'D'], 4);
    }

    let correctIdx = -1;
    const choices = rawChoices.map((c, i) => {
      const { text, isTrue } = this.stripTrueMarker(c);
      if (isTrue && correctIdx === -1) correctIdx = i;
      return this.cleanLatexContent(text);
    });

    return {
      question: this.cleanLatexContent(qRaw),
      rawQuestion: qRaw,
      choices,
      correctChoice: correctIdx
    };
  }

  private parseTrueFalse(content: string) {
    const tf = content.match(/\\choiceTF\s*(?:\[(t)\])?\s*/i);
    if (!tf) return { question: this.cleanLatexContent(content), rawQuestion: content, statements: [], answers: [] };

    const idx = content.indexOf(tf[0]);
    const qRaw = content.substring(0, idx).trim();

    const section = this.sliceAfterMacro(content, idx + tf[0].length);
    let raws = this.extractBraceGroups(section, 4);
    if (raws.length < 1) {
      raws = this.splitEnumeratedList(section, ['a', 'b', 'c', 'd'], 4);
    }

    const statements: string[] = [];
    const answers: boolean[] = [];

    raws.forEach(s => {
      const { text, isTrue } = this.stripTrueMarker(s);
      statements.push(this.cleanLatexContent(text));
      answers.push(isTrue);
    });

    return {
      question: this.cleanLatexContent(qRaw),
      rawQuestion: qRaw,
      statements,
      answers,
    };
  }

  private parseShortAnswer(content: string) {
    const m = content.match(/\\shortans\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/);
    let q = '', a = '';
    if (m) {
      const i = content.indexOf(m[0]);
      q = content.substring(0, i).trim();
      a = m[1].trim();
    } else {
      q = content.trim();
    }
    return {
      question: this.cleanLatexContent(q),
      rawQuestion: q,
      answer: this.cleanLatexContent(a)
    };
  }
}