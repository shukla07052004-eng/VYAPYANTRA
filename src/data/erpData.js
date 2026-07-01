import { buildNormalizedErpData, getRuntimeErpState } from './dataManager.js'

export const getErpData = () => buildNormalizedErpData(getRuntimeErpState())

const erpData = getErpData()

export default erpData
