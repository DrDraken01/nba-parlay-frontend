'use client'

import { useState, useCallback } from 'react'

// Use environment variable for API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface AnalysisResult {
  player: string
  stat_type: string
  line: number
  bet_type: string
  season_avg: number
  season_std: number
  recent_avg: number
  probability: number
  edge: number
  recommendation: string
  confidence_80?: [number, number]
  usage?: {
    remaining: number
    total_limit: number
  }
}

export default function Home() {
  const [player, setPlayer] = useState('')
  const [statType, setStatType] = useState('points')
  const [line, setLine] = useState('')
  const [betType, setBetType] = useState('over')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const analyze = useCallback(async () => {
    if (!player.trim()) {
      setError('Please enter a player name')
      return
    }
    
    if (!line || parseFloat(line) <= 0) {
      setError('Please enter a valid line')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch(`${API_URL}/api/analyze-leg`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player: player.trim(),
          stat_type: statType,
          line: parseFloat(line),
          bet_type: betType
        })
      })

      if (response.status === 429) {
        const data = await response.json()
        setError(data.detail?.message || 'Rate limit reached. Please try again later.')
        return
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail?.error || errorData.detail || 'Analysis failed')
      }
      
      const data = await response.json()
      setResult(data)
    } catch (err) {
      const error = err as Error
      if (error.message.includes('fetch')) {
        setError('Unable to connect to server. Please try again.')
      } else {
        setError(error.message || 'Failed to analyze. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }, [player, statType, line, betType])

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-blue-500/10" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <div className="text-center mb-12 md:mb-16">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black mb-4 bg-gradient-to-r from-orange-400 via-red-500 to-blue-500 bg-clip-text text-transparent">
              PARLAY ANALYZER
            </h1>
            <p className="text-lg md:text-xl text-gray-400 font-light">
              Real stats. Real probabilities. No BS.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl md:rounded-3xl border border-zinc-800 overflow-hidden">
              <div className="p-6 md:p-8 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
                    Player
                  </label>
                  <input
                    type="text"
                    value={player}
                    onChange={(e) => setPlayer(e.target.value)}
                    placeholder="LeBron James"
                    disabled={loading}
                    className="w-full px-4 md:px-6 py-3 md:py-4 bg-black border-2 border-zinc-800 rounded-xl text-white text-base md:text-lg placeholder-gray-600 focus:border-orange-500 focus:outline-none transition-all disabled:opacity-50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
                      Stat
                    </label>
                    <select
                      value={statType}
                      onChange={(e) => setStatType(e.target.value)}
                      disabled={loading}
                      className="w-full px-4 md:px-6 py-3 md:py-4 bg-black border-2 border-zinc-800 rounded-xl text-white focus:border-orange-500 focus:outline-none transition-all disabled:opacity-50"
                    >
                      <option value="points">PTS</option>
                      <option value="assists">AST</option>
                      <option value="rebounds">REB</option>
                      <option value="points_assists">PTS+AST</option>
                      <option value="points_rebounds_assists">PRA</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
                      Line
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={line}
                      onChange={(e) => setLine(e.target.value)}
                      placeholder="25.5"
                      disabled={loading}
                      className="w-full px-4 md:px-6 py-3 md:py-4 bg-black border-2 border-zinc-800 rounded-xl text-white text-base md:text-lg placeholder-gray-600 focus:border-orange-500 focus:outline-none transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
                    Direction
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setBetType('over')}
                      disabled={loading}
                      className={`py-3 md:py-4 rounded-xl font-bold text-base md:text-lg transition-all disabled:opacity-50 ${
                        betType === 'over'
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                          : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                      }`}
                    >
                      OVER
                    </button>
                    <button
                      onClick={() => setBetType('under')}
                      disabled={loading}
                      className={`py-3 md:py-4 rounded-xl font-bold text-base md:text-lg transition-all disabled:opacity-50 ${
                        betType === 'under'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                          : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                      }`}
                    >
                      UNDER
                    </button>
                  </div>
                </div>

                <button
                  onClick={analyze}
                  disabled={loading || !player.trim() || !line}
                  className="w-full py-4 md:py-5 bg-gradient-to-r from-orange-500 via-red-500 to-blue-500 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-lg md:text-xl rounded-xl transition-all shadow-lg shadow-orange-500/20"
                >
                  {loading ? 'ANALYZING...' : 'ANALYZE'}
                </button>
              </div>

              {error && (
                <div className="mx-6 md:mx-8 mb-6 md:mb-8 p-4 bg-red-500/10 border border-red-500/50 rounded-xl">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {result && (
                <div className="border-t border-zinc-800 p-6 md:p-8 space-y-6 bg-gradient-to-b from-transparent to-zinc-900/30">
                  <div className="text-center pb-6 border-b border-zinc-800">
                    <div className="text-6xl md:text-7xl font-black mb-2 bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                      {(result.probability * 100).toFixed(1)}%
                    </div>
                    <div className="text-gray-400 text-sm uppercase tracking-widest mb-4">
                      Hit Probability
                    </div>
                    <div className={`inline-block px-6 py-2 rounded-full font-bold text-sm ${
                      result.recommendation === 'HIT' 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : result.recommendation === 'MISS'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    }`}>
                      {result.recommendation}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 md:gap-4">
                    <div className="bg-zinc-800/50 p-3 md:p-4 rounded-xl text-center">
                      <div className="text-xl md:text-2xl font-bold text-white mb-1">{result.season_avg}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Season</div>
                    </div>
                    <div className="bg-zinc-800/50 p-3 md:p-4 rounded-xl text-center">
                      <div className="text-xl md:text-2xl font-bold text-white mb-1">{result.recent_avg}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Last 10</div>
                    </div>
                    <div className="bg-zinc-800/50 p-3 md:p-4 rounded-xl text-center">
                      <div className="text-xl md:text-2xl font-bold text-white mb-1">±{result.season_std?.toFixed(1)}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">StdDev</div>
                    </div>
                  </div>

                  {result.confidence_80 && (
                    <div className="bg-zinc-800/30 p-4 rounded-xl">
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">80% Confidence</div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-mono text-gray-300">{result.confidence_80[0]}</span>
                        <div className="flex-1 mx-4 h-1 bg-gradient-to-r from-orange-500 to-blue-500 rounded-full" />
                        <span className="font-mono text-gray-300">{result.confidence_80[1]}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="text-center mt-8 md:mt-12 text-gray-600 text-sm px-4">
            <p>Educational tool. Not financial advice.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
