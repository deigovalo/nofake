"use client"

import { useState } from "react"
import { Shield, CheckCircle, AlertTriangle, XCircle, Clock, Loader2, FileText, Brain, BookOpen, Copy, ExternalLink, Search, Lightbulb } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

interface AnalysisResult {
  credibilityScore: number
  status: "verified" | "suspicious" | "fake"
  sources: Array<{
    name: string
    status: string
    url: string
  }>
  analysis: {
    sentiment: string
    biasScore: number
    factualClaims: number
    verifiedClaims: number
    reasoning: string
  }
  warnings: string[]
}

interface Citation {
  authors: string[]
  title: string
  journal: string
  year: number
  doi: string
  url: string
  abstract: string
  type: string
  formatted: string
  relevance?: string
  keyFindings?: string[]
}

interface CitationsResult {
  citations: Citation[]
  format: string
  topic: string
  analyzedText: string
  searchQuery: string
  generatedAt: string
}

// Ejemplos de texto para testing
const EXAMPLE_TEXTS = [
  "El gobierno anunció nuevas medidas económicas para combatir la inflación. Según el ministro de economía, estas políticas buscan estabilizar los precios.",
  "URGENTE: Descubren cura milagrosa que los médicos no quieren que sepas. Este secreto ha sido ocultado por años.",
  "Estudio científico revela nuevos datos sobre el cambio climático. La investigación fue publicada en la revista Nature.",
]

