import { apiRequest } from './client'
import type { SimulationResult, SimulatorScenario } from './types'

export function getSimulatorScenarios() {
  return apiRequest<SimulatorScenario[]>('/api/simulator/scenarios')
}

export function runSimulatorScenario(scenario: string) {
  return apiRequest<SimulationResult>(`/api/simulator/scenarios/${scenario}`, {
    method: 'POST',
  })
}
