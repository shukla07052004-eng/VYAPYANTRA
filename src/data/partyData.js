import { loadErpState } from './store.js'

export const partyData = loadErpState().parties

export const createPartyRecord = (party) => ({
  id: Date.now(),
  balance: 0,
  drCr: '',
  ...party,
})