export default function NoFake() {
  const [inputValue, setInputValue] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Estados para citas
  const [showCitations, setShowCitations] = useState(false)
  const [isLoadingCitations, setIsLoadingCitations] = useState(false)
  const [citations, setCitations] = useState<CitationsResult | null>(null)
  const [citationFormat, setCitationFormat] = useState<"apa7" | "ieee">("apa7")
  const [citationError, setCitationError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!inputValue.trim()) return

    setIsAnalyzing(true)
    setError(null)
    setAnalysisResult(null)
    setShowCitations(false)
    setCitations(null)

    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: inputValue.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error en la verificación")
      }

      const result = await response.json()
      setAnalysisResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSearchCitations = async () => {
    if (!analysisResult || !inputValue.trim()) return

    setIsLoadingCitations(true)
    setCitationError(null)

    try {
      // Extraer tema principal del texto para buscar citas
      const topic = inputValue.trim().substring(0, 100)

      const response = await fetch("/api/citations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          format: citationFormat,
          analyzedText: inputValue.trim(), // Enviar el texto completo para análisis
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al buscar citas")
      }

      const result = await response.json()
      setCitations(result)
      setShowCitations(true)
    } catch (err) {
      setCitationError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsLoadingCitations(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
      case "fact-checked":
        return "text-green-600"
      case "suspicious":
      case "disputed":
        return "text-yellow-600"
      case "fake":
      case "unreliable":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
      case "fact-checked":
        return <CheckCircle className="w-4 h-4" />
      case "suspicious":
      case "disputed":
        return <AlertTriangle className="w-4 h-4" />
      case "fake":
      case "unreliable":
        return <XCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600"
    if (score >= 40) return "text-yellow-600"
    return "text-red-600"
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-100 text-green-800">Contenido Verificado</Badge>
      case "suspicious":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Contenido Sospechoso
          </Badge>
        )
      case "fake":
        return <Badge variant="destructive">Contenido Falso</Badge>
      default:
        return <Badge variant="outline">Estado Desconocido</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Shield className="w-8 h-8 text-purple-600" />
              <span className="text-xl font-bold text-gray-900">NoFake</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-gray-700 hover:text-purple-600">
                Inicio
              </a>
              <a href="#" className="text-gray-700 hover:text-purple-600">
                Cómo Funciona
              </a>
              <a href="#" className="text-gray-700 hover:text-purple-600">
                Estadísticas
              </a>
              <a href="#" className="text-gray-700 hover:text-purple-600">
                API
              </a>
            </nav>
            <Button variant="outline">Iniciar Sesión</Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            <span className="text-purple-600">NoFake</span>
            <br />
            Verificador de Contenido
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Utiliza inteligencia artificial verificar contenido y encontrar informacion relacionada.
          </p>

          {/* Main Analysis Tool */}
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Verificar Contenido
              </CardTitle>
              <CardDescription>Escribe o pega el texto que quieres verificar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Pega aquí el texto del tweet o noticia que quieres verificar..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                rows={6}
                className="resize-none"
              />

              <Button onClick={handleAnalyze} disabled={!inputValue.trim() || isAnalyzing} className="w-full" size="lg">
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analizando...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Verificar Contenido
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Agregar ejemplos de texto para testing */}
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600 mb-2">Prueba con estos ejemplos:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {EXAMPLE_TEXTS.map((text, index) => (
                <Button key={index} variant="outline" size="sm" onClick={() => setInputValue(text)} className="text-xs">
                  Ejemplo {index + 1}
                </Button>
              ))}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert className="max-w-2xl mx-auto mt-4" variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Analysis Results */}
          {analysisResult && (
            <Card className="max-w-4xl mx-auto mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Resultado del Análisis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Credibility Score */}
                <div className="text-center">
                  <div className={`text-3xl font-bold mb-2 ${getScoreColor(analysisResult.credibilityScore)}`}>
                    {analysisResult.credibilityScore}%
                  </div>
                  <Progress value={analysisResult.credibilityScore} className="w-full max-w-md mx-auto" />
                  <p className="text-sm text-gray-600 mt-2">Puntuación de Credibilidad</p>
                </div>

                {/* Status Badge */}
                <div className="flex justify-center">{getStatusBadge(analysisResult.status)}</div>

                {/* Botón de Buscar Citas - Solo si está verificado */}
                {analysisResult.status === "verified" && (
                  <div className="text-center">
                    <Separator className="my-4" />
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-4">
                        <Select
                          value={citationFormat}
                          onValueChange={(value: "apa7" | "ieee") => setCitationFormat(value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="apa7">APA 7</SelectItem>
                            <SelectItem value="ieee">IEEE</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={handleSearchCitations}
                          disabled={isLoadingCitations}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          {isLoadingCitations ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Buscando...
                            </>
                          ) : (
                            <>
                              <Search className="w-4 h-4" />
                              Buscar Literatura Académica
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600">
                        Encuentra investigación académica específicamente relacionada con este contenido
                      </p>
                    </div>
                  </div>
                )}

                {/* Analysis Details */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Análisis Detallado</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Sesgo Detectado:</span>
                        <span>{analysisResult.analysis?.biasScore || 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Afirmaciones Totales:</span>
                        <span>{analysisResult.analysis?.factualClaims || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Afirmaciones Verificadas:</span>
                        <span className="text-green-600">{analysisResult.analysis?.verifiedClaims || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sentimiento:</span>
                        <span className="capitalize">{analysisResult.analysis?.sentiment || "neutral"}</span>
                      </div>
                    </div>
                    {analysisResult.analysis?.reasoning && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <strong>Razonamiento:</strong> {analysisResult.analysis.reasoning}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Posible(s) Fuente de origen</h4>
                    <div className="space-y-2">
                      {analysisResult.sources && analysisResult.sources.length > 0 ? (
                        analysisResult.sources.map((source, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className={getStatusColor(source.status)}>{getStatusIcon(source.status)}</span>
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline text-blue-600"
                              >
                                {source.name}
                              </a>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No se encontraron fuentes específicas</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Warnings */}
                {analysisResult.warnings && analysisResult.warnings.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1">
                        {analysisResult.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Citation Error */}
          {citationError && (
            <Alert className="max-w-4xl mx-auto mt-4" variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{citationError}</AlertDescription>
            </Alert>
          )}

          {/* Citations Results */}
          {showCitations && citations && (
            <Card className="max-w-4xl mx-auto mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  Literatura Académica Relacionada - Formato {citations.format.toUpperCase()}
                </CardTitle>
                <CardDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <Search className="w-4 h-4" />
                    <span>Búsqueda: {citations.searchQuery || "Búsqueda relacionada"}</span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {citations.citations && citations.citations.length > 0 ? (
                  citations.citations.map((citation, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm mb-2">{citation.title || "Título no disponible"}</h4>
                          <p className="text-xs text-gray-600 mb-2">
                            {citation.authors && citation.authors.length > 0
                              ? citation.authors.join(", ")
                              : "Autores no disponibles"}{" "}
                            ({citation.year || "Año no disponible"})
                          </p>
                          <p className="text-xs text-gray-500 mb-3">
                            {citation.abstract || "Resumen no disponible"}
                          </p>

                          {/* Relevancia específica */}
                          {citation.relevance && (
                            <div className="mb-3 p-2 bg-blue-50 rounded">
                              <div className="flex items-center gap-1 mb-1">
                                <Lightbulb className="w-3 h-3 text-blue-600" />
                                <span className="text-xs font-medium text-blue-800">
                                  Relevancia para el texto analizado:
                                </span>
                              </div>
                              <p className="text-xs text-blue-700">{citation.relevance}</p>
                            </div>
                          )}

                          {/* Hallazgos clave */}
                          {citation.keyFindings && citation.keyFindings.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-gray-700 mb-1">Hallazgos clave:</p>
                              <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
                                {citation.keyFindings.map((finding, idx) => (
                                  <li key={idx}>{finding}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                            {citation.formatted || "Formato de cita no disponible"}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(citation.formatted || "")}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          {citation.url && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={citation.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500">No se encontraron citas académicas</p>
                )}

                <div className="text-center pt-4">
                  <p className="text-xs text-gray-500">
                    Literatura académica generada el {new Date(citations.generatedAt).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">¿Cómo Funciona NoFake?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Nuestra IA analiza múltiples factores para determinar la veracidad del contenido
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle>Análisis de Texto</CardTitle>
                <CardDescription>
                  Analizamos el lenguaje, tono y estructura del contenido para detectar patrones sospechosos.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>Detección de Sesgo</CardTitle>
                <CardDescription>
                  Identificamos patrones de lenguaje sesgado y analizamos la objetividad del contenido presentado.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>Literatura Académica</CardTitle>
                <CardDescription>
                  Para contenido verificado, buscamos investigación académica específicamente relacionada con el tema
                  analizado.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Shield className="w-6 h-6" />
                <span className="text-lg font-bold">NoFake</span>
              </div>
              <p className="text-gray-400">Combatiendo la desinformación con tecnología de vanguardia.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Producto</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white">
                    API
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Recursos</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white">
                    Documentación
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white">
                    Acerca de
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 NoFake. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
