import { INIT_PARTIES } from './store.js'

export const partyData = INIT_PARTIES

export const createPartyRecord = (party) => ({
  id: Date.now(),
  balance: 0,
  drCr: '',
  ...party,
})
