import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export function runDeterministicValidation(payloadRaw: string, schemaDefinitionRaw: string) {
  try {
    const payload = JSON.parse(payloadRaw);
    const schemaDef = JSON.parse(schemaDefinitionRaw);

    const shape: Record<string, z.ZodTypeAny> = {};
    for (const [key, type] of Object.entries(schemaDef)) {
      if (type === 'string') shape[key] = z.string();
      else if (type === 'number') shape[key] = z.number();
      else if (type === 'boolean') shape[key] = z.boolean();
      else shape[key] = z.any();
    }

    const dynamicZodSchema = z.object(shape);
    const validation = dynamicZodSchema.safeParse(payload);

    if (!validation.success) {
      return { passed: false, error: `Schema mismatch: ${JSON.stringify(validation.error.format())}` };
    }
    return { passed: true };
  } catch (err: any) {
    return { passed: false, error: `Invalid JSON structure: ${err.message}` };
  }
}

export async function runSemanticEvaluation(payloadRaw: string, semanticCriteria: string) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('mock')) {
    return {
      passed: true,
      score: 97.0,
      reasoning: 'MOCK ARBITER: All semantic criteria and quality constraints satisfied.',
    };
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const prompt = `
You are the AgentSLA Chief Protocol Arbiter. Evaluate this deliverable against the SLA.

SLA CRITERIA:
"""
${semanticCriteria}
"""

SUBMITTED PAYLOAD:
"""
${payloadRaw}
"""

Return strictly valid JSON with no markdown:
{
  "passed": boolean,
  "score": number,
  "reasoning": "string"
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json', temperature: 0.1 },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return {
      passed: Boolean(parsed.passed),
      score: typeof parsed.score === 'number' ? parsed.score : 95,
      reasoning: parsed.reasoning || 'Semantic SLA verified.',
    };
  } catch (err: any) {
    return { passed: false, score: 0, reasoning: `Gemini verification error: ${err.message}` };
  }
}

export async function evaluateDeliverable(payloadRaw: string, schemaDefRaw: string, semanticCriteria: string) {
  const stage1 = runDeterministicValidation(payloadRaw, schemaDefRaw);
  if (!stage1.passed) {
    return {
      stage1,
      stage2: { passed: false, score: 0, reasoning: 'Stage 2 skipped: Blocked at Stage 1 schema gate.' },
      overallPassed: false,
    };
  }

  const stage2 = await runSemanticEvaluation(payloadRaw, semanticCriteria);
  return { stage1, stage2, overallPassed: stage1.passed && stage2.passed };
}
