import { describe, expect, it } from 'vitest'
import type { Scenario } from '../components/ScenariosPanel'
import { defaultForm } from './form'
import { EXPORT_FORMAT, exportScenarios, mergeScenarios, parseImport, parseScenario } from './scenarios'

const form = defaultForm()
const a: Scenario = { id: 'a', name: 'A', form }
const b: Scenario = { id: 'b', name: 'B', form: { ...form, years: '30' } }

describe('parseScenario', () => {
  const ok = { id: 'x', name: '  Aposentadoria ', form }

  it('aceita um cenário válido, apara o nome e descarta campos extras', () => {
    expect(parseScenario({ ...ok, form: { ...ok.form, extra: 'y' } })).toEqual({ ...ok, name: 'Aposentadoria' })
  })

  it.each([
    ['sem id', { ...ok, id: '' }],
    ['nome vazio', { ...ok, name: '   ' }],
    ['nome longo', { ...ok, name: 'n'.repeat(41) }],
    ['campo faltando', { ...ok, form: { ...ok.form, rate: undefined } }],
    ['campo numérico', { ...ok, form: { ...ok.form, years: 10 } }],
    ['não objeto', 'abc'],
  ])('recusa %s', (_, body) => {
    expect(parseScenario(body)).toBeNull()
  })
})

describe('exportScenarios / parseImport', () => {
  it('ida e volta preserva os cenários', () => {
    const text = exportScenarios([a, b], new Date('2026-10-14T12:00:00Z'))
    expect(JSON.parse(text)).toMatchObject({ format: EXPORT_FORMAT, version: 1, exportedAt: '2026-10-14T12:00:00.000Z' })
    expect(parseImport(text)).toEqual({ scenarios: [a, b], skipped: 0 })
  })

  it('aceita uma lista simples e ignora itens inválidos', () => {
    expect(parseImport(JSON.stringify([a, { id: 'z' }]))).toEqual({ scenarios: [a], skipped: 1 })
  })

  it.each([['texto qualquer'], ['{"foo": 1}'], ['null']])('recusa %s', (text) => {
    expect(parseImport(text)).toBeNull()
  })
})

describe('mergeScenarios', () => {
  it('substitui pelo id sem mudar a posição e acrescenta os novos', () => {
    const a2 = { ...a, name: 'A2' }
    expect(mergeScenarios([a, b], [a2, { ...b, id: 'c' }])).toEqual({
      list: [a2, b, { ...b, id: 'c' }],
      added: 1,
      replaced: 1,
    })
  })
})
