'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import Image from 'next/image'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://nba-parlay-analyzer-production.up.railway.app'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface AnalysisResult {
  player: string
  stat_type: string
  line: number
  bet_type: string
  season_avg: number
  season_std: number
  recent_avg: number
  predicted_value?: number
  probability: number
  edge: number
  recommendation: string
  confidence_80?: [number, number]
  games_analyzed?: number
  usage?: {
    remaining: number
    total_limit: number
  }
}

interface TeamColors {
  primary: string
  secondary: string
  accent: string
}

// ============================================================================
// NBA TEAM DATA
// ============================================================================

const NBA_TEAMS: Record<string, TeamColors> = {
  ATL: { primary: '#E03A3E', secondary: '#C1D32F', accent: '#26282A' },
  BOS: { primary: '#007A33', secondary: '#BA9653', accent: '#963821' },
  BKN: { primary: '#000000', secondary: '#FFFFFF', accent: '#777D84' },
  CHA: { primary: '#1D1160', secondary: '#00788C', accent: '#A1A1A4' },
  CHI: { primary: '#CE1141', secondary: '#000000', accent: '#FFFFFF' },
  CLE: { primary: '#860038', secondary: '#041E42', accent: '#FDBB30' },
  DAL: { primary: '#00538C', secondary: '#002B5E', accent: '#B8C4CA' },
  DEN: { primary: '#0E2240', secondary: '#FEC524', accent: '#8B2131' },
  DET: { primary: '#C8102E', secondary: '#1D42BA', accent: '#BEC0C2' },
  GSW: { primary: '#1D428A', secondary: '#FFC72C', accent: '#26282A' },
  HOU: { primary: '#CE1141', secondary: '#000000', accent: '#C4CED4' },
  IND: { primary: '#002D62', secondary: '#FDBB30', accent: '#BEC0C2' },
  LAC: { primary: '#C8102E', secondary: '#1D428A', accent: '#BEC0C2' },
  LAL: { primary: '#552583', secondary: '#FDB927', accent: '#000000' },
  MEM: { primary: '#5D76A9', secondary: '#12173F', accent: '#F5B112' },
  MIA: { primary: '#98002E', secondary: '#F9A01B', accent: '#000000' },
  MIL: { primary: '#00471B', secondary: '#EEE1C6', accent: '#0077C0' },
  MIN: { primary: '#0C2340', secondary: '#236192', accent: '#78BE20' },
  NOP: { primary: '#0C2340', secondary: '#C8102E', accent: '#85714D' },
  NYK: { primary: '#006BB6', secondary: '#F58426', accent: '#BEC0C2' },
  OKC: { primary: '#007AC1', secondary: '#EF3B24', accent: '#002D62' },
  ORL: { primary: '#0077C0', secondary: '#C4CED4', accent: '#000000' },
  PHI: { primary: '#006BB6', secondary: '#ED174C', accent: '#002B5C' },
  PHX: { primary: '#1D1160', secondary: '#E56020', accent: '#63727A' },
  POR: { primary: '#E03A3E', secondary: '#000000', accent: '#FFFFFF' },
  SAC: { primary: '#5A2D81', secondary: '#63727A', accent: '#000000' },
  SAS: { primary: '#C4CED4', secondary: '#000000', accent: '#FFFFFF' },
  TOR: { primary: '#CE1141', secondary: '#000000', accent: '#A1A1A4' },
  UTA: { primary: '#002B5C', secondary: '#00471B', accent: '#F9A01B' },
  WAS: { primary: '#002B5C', secondary: '#E31837', accent: '#C4CED4' },
}

