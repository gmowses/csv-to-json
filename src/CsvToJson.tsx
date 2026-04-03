import { useState, useEffect, useMemo } from 'react'
import { Copy, Check, Sun, Moon, Languages, ArrowLeftRight, Table } from 'lucide-react'

// ── i18n ─────────────────────────────────────────────────────────────────────
const translations = {
  en: {
    title: 'CSV to JSON',
    subtitle: 'Convert CSV to JSON and JSON to CSV. Auto-detect delimiter. Live table preview. Client-side only.',
    mode: 'Conversion Mode',
    csvToJson: 'CSV to JSON',
    jsonToCsv: 'JSON to CSV',
    input: 'Input',
    inputCsvDesc: 'Paste your CSV data here',
    inputJsonDesc: 'Paste a JSON array here',
    output: 'Output',
    preview: 'Table Preview',
    previewDesc: 'First 20 rows',
    copy: 'Copy',
    copied: 'Copied!',
    clear: 'Clear',
    delimiter: 'Delimiter',
    comma: 'Comma (,)',
    semicolon: 'Semicolon (;)',
    tab: 'Tab',
    auto: 'Auto-detect',
    rows: 'rows',
    cols: 'columns',
    error: 'Parse error',
    builtBy: 'Built by',
    csvPlaceholder: 'name,age,city\nAlice,30,New York\nBob,25,London',
    jsonPlaceholder: '[{"name":"Alice","age":30},{"name":"Bob","age":25}]',
  },
  pt: {
    title: 'CSV para JSON',
    subtitle: 'Converta CSV para JSON e JSON para CSV. Auto-deteccao de delimitador. Preview em tabela. Tudo no navegador.',
    mode: 'Modo de Conversao',
    csvToJson: 'CSV para JSON',
    jsonToCsv: 'JSON para CSV',
    input: 'Entrada',
    inputCsvDesc: 'Cole seus dados CSV aqui',
    inputJsonDesc: 'Cole um array JSON aqui',
    output: 'Saida',
    preview: 'Preview em Tabela',
    previewDesc: 'Primeiras 20 linhas',
    copy: 'Copiar',
    copied: 'Copiado!',
    clear: 'Limpar',
    delimiter: 'Delimitador',
    comma: 'Virgula (,)',
    semicolon: 'Ponto e virgula (;)',
    tab: 'Tab',
    auto: 'Auto-detectar',
    rows: 'linhas',
    cols: 'colunas',
    error: 'Erro de parse',
    builtBy: 'Criado por',
    csvPlaceholder: 'nome,idade,cidade\nAlice,30,Sao Paulo\nBob,25,Rio de Janeiro',
    jsonPlaceholder: '[{"nome":"Alice","idade":30},{"nome":"Bob","idade":25}]',
  }
} as const
type Lang = keyof typeof translations

type DelimiterOption = 'auto' | ',' | ';' | '\t'

function detectDelimiter(csv: string): string {
  const firstLine = csv.split('\n')[0]
  const counts = {
    ',': (firstLine.match(/,/g) || []).length,
    ';': (firstLine.match(/;/g) || []).length,
    '\t': (firstLine.match(/\t/g) || []).length,
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}

function csvParse(csv: string, delim: string): { headers: string[]; rows: string[][] } {
  const lines = csv.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (!lines.length) return { headers: [], rows: [] }

  const parseRow = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === delim && !inQuotes) {
        result.push(current.trim()); current = ''
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseRow(lines[0])
  const rows = lines.slice(1).map(parseRow)
  return { headers, rows }
}

function csvToJsonArr(csv: string, delim: string): object[] {
  const { headers, rows } = csvParse(csv, delim)
  return rows.map(row => {
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = row[i] ?? '' })
    return obj
  })
}

function jsonToCsvStr(json: object[], delim: string): string {
  if (!json.length) return ''
  const headers = Object.keys(json[0])
  const escapeCell = (v: unknown) => {
    const str = String(v ?? '')
    return str.includes(delim) || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str
  }
  const rows = json.map(obj => headers.map(h => escapeCell((obj as Record<string, unknown>)[h])).join(delim))
  return [headers.join(delim), ...rows].join('\n')
}

const CSV_DEMO = `name,age,city,email,active
Alice,30,New York,alice@example.com,true
Bob,25,London,bob@example.com,false
Carol,35,Paris,carol@example.com,true
Dave,28,Tokyo,dave@example.com,true`

