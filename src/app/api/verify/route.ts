import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

// Inicializar Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)

// Palabras clave que indican contenido sospechoso
const SUSPICIOUS_KEYWORDS = [
  "URGENTE",
  "EXCLUSIVO",
  "BOMBAZO",
  "INCREÍBLE",
  "NO CREERÁS",
  "MÉDICOS ODIAN",
  "GOBIERNO OCULTA",
  "CONSPIRACIÓN",
  "SECRETO",
  "MILAGRO",
  "CURA DEFINITIVA",
  "ÉLITE",
  "ILLUMINATI",
]

// Función para analizar texto con patrones
function analyzeTextPatterns(text: string) {
  const suspiciousCount = SUSPICIOUS_KEYWORDS.filter((keyword) => text.toUpperCase().includes(keyword)).length

  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length
  const exclamationCount = (text.match(/!/g) || []).length
  const questionCount = (text.match(/\?/g) || []).length

  let score = 70 // Score base

  // Penalizar por palabras sospechosas
  score -= suspiciousCount * 15

  // Penalizar por exceso de mayúsculas
  if (capsRatio > 0.1) score -= 20

  // Penalizar por exceso de signos de exclamación
  if (exclamationCount > 5) score -= 10

  // Penalizar por exceso de preguntas retóricas
  if (questionCount > 3) score -= 5

  return Math.max(0, Math.min(100, score))
}

// Función mejorada para analizar con IA que maneja errores
async function analyzeWithAI(text: string) {
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.warn("API key de Google AI no configurada, usando análisis básico")
      return getBasicAnalysis(text)
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `
Analiza el siguiente contenido de noticias y determina su credibilidad.

Contenido: ${text.substring(0, 1500)}

Evalúa:
1. Credibilidad general (0-100)
2. Nivel de sesgo (0-100, donde 0 es neutral)
3. Sentimiento (positive/negative/neutral)
4. Número de afirmaciones factuales
5. Advertencias específicas

Responde SOLO en formato JSON válido:
{
  "credibilityScore": 75,
  "status": "verified",
  "biasScore": 20,
  "sentiment": "neutral",
  "factualClaims": 8,
  "verifiedClaims": 6,
  "warnings": ["ejemplo de advertencia"],
  "reasoning": "breve explicación"
}
`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const textResponse = response.text()

    // Limpiar y parsear JSON
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn("Respuesta de IA inválida, usando análisis básico")
      return getBasicAnalysis(text)
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Validar estructura de respuesta
    if (typeof parsed.credibilityScore !== "number") {
      throw new Error("Respuesta de IA malformada")
    }

    return parsed
  } catch (error) {
    console.error("Error en análisis de IA:", error)
    return getBasicAnalysis(text)
  }
}

// Función de análisis básico como fallback
function getBasicAnalysis(text: string) {
  const patternScore = analyzeTextPatterns(text)

  return {
    credibilityScore: patternScore,
    status: patternScore > 60 ? "verified" : patternScore > 30 ? "suspicious" : "fake",
    biasScore: 30,
    sentiment: "neutral",
    factualClaims: Math.floor(text.split(".").length / 2),
    verifiedClaims: Math.floor(text.split(".").length / 3),
    warnings: ["Análisis básico - IA no disponible"],
    reasoning: "Análisis basado únicamente en patrones de texto locales",
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()

    if (!content) {
      return NextResponse.json({ error: "El contenido es requerido" }, { status: 400 })
    }

    // Análisis con IA
    const aiAnalysis = await analyzeWithAI(content)

    // Análisis de patrones locales
    const patternScore = analyzeTextPatterns(content)

    // Combinar scores
    const finalScore = Math.round((aiAnalysis.credibilityScore + patternScore) / 2)

    // Determinar status final
    let finalStatus = "unknown"
    if (finalScore >= 70) finalStatus = "verified"
    else if (finalScore <= 40) finalStatus = "fake"
    else finalStatus = "suspicious"

    // Generar fuentes mock basadas en el análisis
    const sources = [
      {
        name: "Snopes",
        status: finalScore > 60 ? "verified" : "disputed",
        url: `https://snopes.com/search/?q=${encodeURIComponent(content.substring(0, 50))}`,
      },
      {
        name: "FactCheck.org",
        status: finalScore > 50 ? "fact-checked" : "disputed",
        url: `https://factcheck.org/search/?q=${encodeURIComponent(content.substring(0, 50))}`,
      },
      {
        name: "PolitiFact",
        status: finalScore > 55 ? "verified" : "needs-verification",
        url: `https://politifact.com/search/?q=${encodeURIComponent(content.substring(0, 50))}`,
      },
    ]

    // Compilar warnings
    const warnings = [...aiAnalysis.warnings]
    if (patternScore < 40) {
      warnings.push("Patrones de texto sospechosos detectados")
    }

    const result = {
      credibilityScore: finalScore,
      status: finalStatus,
      sources,
      analysis: {
        sentiment: aiAnalysis.sentiment,
        biasScore: aiAnalysis.biasScore,
        factualClaims: aiAnalysis.factualClaims,
        verifiedClaims: aiAnalysis.verifiedClaims,
        reasoning: aiAnalysis.reasoning,
      },
      warnings,
      processingTime: Date.now(),
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error en verificación:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}