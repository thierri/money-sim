import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { defaultForm } from '../src/lib/form'
import { parseScenario } from './api'
import { openScenariosDb, type ScenariosDb } from './scenarios-db'

describe('openScenariosDb', () => {
  let db: ScenariosDb
  beforeEach(() => {
    db = openScenariosDb(':memory:')
  })
  afterEach(() => db.close())

  it('grava, lista na ordem de criação e exclui', () => {
    const form = defaultForm()
    db.save({ id: 'a', name: 'Primeiro', form })
    db.save({ id: 'b', name: 'Segundo', form: { ...form, years: '30' } })
    expect(db.list()).toEqual([
      { id: 'a', name: 'Primeiro', form },
      { id: 'b', name: 'Segundo', form: { ...form, years: '30' } },
    ])
    expect(db.remove('a')).toBe(true)
    expect(db.remove('a')).toBe(false)
    expect(db.list().map((s) => s.id)).toEqual(['b'])
  })

  it('substitui pelo id sem mudar a posição', () => {
    const form = defaultForm()
    db.save({ id: 'a', name: 'A', form })
    db.save({ id: 'b', name: 'B', form })
    db.save({ id: 'a', name: 'A2', form })
    expect(db.list().map((s) => s.name)).toEqual(['A2', 'B'])
  })
})

describe('parseScenario', () => {
  const ok = { id: 'x', name: '  Aposentadoria ', form: defaultForm() }

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
