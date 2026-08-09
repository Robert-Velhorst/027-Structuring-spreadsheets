import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const capabilities = {
  version: '3.0.0', mode: 'local', operations: [
    { type: 'smart_trim', risk: 'LOW' },
    { type: 'remove_duplicates', risk: 'MEDIUM' },
  ], maxCells: 250000, maxUploadMb: 25, previewTtlSeconds: 600,
  hai: { configured: true, mutationsEnabled: false }, externalTransmission: false,
}

const document = {
  id: 'document-1', name: 'customers.csv', mediaType: 'text/csv', rows: 3, columns: 2,
  versionHash: '0123456789abcdef', createdAt: '2026-08-09T00:00:00Z', updatedAt: '2026-08-09T00:00:00Z',
  window: { row: 1, column: 1, rows: [['Name', 'Email'], [' Ada ', 'ada@example.com'], ['Ada', 'ada@example.com']], sheet: 'CSV', range: 'A1:B3', totalRows: 3, totalColumns: 2, truncated: false },
  quality: { score: 67, confidence: 'HIGH', totalCells: 6, emptyCells: 0, whitespaceIssues: 1, duplicateRows: 1, mixedTypeColumns: 0 },
}

const emptyHistory = { items: [], page: 1, pageSize: 20, total: 0, pages: 1, statusCounts: {} }

function ok(data: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify({ ok: true, data }), { status, headers: { 'Content-Type': 'application/json' } }))
}

function memoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => { values.delete(key) },
    setItem: (key, value) => { values.set(key, String(value)) },
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
  vi.stubGlobal('sessionStorage', memoryStorage())
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Sheet Shaper workspace', () => {
  it('completes the review-gated preview and apply flow', async () => {
    let applied = false
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/capabilities')) return ok(capabilities)
      if (url.endsWith('/api/v1/documents')) return ok([document])
      if (url.includes('/api/v1/documents/document-1/preview')) return ok({
        previewToken: 'preview-1', expiresAt: '2026-08-09T01:00:00Z', target: 'CSV!A1:B3',
        summary: { changedCells: 3, beforeRows: 3, beforeColumns: 2, afterRows: 2, afterColumns: 2, risk: 'MEDIUM', beforeQuality: document.quality, afterQuality: { ...document.quality, score: 100 } },
        examples: [{ row: 2, column: 1, before: ' Ada ', after: 'Ada' }], warnings: [],
      })
      if (url.includes('/api/v1/documents/document-1/apply')) {
        applied = true
        expect(init?.method).toBe('POST')
        expect(String(init?.body)).toContain('"acknowledged":true')
        return ok({ id: 'operation-1', documentId: document.id, documentName: document.name, status: 'APPLIED', summary: { changedCells: 3 }, validation: { passed: true }, canRestore: true, createdAt: document.createdAt, updatedAt: document.updatedAt })
      }
      if (url.includes('/api/v1/documents/document-1?')) return ok(applied ? { ...document, rows: 2, quality: { ...document.quality, score: 100 } } : document)
      if (url.includes('/api/v1/history')) return ok(applied ? { ...emptyHistory, total: 1, items: [{ id: 'operation-1', documentId: document.id, documentName: document.name, status: 'APPLIED', summary: { changedCells: 3 }, validation: { passed: true }, canRestore: true, createdAt: document.createdAt, updatedAt: document.updatedAt }] } : emptyHistory)
      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByLabelText('Spreadsheet data viewport')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Create preview' })[0])
    expect(await screen.findByText('Changes detected: 3')).toBeInTheDocument()
    await user.click(screen.getByLabelText('I reviewed the target and preview.'))
    await user.click(screen.getByRole('button', { name: 'Apply once' }))
    await waitFor(() => expect(fetchMock.mock.calls.some(call => String(call[0]).includes('/apply'))).toBe(true))
    expect((await screen.findAllByText('100')).length).toBeGreaterThan(0)
  })

  it('shows a safe disconnected state without inventing data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    render(<App />)
    expect(await screen.findByText('SERVICE_UNAVAILABLE')).toBeInTheDocument()
    expect(screen.getByText('Structure data without losing control')).toBeInTheDocument()
    expect(screen.queryByText('Connected', { exact: true })).not.toBeInTheDocument()
  })
})
