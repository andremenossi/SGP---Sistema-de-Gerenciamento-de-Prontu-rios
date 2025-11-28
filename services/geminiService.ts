import { GoogleGenAI, Type } from "@google/genai";
import { AgendaItem } from '../types';

/**
 * Parses unstructured text (copy-paste from PDF/Excel/Word) into structured Agenda Items.
 */
export const parseAgendaWithAI = async (text: string): Promise<AgendaItem[]> => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY not set. Returning empty.");
    return [];
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Extract medical appointment data from the following text. 
      The text might be messy. Ignore headers or footers. 
      Return a JSON array where each object represents a patient appointment.
      Fields required: 'horario' (string, e.g., "14:00"), 'nome_paciente' (string), 'numero_prontuario' (string, extract digits), 'medico' (string), 'especialidade' (string).
      If age is present, include 'idade' (number), otherwise null.
      
      Text to process:
      ${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              horario: { type: Type.STRING },
              nome_paciente: { type: Type.STRING },
              numero_prontuario: { type: Type.STRING },
              medico: { type: Type.STRING },
              especialidade: { type: Type.STRING },
              idade: { type: Type.NUMBER, nullable: true },
            },
            required: ["horario", "nome_paciente", "numero_prontuario", "medico", "especialidade"]
          }
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      // Map to our internal type with UUIDs
      return data.map((item: any) => ({
        id: crypto.randomUUID(),
        numero_prontuario: item.numero_prontuario,
        nome_paciente: item.nome_paciente,
        idade: item.idade || undefined,
        horario: item.horario,
        medico: item.medico,
        especialidade: item.especialidade,
        selecionado: false
      }));
    }
    return [];
  } catch (error) {
    console.error("Gemini Parse Error:", error);
    throw new Error("Falha ao processar o texto da agenda com IA.");
  }
};