export default function CsvToJson() {
  const [lang, setLang] = useState<Lang>(() => navigator.language.startsWith('pt') ? 'pt' : 'en')
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [mode, setMode] = useState<'csv2json' | 'json2csv'>('csv2json')
  const [input, setInput] = useState(CSV_DEMO)
  const [delimOpt, setDelimOpt] = useState<DelimiterOption>('auto')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const t = translations[lang]
  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])

  const delim = delimOpt === 'auto' ? detectDelimiter(input) : delimOpt

  const { output, tableHeaders, tableRows } = useMemo(() => {
    setError('')
    if (!input.trim()) return { output: '', tableHeaders: [], tableRows: [] }

    if (mode === 'csv2json') {
      try {
        const arr = csvToJsonArr(input, delim)
        const headers = arr.length ? Object.keys(arr[0]) : []
        const rows = arr.map(obj => headers.map(h => String((obj as Record<string, unknown>)[h] ?? '')))
        return {
          output: JSON.stringify(arr, null, 2),
          tableHeaders: headers,
          tableRows: rows.slice(0, 20),
        }
      } catch (e) {
        setError(String(e))
        return { output: '', tableHeaders: [], tableRows: [] }
      }
    } else {
      try {
        const arr = JSON.parse(input) as object[]
        if (!Array.isArray(arr)) throw new Error('Expected JSON array')
        const csv = jsonToCsvStr(arr, delim)
        const headers = arr.length ? Object.keys(arr[0]) : []
        const rows = arr.map(obj => headers.map(h => String((obj as Record<string, unknown>)[h] ?? '')))
        return {
          output: csv,
          tableHeaders: headers,
          tableRows: rows.slice(0, 20),
        }
      } catch (e) {
        setError(String(e))
        return { output: '', tableHeaders: [], tableRows: [] }
      }
    }
  }, [input, mode, delim])

  const copy = () => {
    navigator.clipboard.writeText(output).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const switchMode = () => {
    setMode(m => m === 'csv2json' ? 'json2csv' : 'csv2json')
    setInput(output)
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <Table size={18} className="text-white" />
            </div>
            <span className="font-semibold">CSV to JSON</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(l => l === 'en' ? 'pt' : 'en')} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <Languages size={14} />{lang.toUpperCase()}
            </button>
            <button onClick={() => setDark(d => !d)} className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <a href="https://github.com/gmowses/csv-to-json" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
              <button onClick={() => setMode('csv2json')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === 'csv2json' ? 'bg-green-500 text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
                {t.csvToJson}
              </button>
              <button onClick={() => setMode('json2csv')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === 'json2csv' ? 'bg-green-500 text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
                {t.jsonToCsv}
              </button>
            </div>
            <button onClick={switchMode} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <ArrowLeftRight size={12} /> Swap
            </button>
            {mode === 'csv2json' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">{t.delimiter}:</span>
                <select
                  value={delimOpt}
                  onChange={e => setDelimOpt(e.target.value as DelimiterOption)}
                  className="text-xs border border-zinc-200 dark:border-zinc-700 rounded-md px-2 py-1 bg-white dark:bg-zinc-900 focus:outline-none"
                >
                  <option value="auto">{t.auto}</option>
                  <option value=",">{t.comma}</option>
                  <option value=";">{t.semicolon}</option>
                  <option value={'\t'}>{t.tab}</option>
                </select>
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Input */}
            <div className="flex flex-col rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <span className="text-xs font-medium text-zinc-500">{t.input} — {mode === 'csv2json' ? 'CSV' : 'JSON'}</span>
                <button onClick={() => setInput('')} className="text-xs text-zinc-400 hover:text-red-500 transition-colors">{t.clear}</button>
              </div>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={mode === 'csv2json' ? t.csvPlaceholder : t.jsonPlaceholder}
                className="flex-1 resize-none font-mono text-sm p-4 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none min-h-[350px]"
                spellCheck={false}
              />
            </div>

            {/* Output */}
            <div className="flex flex-col rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <span className="text-xs font-medium text-zinc-500">{t.output} — {mode === 'csv2json' ? 'JSON' : 'CSV'}</span>
                <button onClick={copy} className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400 hover:text-green-700 transition-colors">
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? t.copied : t.copy}
                </button>
              </div>
              {error ? (
                <div className="flex-1 p-4 text-xs text-red-500 font-mono">{t.error}: {error}</div>
              ) : (
                <pre className="flex-1 p-4 font-mono text-sm overflow-auto bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 min-h-[350px] whitespace-pre-wrap">{output || <span className="text-zinc-400 italic">Output will appear here...</span>}</pre>
              )}
            </div>
          </div>

          {/* Table preview */}
          {tableHeaders.length > 0 && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{t.preview}</h2>
                <span className="text-xs text-zinc-400">{tableRows.length} {t.rows} · {tableHeaders.length} {t.cols}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-700">
                      {tableHeaders.map(h => (
                        <th key={h} className="text-left px-3 py-2 font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row, i) => (
                      <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-2 text-zinc-700 dark:text-zinc-300 font-mono whitespace-nowrap max-w-[200px] truncate">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-zinc-400">
          <span>{t.builtBy} <a href="https://github.com/gmowses" className="text-zinc-600 dark:text-zinc-300 hover:text-green-500 transition-colors">Gabriel Mowses</a></span>
          <span>MIT License</span>
        </div>
      </footer>
    </div>
  )
}