const TEAM_NAMES: Record<string, string> = {
  ATL: 'Atlanta Hawks', BOS: 'Boston Celtics', BKN: 'Brooklyn Nets',
  CHA: 'Charlotte Hornets', CHI: 'Chicago Bulls', CLE: 'Cleveland Cavaliers',
  DAL: 'Dallas Mavericks', DEN: 'Denver Nuggets', DET: 'Detroit Pistons',
  GSW: 'Golden State Warriors', HOU: 'Houston Rockets', IND: 'Indiana Pacers',
  LAC: 'LA Clippers', LAL: 'Los Angeles Lakers', MEM: 'Memphis Grizzlies',
  MIA: 'Miami Heat', MIL: 'Milwaukee Bucks', MIN: 'Minnesota Timberwolves',
  NOP: 'New Orleans Pelicans', NYK: 'New York Knicks', OKC: 'Oklahoma City Thunder',
  ORL: 'Orlando Magic', PHI: 'Philadelphia 76ers', PHX: 'Phoenix Suns',
  POR: 'Portland Trail Blazers', SAC: 'Sacramento Kings', SAS: 'San Antonio Spurs',
  TOR: 'Toronto Raptors', UTA: 'Utah Jazz', WAS: 'Washington Wizards',
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getPlayerImageUrl = (playerName: string): string => {
  const cleaned = playerName.toLowerCase().replace(/[^a-z\s]/g, '').trim()
  const parts = cleaned.split(' ')
  if (parts.length < 2) return ''
  
  const firstName = parts[0]
  const lastName = parts.slice(1).join('_')
  
  return `https://cdn.nba.com/headshots/nba/latest/1040x760/${firstName}_${lastName}.png`
}

const getTrend = (recent: number, season: number) => {
  const diff = recent - season
  if (diff > 3) return { text: 'VERY HOT', emoji: '🔥🔥', color: 'text-red-500', bg: 'bg-red-500/20', border: 'border-red-500/50' }
  if (diff > 1.5) return { text: 'HOT', emoji: '🔥', color: 'text-orange-500', bg: 'bg-orange-500/20', border: 'border-orange-500/50' }
  if (diff < -3) return { text: 'VERY COLD', emoji: '❄️❄️', color: 'text-blue-400', bg: 'bg-blue-400/20', border: 'border-blue-400/50' }
  if (diff < -1.5) return { text: 'COLD', emoji: '❄️', color: 'text-blue-300', bg: 'bg-blue-300/20', border: 'border-blue-300/50' }
  return { text: 'STEADY', emoji: '➡️', color: 'text-gray-400', bg: 'bg-gray-400/20', border: 'border-gray-400/50' }
}

const getRecommendationStyle = (recommendation: string) => {
  if (recommendation === 'HIT') {
    return 'bg-green-500/20 text-green-400 border-green-500/50'
  } else if (recommendation === 'MISS') {
    return 'bg-red-500/20 text-red-400 border-red-500/50'
  } else {
    return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Home() {
  // State Management
  const [player, setPlayer] = useState('')
  const [statType, setStatType] = useState('points')
  const [line, setLine] = useState('')
  const [betType, setBetType] = useState('over')
  const [location, setLocation] = useState<'home' | 'away' | 'neutral'>('neutral')
  const [opponent, setOpponent] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [imageError, setImageError] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Memoized values
  const trend = useMemo(() => 
    result ? getTrend(result.recent_avg, result.season_avg) : null,
    [result]
  )

  const teamColors = useMemo(() => 
    opponent ? NBA_TEAMS[opponent] : null,
    [opponent]
  )

  // Analysis function
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
    setImageError(false)

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
      if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
        setError('Unable to connect to server. Please check your connection.')
      } else {
        setError(error.message || 'Analysis failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }, [player, statType, line, betType])

  // Keyboard shortcut for analysis
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !loading && player.trim() && line) {
        analyze()
      }
    }
    window.addEventListener('keypress', handleKeyPress)
    return () => window.removeEventListener('keypress', handleKeyPress)
  }, [analyze, loading, player, line])

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-blue-500/5" />
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgb(255 255 255 / 0.05) 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      <div className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
          {/* Header */}
          <header className="text-center mb-12 md:mb-16">
            <div className="inline-block mb-4">
              <div className="flex items-center gap-3 px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-full">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                <span className="text-xs md:text-sm font-semibold text-orange-400 uppercase tracking-wider">
                  Live Analysis Engine
                </span>
              </div>
            </div>
            
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-4 leading-none">
              <span className="bg-gradient-to-r from-orange-400 via-red-500 to-blue-500 bg-clip-text text-transparent">
                PARLAY
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                ANALYZER
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-400 font-light max-w-2xl mx-auto">
              Statistical analysis powered by real game data. Make informed decisions with probability-based insights.
            </p>
          </header>

          {/* Main Analysis Card */}
          <div className="max-w-3xl mx-auto">
            <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl md:rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl">
              <div className="p-6 md:p-8 space-y-6">
                {/* Player Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider">
                    Player Name
                  </label>
                  <input
                    type="text"
                    value={player}
                    onChange={(e) => setPlayer(e.target.value)}
                    placeholder="LeBron James, Stephen Curry, etc."
                    disabled={loading}
                    className="w-full px-5 py-4 bg-black/50 border-2 border-zinc-800 rounded-xl text-white text-lg placeholder-gray-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Stat Type & Line */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider">
                      Stat Category
                    </label>
                    <select
                      value={statType}
                      onChange={(e) => setStatType(e.target.value)}
                      disabled={loading}
                      className="w-full px-5 py-4 bg-black/50 border-2 border-zinc-800 rounded-xl text-white text-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all disabled:opacity-50 appearance-none cursor-pointer"
                    >
                      <option value="points">Points (PTS)</option>
                      <option value="assists">Assists (AST)</option>
                      <option value="rebounds">Rebounds (REB)</option>
                      <option value="three_p">Three-Pointers (3PM)</option>
                      <option value="steals">Steals (STL)</option>
                      <option value="blocks">Blocks (BLK)</option>
                      <option value="points_assists">Points + Assists</option>
                      <option value="points_rebounds_assists">Points + Rebounds + Assists</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider">
                      Line Value
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={line}
                      onChange={(e) => setLine(e.target.value)}
                      placeholder="25.5"
                      disabled={loading}
                      className="w-full px-5 py-4 bg-black/50 border-2 border-zinc-800 rounded-xl text-white text-lg placeholder-gray-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Over/Under Selector */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider">
                    Bet Direction
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setBetType('over')}
                      disabled={loading}
                      className={`relative overflow-hidden py-4 rounded-xl font-black text-lg transition-all disabled:opacity-50 ${
                        betType === 'over'
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30 scale-105'
                          : 'bg-zinc-800/50 text-gray-400 hover:bg-zinc-700/50 hover:scale-105'
                      }`}
                    >
                      {betType === 'over' && (
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                      )}
                      <span className="relative">OVER</span>
                    </button>
                    <button
                      onClick={() => setBetType('under')}
                      disabled={loading}
                      className={`relative overflow-hidden py-4 rounded-xl font-black text-lg transition-all disabled:opacity-50 ${
                        betType === 'under'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/30 scale-105'
                          : 'bg-zinc-800/50 text-gray-400 hover:bg-zinc-700/50 hover:scale-105'
                      }`}
                    >
                      {betType === 'under' && (
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                      )}
                      <span className="relative">UNDER</span>
                    </button>
                  </div>
                </div>

                {/* Advanced Options Toggle */}
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full py-3 text-sm text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                  <span className="font-semibold">Advanced Options</span>
                  <svg 
                    className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Advanced Options */}
                {showAdvanced && (
                  <div className="space-y-4 pt-4 border-t border-zinc-800 animate-in fade-in slide-in-from-top-4 duration-300">
                    {/* Location Selector */}
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider">
                        Game Location
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['home', 'away', 'neutral'] as const).map((loc) => (
                          <button
                            key={loc}
                            onClick={() => setLocation(loc)}
                            disabled={loading}
                            className={`py-3 rounded-lg font-semibold text-sm uppercase transition-all disabled:opacity-50 ${
                              location === loc
                                ? 'bg-orange-500/20 text-orange-400 border-2 border-orange-500/50'
                                : 'bg-zinc-800/50 text-gray-400 border-2 border-transparent hover:border-zinc-700'
                            }`}
                          >
                            {loc === 'home' ? '🏠 Home' : loc === 'away' ? '✈️ Away' : '⚖️ Neutral'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Opponent Selector */}
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider">
                        Opponent Team (Optional)
                      </label>
                      <select
                        value={opponent}
                        onChange={(e) => setOpponent(e.target.value)}
                        disabled={loading}
                        className="w-full px-5 py-3 bg-black/50 border-2 border-zinc-800 rounded-xl text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all disabled:opacity-50 appearance-none cursor-pointer"
                      >
                        <option value="">Select opponent...</option>
                        {Object.entries(TEAM_NAMES).sort((a, b) => a[1].localeCompare(b[1])).map(([code, name]) => (
                          <option key={code} value={code}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Analyze Button */}
                <button
                  onClick={analyze}
                  disabled={loading || !player.trim() || !line}
                  className="group relative w-full py-5 bg-gradient-to-r from-orange-500 via-red-500 to-blue-500 hover:from-orange-600 hover:via-red-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xl rounded-xl transition-all shadow-lg hover:shadow-2xl hover:shadow-orange-500/30 overflow-hidden"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-3">
                      <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>ANALYZING...</span>
                    </span>
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all" />
                      <span className="relative">ANALYZE BET</span>
                    </>
                  )}
                </button>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mx-6 md:mx-8 mb-6 md:mb-8">
                  <div className="p-4 bg-red-500/10 border-2 border-red-500/50 rounded-xl backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-red-400 text-sm font-medium">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Results Section */}
              {result && (
                <div className="border-t border-zinc-800 bg-gradient-to-b from-zinc-900/30 to-black/30 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="p-6 md:p-8 space-y-6">
                    {/* Player Header */}
                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-zinc-800/50 to-transparent rounded-xl">
                      <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-900 flex-shrink-0 ring-2 ring-zinc-700">
                        {!imageError ? (
                          <Image
                            src={getPlayerImageUrl(result.player)}
                            alt={result.player}
                            fill
                            className="object-cover"
                            onError={() => setImageError(true)}
                            priority
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl md:text-4xl font-black text-zinc-600">
                            {result.player.split(' ').map(n => n[0]).join('')}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-2xl md:text-3xl font-black text-white truncate">
                          {result.player}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {trend && (
                            <span className={`inline-flex items-center gap-1 px-3 py-1 ${trend.bg} border ${trend.border} rounded-full`}>
                              <span className="text-sm">{trend.emoji}</span>
                              <span className={`text-xs font-bold ${trend.color} uppercase`}>
                                {trend.text}
                              </span>
                            </span>
                          )}
                          {result.games_analyzed && (
                            <span className="text-xs text-gray-500">
                              {result.games_analyzed} games analyzed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Main Probability Display */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border border-zinc-700 p-8">
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-blue-500/5" />
                      <div className="relative text-center space-y-4">
                        <div className="text-7xl md:text-8xl font-black">
                          <span className="bg-gradient-to-r from-orange-400 via-red-500 to-blue-500 bg-clip-text text-transparent animate-pulse">
                            {(result.probability * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm text-gray-400 uppercase tracking-widest font-bold">
                            Hit Probability
                          </p>
                          <div className={`inline-block px-6 py-2 rounded-full border-2 font-bold text-sm uppercase ${getRecommendationStyle(result.recommendation)}`}>
                            {result.recommendation}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="group relative overflow-hidden bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 hover:from-zinc-800/70 hover:to-zinc-900/70 p-4 rounded-xl border border-zinc-700 hover:border-zinc-600 transition-all cursor-default">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 group-hover:from-orange-500/10 to-transparent transition-all" />
                        <div className="relative text-center">
                          <div className="text-3xl md:text-4xl font-black text-white mb-1">
                            {result.season_avg.toFixed(1)}
                          </div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                            Season Avg
                          </div>
                        </div>
                      </div>

                      <div className="group relative overflow-hidden bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 hover:from-zinc-800/70 hover:to-zinc-900/70 p-4 rounded-xl border border-zinc-700 hover:border-zinc-600 transition-all cursor-default">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 group-hover:from-blue-500/10 to-transparent transition-all" />
                        <div className="relative text-center">
                          <div className="text-3xl md:text-4xl font-black text-white mb-1">
                            {result.recent_avg.toFixed(1)}
                          </div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                            Last 10 Avg
                          </div>
                        </div>
                      </div>

                      <div className="group relative overflow-hidden bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 hover:from-zinc-800/70 hover:to-zinc-900/70 p-4 rounded-xl border border-zinc-700 hover:border-zinc-600 transition-all cursor-default">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 group-hover:from-purple-500/10 to-transparent transition-all" />
                        <div className="relative text-center">
                          <div className="text-3xl md:text-4xl font-black text-white mb-1">
                            ±{result.season_std.toFixed(1)}
                          </div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                            Std Dev
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Confidence Interval */}
                    {result.confidence_80 && (
                      <div className="relative overflow-hidden bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border border-zinc-700 rounded-xl p-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                              80% Confidence Range
                            </span>
                            <span className="text-xs text-gray-500">
                              Expected range of outcomes
                            </span>
                          </div>
                          
                          <div className="relative">
                            <div className="flex items-center justify-between text-sm font-mono mb-2">
                              <span className="text-gray-300 font-bold">{result.confidence_80[0].toFixed(1)}</span>
                              <span className="text-gray-300 font-bold">{result.confidence_80[1].toFixed(1)}</span>
                            </div>
                            
                            <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-red-500 to-blue-500 opacity-70" />
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                            </div>
                            
                            {/* Line Marker */}
                            {line && (
                              <div 
                                className="absolute top-0 w-0.5 h-full bg-white shadow-lg"
                                style={{
                                  left: `${Math.min(100, Math.max(0, ((parseFloat(line) - result.confidence_80[0]) / (result.confidence_80[1] - result.confidence_80[0])) * 100))}%`
                                }}
                              >
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-1 bg-white text-black text-xs font-bold rounded whitespace-nowrap">
                                  Line: {line}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Edge Analysis */}
                    {result.edge !== undefined && (
                      <div className={`relative overflow-hidden rounded-xl p-4 border-2 ${
                        result.edge > 0.05 
                          ? 'bg-green-500/10 border-green-500/50' 
                          : result.edge < -0.05
                          ? 'bg-red-500/10 border-red-500/50'
                          : 'bg-yellow-500/10 border-yellow-500/50'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">
                              Statistical Edge
                            </p>
                            <p className={`text-2xl font-black ${
                              result.edge > 0.05 ? 'text-green-400' : result.edge < -0.05 ? 'text-red-400' : 'text-yellow-400'
                            }`}>
                              {result.edge > 0 ? '+' : ''}{(result.edge * 100).toFixed(1)}%
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 mb-1">Interpretation</p>
                            <p className={`text-sm font-bold ${
                              result.edge > 0.05 ? 'text-green-400' : result.edge < -0.05 ? 'text-red-400' : 'text-yellow-400'
                            }`}>
                              {result.edge > 0.05 ? 'POSITIVE VALUE' : result.edge < -0.05 ? 'NEGATIVE VALUE' : 'NEUTRAL'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Matchup Context */}
                    {(location !== 'neutral' || opponent) && (
                      <div className="relative overflow-hidden bg-gradient-to-br from-zinc-800/30 to-zinc-900/30 border border-zinc-700 rounded-xl p-4">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3 flex-wrap">
                            {location !== 'neutral' && (
                              <span className="px-3 py-1 bg-zinc-800 rounded-full text-sm font-semibold">
                                {location === 'home' ? '🏠 Home Game' : '✈️ Away Game'}
                              </span>
                            )}
                            {opponent && teamColors && (
                              <span 
                                className="px-3 py-1 rounded-full text-sm font-semibold border"
                                style={{
                                  backgroundColor: `${teamColors.primary}20`,
                                  borderColor: `${teamColors.primary}80`,
                                  color: teamColors.primary
                                }}
                              >
                                vs {TEAM_NAMES[opponent]}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Usage Stats */}
                    {result.usage && (
                      <div className="text-center">
                        <p className="text-sm text-gray-500">
                          {result.usage.remaining} of {result.usage.total_limit} analyses remaining today
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Info Cards */}
          <div className="max-w-3xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="group relative overflow-hidden bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 group-hover:from-orange-500/5 to-transparent transition-all" />
              <div className="relative">
                <div className="text-3xl mb-2">📊</div>
                <h3 className="text-sm font-bold text-white mb-1">Real Data</h3>
                <p className="text-xs text-gray-500">
                  Analysis based on actual game logs and historical performance
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 group-hover:from-blue-500/5 to-transparent transition-all" />
              <div className="relative">
                <div className="text-3xl mb-2">🎯</div>
                <h3 className="text-sm font-bold text-white mb-1">Probability Model</h3>
                <p className="text-xs text-gray-500">
                  Statistical modeling with confidence intervals and variance analysis
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 group-hover:from-purple-500/5 to-transparent transition-all" />
              <div className="relative">
                <div className="text-3xl mb-2">🔥</div>
                <h3 className="text-sm font-bold text-white mb-1">Recent Form</h3>
                <p className="text-xs text-gray-500">
                  Hot/cold trend detection based on last 10 games vs season average
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="max-w-3xl mx-auto mt-12 space-y-4">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-bold text-yellow-400 mb-1">Responsible Gaming Notice</p>
                  <p className="text-xs text-yellow-400/80">
                    This tool is for educational and entertainment purposes only. Gambling involves risk. Never bet more than you can afford to lose.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center space-y-2 text-gray-600 text-xs">
              <p className="font-semibold">Educational tool • Not financial advice • For entertainment purposes</p>
              <p>Gambling problem? Call <span className="text-white font-bold">1-800-GAMBLER</span> or visit <a href="https://www.ncpgambling.org" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">ncpgambling.org</a></p>
              <p className="text-gray-700">© 2025 NBA Parlay Analyzer. All player data sourced from publicly available statistics.</p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
