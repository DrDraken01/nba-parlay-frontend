'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'

export default function Home() {
  // Auth state
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // Analysis state
  const [player, setPlayer] = useState('')
  const [statType, setStatType] = useState('points')
  const [line, setLine] = useState('')
  const [betType, setBetType] = useState('over')
  const [opponent, setOpponent] = useState('')
  const [isHome, setIsHome] = useState(true)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showResult, setShowResult] = useState(false)

  // Animation states
  const [animatedProbability, setAnimatedProbability] = useState(0)
  const [playerPhotoUrl, setPlayerPhotoUrl] = useState('')
  const [photoError, setPhotoError] = useState(false)

  // Memoized player ID lookup
  const playerIds: Record<string, number> = useMemo(() => ({
    'lebron james': 1966,
    'stephen curry': 3975,
    'kevin durant': 3202,
    'giannis antetokounmpo': 3032977,
    'luka doncic': 3945274,
    'nikola jokic': 3112335,
    'joel embiid': 3059318,
    'jayson tatum': 4065648,
    'damian lillard': 6606,
    'anthony davis': 6583,
    'kawhi leonard': 6450,
    'james harden': 3992,
    'kyrie irving': 6442,
    'paul george': 4251,
    'jimmy butler': 6430,
    'devin booker': 3136195,
    'donovan mitchell': 4004043,
    'jaylen brown': 3917376,
    'trae young': 4277905,
    'anthony edwards': 4433134,
    'shai gilgeous-alexander': 4278073,
    'tyrese halliburton': 4433136,
    'de\'aaron fox': 3907498,
    'domantas sabonis': 3155535,
    'bam adebayo': 4066297,
    'ja morant': 4279888,
    'zion williamson': 4395628,
    'paolo banchero': 4433218,
    'victor wembanyama': 5104013,
    'chet holmgren': 4433239,
  }), [])

  // Memoized player photo URL generator
  const getPlayerPhotoUrl = useCallback((playerName: string): string => {
    const normalizedName = playerName.toLowerCase().trim()
    const playerId = playerIds[normalizedName]
    
    if (playerId) {
      return `https://a.espncdn.com/i/headshots/nba/players/full/${playerId}.png`
    }
    return ''
  }, [playerIds])

  // Animate probability counter with cleanup
  useEffect(() => {
    if (!result || !showResult) return

    const targetProb = result.probability * 100
    const duration = 1500
    const steps = 60
    const increment = targetProb / steps
    let current = 0
    let animationFrame: number
    
    const animate = () => {
      current += increment
      if (current >= targetProb) {
        setAnimatedProbability(targetProb)
      } else {
        setAnimatedProbability(current)
        animationFrame = requestAnimationFrame(animate)
      }
    }
    
    animationFrame = requestAnimationFrame(animate)
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [result, showResult])

  const handleAuth = async () => {
    setAuthLoading(true)
    setAuthError('')

    const endpoint = isLogin ? '/auth/login' : '/auth/register'

    try {
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: authEmail, 
          password: authPassword 
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed')
      }

      setAuthToken(data.access_token)
      setShowAuthModal(false)
      setAuthEmail('')
      setAuthPassword('')
      setAuthError('')
    } catch (err: any) {
      setAuthError(err.message)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = useCallback(() => {
    setAuthToken(null)
    setResult(null)
  }, [])

  const analyze = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    setShowResult(false)
    setAnimatedProbability(0)
    setPhotoError(false)

    // Get player photo
    const photoUrl = getPlayerPhotoUrl(player)
    setPlayerPhotoUrl(photoUrl)

    try {
      const headers: any = {
        'Content-Type': 'application/json'
      }

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`
      }

      const response = await fetch('http://localhost:8000/api/analyze-leg', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          player,
          stat_type: statType,
          line: parseFloat(line),
          bet_type: betType,
          opponent: opponent || null,
          is_home: isHome
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Analysis failed')
      }

      const data = await response.json()
      setResult(data)
      setTimeout(() => setShowResult(true), 100)
    } catch (err: any) {
      setError(err.message || 'Failed to analyze. Check API connection.')
    } finally {
      setLoading(false)
    }
  }

  const getRecommendationColor = useCallback((rec: string) => {
    if (rec.includes('HIT') || rec.includes('STRONG HIT')) return 'from-green-500 to-emerald-600'
    if (rec.includes('MISS') || rec.includes('STRONG MISS')) return 'from-red-500 to-rose-600'
    return 'from-yellow-500 to-amber-600'
  }, [])

  const getProbabilityColor = useCallback((prob: number) => {
    if (prob >= 60) return 'text-green-400'
    if (prob >= 55) return 'text-green-300'
    if (prob >= 50) return 'text-yellow-400'
    if (prob >= 45) return 'text-orange-400'
    return 'text-red-400'
  }, [])

  // Memoized bell curve generation - only recalculate when result changes
  const bellCurveData = useMemo(() => {
    if (!result || !result.season_std || result.season_std === 0) return null
    
    try {
      const mean = result.adjusted_avg || result.season_avg
      const std = result.season_std
      const lineValue = result.line
      
      // Safety check
      if (std <= 0) return null
      
      const width = 300
      const height = 120
      const padding = 20
      
      // Calculate range
      const minX = mean - 3 * std
      const maxX = mean + 3 * std
      const xScale = (width - 2 * padding) / (maxX - minX)
      
      // Generate bell curve points
      const points: string[] = []
      for (let i = 0; i <= 100; i++) {
        const x = minX + (maxX - minX) * (i / 100)
        const z = (x - mean) / std
        const y = Math.exp(-0.5 * z * z) / (std * Math.sqrt(2 * Math.PI))
        const normalizedY = y * std * 100
        
        const px = padding + (x - minX) * xScale
        const py = height - padding - normalizedY * (height - 2 * padding)
        
        points.push(`${px.toFixed(2)},${py.toFixed(2)}`)
      }
      
      const path = `M ${points.join(' L ')}`
      
      // Line position
      const lineX = padding + (lineValue - minX) * xScale
      
      return { path, lineX, mean, std, minX, maxX }
    } catch (error) {
      console.error('Bell curve generation error:', error)
      return null
    }
  }, [result])

  const getPlayerInitials = useCallback((name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }, [])

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-orange-600/5 via-black to-blue-600/5" />
      <div className="fixed inset-0 opacity-30" style={{
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px),
          repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)
        `,
        backgroundSize: '100px 100px'
      }} />

      {/* Auth Modal */}
      {showAuthModal && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setShowAuthModal(false)}
        >
          <div 
            className="bg-gradient-to-b from-zinc-900 to-black rounded-2xl border border-orange-500/20 max-w-md w-full p-8 shadow-2xl shadow-orange-500/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                {isLogin ? 'SIGN IN' : 'SIGN UP'}
              </h2>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-gray-400 hover:text-white transition-colors text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-black/50 border border-zinc-700 rounded-xl text-white focus:border-orange-500 focus:outline-none transition-all"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">
                  Password
                </label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                  className="w-full px-4 py-3 bg-black/50 border border-zinc-700 rounded-xl text-white focus:border-orange-500 focus:outline-none transition-all"
                  placeholder="Min 8 characters"
                />
              </div>

              {authError && (
                <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-xl">
                  <p className="text-red-400 text-sm">{authError}</p>
                </div>
              )}

              <button
                onClick={handleAuth}
                disabled={authLoading || !authEmail || !authPassword || authPassword.length < 8}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-lg rounded-xl transition-all shadow-lg shadow-orange-500/20"
              >
                {authLoading ? 'LOADING...' : isLogin ? 'SIGN IN' : 'CREATE ACCOUNT'}
              </button>

              <button
                onClick={() => {
                  setIsLogin(!isLogin)
                  setAuthError('')
                }}
                className="w-full py-3 text-gray-400 hover:text-white text-sm font-semibold transition-colors"
              >
                {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-7xl md:text-8xl font-black mb-3 bg-gradient-to-r from-orange-400 via-red-500 to-blue-500 bg-clip-text text-transparent tracking-tight">
              PARLAY
            </h1>
            <h2 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent tracking-tight">
              ANALYZER
            </h2>
            <p className="text-lg text-gray-400 mt-4 font-light">
              Advanced matchup analysis • Real-time data • Smart predictions
            </p>
          </div>
          
          {authToken ? (
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-xl">
                <span className="text-sm font-bold text-green-400">✓ AUTHENTICATED</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-bold transition-all"
              >
                LOGOUT
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-xl text-sm font-black transition-all shadow-lg shadow-orange-500/20"
            >
              SIGN IN
            </button>
          )}
        </div>

        {/* Main Layout */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            <div className="bg-gradient-to-b from-zinc-900/80 to-black/80 backdrop-blur-xl rounded-3xl border border-zinc-800/50 p-8 shadow-2xl">
              <h3 className="text-2xl font-black mb-6 text-white uppercase tracking-wide">Build Your Bet</h3>
              
              <div className="mb-6">
                <label className="block text-xs font-black text-gray-400 mb-3 uppercase tracking-widest">
                  Player Name
                </label>
                <input
                  type="text"
                  value={player}
                  onChange={(e) => setPlayer(e.target.value)}
                  placeholder="e.g., LeBron James"
                  className="w-full px-6 py-4 bg-black/70 border-2 border-zinc-800 rounded-2xl text-white text-lg placeholder-gray-600 focus:border-orange-500 focus:outline-none transition-all font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-black text-gray-400 mb-3 uppercase tracking-widest">
                    Stat Type
                  </label>
                  <select
                    value={statType}
                    onChange={(e) => setStatType(e.target.value)}
                    className="w-full px-6 py-4 bg-black/70 border-2 border-zinc-800 rounded-2xl text-white font-bold focus:border-orange-500 focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="points">POINTS</option>
                    <option value="assists">ASSISTS</option>
                    <option value="rebounds">REBOUNDS</option>
                    <option value="three_pointers">3-POINTERS</option>
                    <option value="steals">STEALS</option>
                    <option value="blocks">BLOCKS</option>
                    <option value="turnovers">TURNOVERS</option>
                    <option value="points_assists">PTS+AST</option>
                    <option value="points_rebounds_assists">PRA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 mb-3 uppercase tracking-widest">
                    Line
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={line}
                    onChange={(e) => setLine(e.target.value)}
                    placeholder="25.5"
                    className="w-full px-6 py-4 bg-black/70 border-2 border-zinc-800 rounded-2xl text-white text-lg font-bold placeholder-gray-600 focus:border-orange-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-black text-gray-400 mb-3 uppercase tracking-widest">
                  Pick Your Side
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setBetType('over')}
                    className={`py-4 rounded-2xl font-black text-lg transition-all ${
                      betType === 'over'
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30'
                        : 'bg-zinc-800/50 text-gray-400 hover:bg-zinc-700/50'
                    }`}
                  >
                    OVER ↗
                  </button>
                  <button
                    onClick={() => setBetType('under')}
                    className={`py-4 rounded-2xl font-black text-lg transition-all ${
                      betType === 'under'
                        ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30'
                        : 'bg-zinc-800/50 text-gray-400 hover:bg-zinc-700/50'
                    }`}
                  >
                    UNDER ↘
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500/5 to-blue-500/5 rounded-2xl p-6 border border-orange-500/10 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-xs font-black text-gray-300 uppercase tracking-widest">
                    Matchup Details
                  </label>
                  <span className="text-xs text-gray-500 font-semibold">Optional - Improves Accuracy</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-2 font-bold">Opponent</label>
                    <select
                      value={opponent}
                      onChange={(e) => setOpponent(e.target.value)}
                      className="w-full px-4 py-3 bg-black/50 border border-zinc-700 rounded-xl text-white text-sm font-semibold focus:border-orange-500 focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="">None</option>
                      <option value="ATL">Atlanta Hawks</option>
                      <option value="BOS">Boston Celtics</option>
                      <option value="BKN">Brooklyn Nets</option>
                      <option value="CHA">Charlotte Hornets</option>
                      <option value="CHI">Chicago Bulls</option>
                      <option value="CLE">Cleveland Cavaliers</option>
                      <option value="DAL">Dallas Mavericks</option>
                      <option value="DEN">Denver Nuggets</option>
                      <option value="DET">Detroit Pistons</option>
                      <option value="GSW">Golden State Warriors</option>
                      <option value="HOU">Houston Rockets</option>
                      <option value="IND">Indiana Pacers</option>
                      <option value="LAC">LA Clippers</option>
                      <option value="LAL">LA Lakers</option>
                      <option value="MEM">Memphis Grizzlies</option>
                      <option value="MIA">Miami Heat</option>
                      <option value="MIL">Milwaukee Bucks</option>
                      <option value="MIN">Minnesota Timberwolves</option>
                      <option value="NOP">New Orleans Pelicans</option>
                      <option value="NYK">New York Knicks</option>
                      <option value="OKC">Oklahoma City Thunder</option>
                      <option value="ORL">Orlando Magic</option>
                      <option value="PHI">Philadelphia 76ers</option>
                      <option value="PHX">Phoenix Suns</option>
                      <option value="POR">Portland Trail Blazers</option>
                      <option value="SAC">Sacramento Kings</option>
                      <option value="SAS">San Antonio Spurs</option>
                      <option value="TOR">Toronto Raptors</option>
                      <option value="UTA">Utah Jazz</option>
                      <option value="WAS">Washington Wizards</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-2 font-bold">Location</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setIsHome(true)}
                        className={`py-3 rounded-xl font-bold text-sm transition-all ${
                          isHome
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                            : 'bg-zinc-800/50 text-gray-500 hover:bg-zinc-700/50'
                        }`}
                      >
                        HOME
                      </button>
                      <button
                        onClick={() => setIsHome(false)}
                        className={`py-3 rounded-xl font-bold text-sm transition-all ${
                          !isHome
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                            : 'bg-zinc-800/50 text-gray-500 hover:bg-zinc-700/50'
                        }`}
                      >
                        AWAY
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={analyze}
                disabled={loading || !player || !line}
                className="w-full py-5 bg-gradient-to-r from-orange-500 via-red-500 to-blue-500 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black text-2xl rounded-2xl transition-all shadow-2xl shadow-orange-500/30 relative overflow-hidden group"
              >
                <span className="relative z-10">
                  {loading ? 'ANALYZING...' : 'RUN ANALYSIS'}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </button>

              {error && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/50 rounded-2xl">
                  <p className="text-red-400 text-sm font-semibold">{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* Results Section */}
          <div className={`transition-all duration-500 ${showResult ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {result && (
              <div className="bg-gradient-to-b from-zinc-900/80 to-black/80 backdrop-blur-xl rounded-3xl border border-zinc-800/50 p-8 shadow-2xl">
                {/* Player Photo Header */}
                <div className="flex items-center gap-6 mb-8 pb-6 border-b border-zinc-800">
                  {playerPhotoUrl && !photoError ? (
                    <img
                      src={playerPhotoUrl}
                      alt={player}
                      onError={() => setPhotoError(true)}
                      className="w-24 h-24 rounded-full border-4 border-orange-500/30 object-cover shadow-lg shadow-orange-500/20"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-3xl font-black text-white border-4 border-orange-500/30 shadow-lg shadow-orange-500/20">
                      {getPlayerInitials(player)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-3xl font-black text-white mb-1">{player}</h3>
                    <p className="text-gray-400 font-semibold uppercase text-sm tracking-wide">
                      {statType.replace('_', ' ')} • {betType.toUpperCase()} {line}
                    </p>
                  </div>
                </div>
                
                {/* Animated Probability */}
                <div className="text-center mb-8 p-8 bg-gradient-to-br from-zinc-800/50 to-black/50 rounded-3xl border border-zinc-700/30">
                  <div className={`text-8xl font-black mb-3 ${getProbabilityColor(animatedProbability)} transition-colors duration-300`}>
                    {animatedProbability.toFixed(1)}%
                  </div>
                  <div className="text-gray-500 text-sm uppercase tracking-widest mb-4 font-bold">
                    Hit Probability
                  </div>
                  <div className={`inline-block px-8 py-3 rounded-2xl font-black text-lg bg-gradient-to-r ${getRecommendationColor(result.recommendation)} shadow-lg`}>
                    {result.recommendation}
                  </div>
                </div>

                {/* Probability Distribution Chart */}
                {bellCurveData && (
                  <div className="mb-8 p-6 bg-gradient-to-br from-zinc-800/30 to-black/30 rounded-2xl border border-zinc-700/20">
                    <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
                      Probability Distribution
                    </div>
                    <svg viewBox="0 0 300 120" className="w-full" aria-label="Probability distribution curve">
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#f97316" />
                          <stop offset="50%" stopColor="#ef4444" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                      </defs>
                      
                      <path
                        d={bellCurveData.path}
                        fill="none"
                        stroke="url(#gradient)"
                        strokeWidth="2"
                      />
                      
                      <line
                        x1={bellCurveData.lineX}
                        y1="20"
                        x2={bellCurveData.lineX}
                        y2="100"
                        stroke="#f97316"
                        strokeWidth="3"
                        strokeDasharray="5,5"
                      />
                      <circle cx={bellCurveData.lineX} cy="15" r="5" fill="#f97316" />
                      
                      <text x="20" y="115" fontSize="10" fill="#6b7280" fontWeight="bold">
                        {bellCurveData.minX.toFixed(1)}
                      </text>
                      <text x="130" y="115" fontSize="10" fill="#6b7280" fontWeight="bold" textAnchor="middle">
                        {bellCurveData.mean.toFixed(1)}
                      </text>
                      <text x="280" y="115" fontSize="10" fill="#6b7280" fontWeight="bold" textAnchor="end">
                        {bellCurveData.maxX.toFixed(1)}
                      </text>
                      <text x={bellCurveData.lineX} y="12" fontSize="10" fill="#f97316" fontWeight="bold" textAnchor="middle">
                        LINE
                      </text>
                    </svg>
                    <div className="text-center text-xs text-gray-500 mt-2 font-medium">
                      The line falls at <span className="text-orange-400 font-bold">{(result.probability * 100).toFixed(1)}%</span> probability
                    </div>
                  </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-zinc-800/50 to-black/50 p-6 rounded-2xl border border-zinc-700/30 text-center">
                    <div className="text-4xl font-black text-white mb-2">{result.season_avg}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide font-bold">Season Average</div>
                  </div>
                  
                  {result.adjusted_avg && result.adjusted_avg !== result.season_avg && (
                    <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/40 p-6 rounded-2xl text-center">
                      <div className="text-4xl font-black text-orange-400 mb-2">{result.adjusted_avg}</div>
                      <div className="text-xs text-orange-400/70 uppercase tracking-wide font-bold">
                        Adjusted ({result.adjustment_magnitude > 0 ? '+' : ''}{result.adjustment_magnitude}%)
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-gradient-to-br from-zinc-800/50 to-black/50 p-6 rounded-2xl border border-zinc-700/30 text-center">
                    <div className="text-4xl font-black text-white mb-2">{result.recent_avg}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide font-bold">Last 10 Games</div>
                  </div>
                  
                  {result.season_std && (
                    <div className="bg-gradient-to-br from-zinc-800/50 to-black/50 p-6 rounded-2xl border border-zinc-700/30 text-center">
                      <div className="text-4xl font-black text-white mb-2">±{result.season_std.toFixed(1)}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide font-bold">Variance</div>
                    </div>
                  )}
                </div>

                {/* Matchup Factors */}
                {result.adjustments && result.adjustments.length > 0 && (
                  <div className="bg-gradient-to-br from-orange-500/5 to-blue-500/5 p-6 rounded-2xl border border-orange-500/10 mb-6">
                    <div className="text-sm font-black text-gray-300 uppercase tracking-widest mb-4">Matchup Factors</div>
                    <div className="space-y-3">
                      {result.adjustments.map((adj: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-sm text-gray-300 font-semibold">{adj.factor}</span>
                          <div className="flex items-center gap-3">
                            {adj.multiplier && (
                              <span className={`font-mono font-bold ${
                                adj.multiplier > 1 ? 'text-green-400' : adj.multiplier < 1 ? 'text-red-400' : 'text-gray-400'
                              }`}>
                                {adj.multiplier}x
                              </span>
                            )}
                            <span className="text-xs text-gray-500 font-medium">{adj.description}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confidence Range */}
                <div className="bg-gradient-to-br from-zinc-800/30 to-black/30 p-6 rounded-2xl border border-zinc-700/20">
                  <div className="text-xs text-gray-500 uppercase tracking-widest mb-3 font-bold">80% Confidence Range</div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xl font-bold text-white">{result.confidence_80[0]}</span>
                    <div className="flex-1 mx-6 h-2 bg-gradient-to-r from-orange-500 via-red-500 to-blue-500 rounded-full shadow-lg" />
                    <span className="font-mono text-xl font-bold text-white">{result.confidence_80[1]}</span>
                  </div>
                </div>

                {/* Usage Info */}
                {result.usage && (
                  <div className="text-center mt-6 text-sm">
                    <span className="text-gray-500 font-semibold">
                      {result.usage.remaining} / {result.usage.total_limit} analyses remaining today
                    </span>
                    {!authToken && result.usage.remaining <= 2 && (
                      <button
                        onClick={() => setShowAuthModal(true)}
                        className="ml-3 text-orange-400 hover:text-orange-300 underline font-bold"
                      >
                        Upgrade for more
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-600 text-sm font-semibold">
          Educational tool • Not financial advice • Gamble responsibly
        </div>
      </div>
    </div>
  )
}
