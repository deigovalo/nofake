import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { google } from "@ai-sdk/google"

// Definimos la interfaz para el resultado del análisis
interface AnalysisResult {
  credibilityScore: number // Puntuación de credibilidad entre 0 y 100
  status: "verified" | "suspicious" | "fake" // Estado de la credibilidad
  sources: Array<{
    name: string // Nombre de la fuente (ej. "Britannica", "Análisis heurístico")
    status: string // Estado de la fuente (ej. "verified", "suspicious", "fake")
    url: string // URL de la página de donde proviene el texto, o una URL de análisis
  }>
  analysis: {
    sentiment: string // Sentimiento del texto (neutral, positivo, negativo)
    biasScore: number // Puntuación de sesgo entre 0 y 100
    factualClaims: number // Número de afirmaciones de hechos
    verifiedClaims: number // Número de afirmaciones verificadas
    reasoning: string // Explicación detallada del análisis
  }
  warnings: string[] // Lista de advertencias si las hay
}

export async function POST(request: NextRequest) {
  try {
    // Obtenemos el contenido y, opcionalmente, la URL proporcionada por el usuario desde el cuerpo de la solicitud
    const { content, providedUrl }: { content: string; providedUrl?: string } = await request.json()

    // Validamos que el contenido sea requerido y sea una cadena
    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Contenido requerido" }, { status: 400 })
    }

    // Construimos una parte del prompt que incluirá la URL si se proporciona
    let urlHintForAI = ""
    if (providedUrl) {
      urlHintForAI = `El usuario ha proporcionado la siguiente URL como posible origen del texto: "${providedUrl}". Por favor, si este texto realmente proviene de esa URL o si esa URL es una fuente relevante para verificar el texto, inclúyela en el campo 'url' de la sección 'sources'. Si no puedes verificarlo o no es relevante, puedes dejar el campo 'url' en blanco o usar una URL general de "verificación".`
    }

    // Usar AI SDK para analizar el contenido con un prompt más específico
    const { text } = await generateText({
      model: google("gemini-2.0-flash"),
      prompt: `Eres un experto verificador de hechos y analista de contenido. Analiza el siguiente texto y determina su credibilidad.

TEXTO A ANALIZAR: "${content}"

${urlHintForAI}

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta (sin texto adicional antes o después):

{
  "credibilityScore": [número entre 0-100],
  "status": "[verified/suspicious/fake]",
  "sources": [
    {
      "name": "[nombre de fuente verificadora, si el texto se puede atribuir a una fuente específica o es parte de un análisis]",
      "status": "[verified/suspicious/fake]",
      "url": "url ejmplo"
    }
  ],
  "analysis": {
    "sentiment": "[neutral/positive/negative]",
    "biasScore": [número entre 0-100],
    "factualClaims": [número de afirmaciones],
    "verifiedClaims": [número de afirmaciones verificadas],
    "reasoning": "[explicación detallada de por qué se asignó el estatus y la puntuación]"
  },
  "warnings": ["[lista de advertencias si las hay]"]
}

CRITERIOS DE EVALUACIÓN:
- Lenguaje sensacionalista (URGENTE, SECRETO, MILAGROSO) = menor credibilidad
- Afirmaciones extraordinarias sin evidencia = sospechoso/falso
- Fuentes citadas y verificables = mayor credibilidad
- Lenguaje objetivo y balanceado = mayor credibilidad
- Gramática y ortografía correcta = mayor credibilidad

RESPONDE SOLO CON EL JSON:`,
    })

    console.log("Respuesta de AI:", text)

    // Limpiar la respuesta para extraer solo el JSON
    let cleanedText = text.trim()

    // Buscar el JSON en la respuesta
    const jsonStart = cleanedText.indexOf("{")
    const jsonEnd = cleanedText.lastIndexOf("}")

    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1)
    }

    // Parsear la respuesta JSON
    let analysisResult: AnalysisResult
    try {
      analysisResult = JSON.parse(cleanedText)

      // Validar que tenga las propiedades requeridas
      if (!analysisResult.credibilityScore || !analysisResult.status || !analysisResult.analysis) {
        throw new Error("Respuesta incompleta de la IA")
      }
    } catch (parseError) {
      console.error("Error al parsear el JSON de la IA:", parseError)
      console.error("Texto recibido de la IA:", text)

      // Crear análisis basado en heurísticas simples si falla el parseo de la IA
      const lowerContent = content.toLowerCase()
      const suspiciousWords = ["urgente", "secreto", "milagroso", "cura", "oculto", "médicos odian", "descubren"]
      const hasSuspiciousWords = suspiciousWords.some((word) => lowerContent.includes(word))

      const verifiedWords = ["estudio", "investigación", "universidad", "revista", "según", "datos"]
      const hasVerifiedWords = verifiedWords.some((word) => lowerContent.includes(word))

      let score = 50
      let status: "verified" | "suspicious" | "fake" = "suspicious"

      if (hasSuspiciousWords) {
        score = 20
        status = "fake"
      } else if (hasVerifiedWords) {
        score = 75
        status = "verified"
      }

      analysisResult = {
        credibilityScore: score,
        status: status,
        sources: [
          {
            name: "Análisis heurístico",
            status: status,
            // Si hay una URL proporcionada por el usuario, la usamos aquí en el fallback
            url: providedUrl || "https://nofake.com/heuristic-analysis",
          },
        ],
        analysis: {
          sentiment: "neutral",
          biasScore: hasSuspiciousWords ? 80 : 30,
          factualClaims: Math.ceil(content.split(".").length / 2),
          verifiedClaims: hasVerifiedWords ? Math.ceil(content.split(".").length / 3) : 0,
          reasoning: hasSuspiciousWords
            ? "El texto contiene palabras típicas de contenido sensacionalista o falso."
            : hasVerifiedWords
              ? "El texto menciona fuentes académicas o de investigación."
              : "Análisis básico realizado debido a un error en el procesamiento avanzado de la IA.",
        },
        warnings: hasSuspiciousWords ? ["Contiene lenguaje sensacionalista", "Posible desinformación"] : [],
      }
    }

    return NextResponse.json(analysisResult)
  } catch (error) {
    console.error("Error en la verificación de credibilidad:", error)
    return NextResponse.json({ error: "Error interno del servidor al procesar la solicitud." }, { status: 500 })
  }
}
