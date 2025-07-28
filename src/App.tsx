import { useState, useRef } from 'react'
import QRCode from 'qrcode'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Button } from './components/ui/button'
import { Label } from './components/ui/label'
import { Textarea } from './components/ui/textarea'
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Copy, Users, Trophy } from 'lucide-react'

interface GameState {
  myRoll: number | null
  opponentRoll: number | null
  winner: 'me' | 'opponent' | 'tie' | null
  gameStarted: boolean
}

const DiceIcon = ({ value }: { value: number }) => {
  const icons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6]
  const Icon = icons[value - 1]
  return <Icon className="w-16 h-16" />
}

function App() {
  const [pc, setPc] = useState<RTCPeerConnection | null>(null)
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null)
  const [isInitiator, setIsInitiator] = useState(false)
  const [connected, setConnected] = useState(false)
  const [offer, setOffer] = useState('')
  const [answer, setAnswer] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [gameState, setGameState] = useState<GameState>({
    myRoll: null,
    opponentRoll: null,
    winner: null,
    gameStarted: false
  })
  const [isRolling, setIsRolling] = useState(false)
  
  const pcRef = useRef<RTCPeerConnection | null>(null)

  // Create offer (Player A)
  const createOffer = async () => {
    try {
      const newPc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      })

      // Create data channel
      const channel = newPc.createDataChannel('gameData', { ordered: true })
      
      channel.onopen = () => {
        console.log('Data channel opened as initiator')
        setConnected(true)
        setDataChannel(channel)
      }
      
      channel.onmessage = (event) => {
        handleMessage(JSON.parse(event.data))
      }

      channel.onerror = (error) => {
        console.error('Data channel error:', error)
      }

      // Create offer
      const offerDescription = await newPc.createOffer()
      await newPc.setLocalDescription(offerDescription)

      // Wait for ICE gathering to complete
      await new Promise<void>((resolve) => {
        newPc.onicecandidate = (event) => {
          if (!event.candidate) {
            resolve()
          }
        }
      })

      const offerString = JSON.stringify(newPc.localDescription)
      setOffer(offerString)
      
      // Generate QR code
      QRCode.toDataURL(offerString)
        .then(url => setQrCodeUrl(url))
        .catch(err => console.error('Error generating QR code:', err))

      setPc(newPc)
      pcRef.current = newPc
      setIsInitiator(true)
    } catch (error) {
      console.error('Error creating offer:', error)
    }
  }

  // Accept offer and create answer (Player B)
  const acceptOffer = async () => {
    if (!offer.trim()) return
    
    try {
      const offerData = JSON.parse(offer)
      const newPc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      })

      // Handle incoming data channel
      newPc.ondatachannel = (event) => {
        const channel = event.channel
        
        channel.onopen = () => {
          console.log('Data channel opened as accepter')
          setConnected(true)
          setDataChannel(channel)
        }
        
        channel.onmessage = (event) => {
          handleMessage(JSON.parse(event.data))
        }

        channel.onerror = (error) => {
          console.error('Data channel error:', error)
        }
      }

      await newPc.setRemoteDescription(offerData)
      const answerDescription = await newPc.createAnswer()
      await newPc.setLocalDescription(answerDescription)

      // Wait for ICE gathering to complete
      await new Promise<void>((resolve) => {
        newPc.onicecandidate = (event) => {
          if (!event.candidate) {
            resolve()
          }
        }
      })

      setAnswer(JSON.stringify(newPc.localDescription))
      setPc(newPc)
      pcRef.current = newPc
    } catch (err) {
      console.error('Invalid offer format:', err)
    }
  }

  // Complete connection (Player A)
  const completeConnection = async () => {
    if (!answer.trim() || !pc) return
    
    try {
      const answerData = JSON.parse(answer)
      await pc.setRemoteDescription(answerData)
      console.log('Connection completed!')
    } catch (err) {
      console.error('Invalid answer format:', err)
    }
  }

  const handleMessage = (message: any) => {
    if (message.type === 'roll') {
      setGameState(prev => {
        const newState: GameState = { ...prev, opponentRoll: message.value }
        
        // Check for winner if both players have rolled
        if (newState.myRoll !== null && newState.opponentRoll !== null) {
          if (newState.myRoll > newState.opponentRoll) {
            newState.winner = 'me'
          } else if (newState.opponentRoll > newState.myRoll) {
            newState.winner = 'opponent'
          } else {
            newState.winner = 'tie'
          }
        }
        
        return newState
      })
    }
  }

  const rollDice = () => {
    if (!connected || isRolling) return
    
    setIsRolling(true)
    
    // Simulate rolling animation
    setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1
      
      setGameState(prev => {
        const newState: GameState = { 
          ...prev, 
          myRoll: roll, 
          gameStarted: true,
          winner: null // Reset winner when new roll starts
        }
        
        // Check for winner if opponent has already rolled
        if (newState.opponentRoll !== null) {
          if (newState.myRoll! > newState.opponentRoll) {
            newState.winner = 'me'
          } else if (newState.opponentRoll > newState.myRoll!) {
            newState.winner = 'opponent'
          } else {
            newState.winner = 'tie'
          }
        }
        
        return newState
      })
      
      // Send roll to opponent
      if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify({ type: 'roll', value: roll }))
      }
      
      setIsRolling(false)
    }, 1000)
  }

  const resetGame = () => {
    setGameState({
      myRoll: null,
      opponentRoll: null,
      winner: null,
      gameStarted: false
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2 text-3xl">
              <Dice1 className="w-8 h-8" />
              WebRTC Dice Game
            </CardTitle>
            <CardDescription>
              Two-player peer-to-peer dice rolling game using WebRTC
            </CardDescription>
          </CardHeader>
        </Card>

        {!connected && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Player A - Create Offer */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Player A - Host Game
                </CardTitle>
                <CardDescription>
                  Create a game offer and share it with Player B
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={createOffer} 
                  disabled={!!offer}
                  className="w-full"
                >
                  Create Game Offer
                </Button>
                
                {offer && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="offer">Game Offer (Share this with Player B)</Label>
                      <Textarea
                        id="offer"
                        value={offer}
                        readOnly
                        className="mt-2 h-32 text-xs"
                        placeholder="Game offer will appear here..."
                      />
                      <Button
                        onClick={() => copyToClipboard(offer)}
                        variant="outline"
                        size="sm"
                        className="mt-2"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Offer
                      </Button>
                    </div>
                    
                    {qrCodeUrl && (
                      <div className="text-center">
                        <Label>QR Code</Label>
                        <div className="mt-2 flex justify-center">
                          <img src={qrCodeUrl} alt="QR Code" className="border rounded" />
                        </div>
                      </div>
                    )}

                    {isInitiator && (
                      <div>
                        <Label htmlFor="answer">Answer from Player B</Label>
                        <Textarea
                          id="answer"
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                          className="mt-2 h-32 text-xs"
                          placeholder="Paste the answer from Player B here..."
                        />
                        <Button
                          onClick={completeConnection}
                          disabled={!answer.trim()}
                          className="mt-2 w-full"
                        >
                          Complete Connection
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Player B - Join Game */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Player B - Join Game
                </CardTitle>
                <CardDescription>
                  Paste the offer from Player A to join the game
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="offer-input">Game Offer from Player A</Label>
                  <Textarea
                    id="offer-input"
                    value={offer}
                    onChange={(e) => setOffer(e.target.value)}
                    className="mt-2 h-32 text-xs"
                    placeholder="Paste the offer from Player A here..."
                  />
                </div>
                
                <Button
                  onClick={acceptOffer}
                  disabled={!offer.trim() || !!answer}
                  className="w-full"
                >
                  Join Game
                </Button>

                {answer && (
                  <div>
                    <Label htmlFor="answer-output">Your Answer (Send this to Player A)</Label>
                    <Textarea
                      id="answer-output"
                      value={answer}
                      readOnly
                      className="mt-2 h-32 text-xs"
                    />
                    <Button
                      onClick={() => copyToClipboard(answer)}
                      variant="outline"
                      size="sm"
                      className="mt-2"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Answer
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {connected && (
          <div className="space-y-6">
            {/* Connection Status */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-green-600 font-semibold">
                  🎮 Connected! Ready to play!
                </div>
              </CardContent>
            </Card>

            {/* Game Area */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Your Dice */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Dice</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <div className="flex justify-center">
                    {gameState.myRoll ? (
                      <DiceIcon value={gameState.myRoll} />
                    ) : (
                      <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                        ?
                      </div>
                    )}
                  </div>
                  <div className="text-lg font-semibold">
                    {gameState.myRoll ? `You rolled: ${gameState.myRoll}` : 'Ready to roll!'}
                  </div>
                  <Button
                    onClick={rollDice}
                    disabled={isRolling}
                    className="w-full"
                  >
                    {isRolling ? 'Rolling...' : 'Roll Dice'}
                  </Button>
                </CardContent>
              </Card>

              {/* Opponent's Dice */}
              <Card>
                <CardHeader>
                  <CardTitle>Opponent's Dice</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <div className="flex justify-center">
                    {gameState.opponentRoll ? (
                      <DiceIcon value={gameState.opponentRoll} />
                    ) : (
                      <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                        ?
                      </div>
                    )}
                  </div>
                  <div className="text-lg font-semibold">
                    {gameState.opponentRoll ? `Opponent rolled: ${gameState.opponentRoll}` : 'Waiting for opponent...'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Winner Display */}
            {gameState.winner && (
              <Card className="border-2 border-yellow-400 bg-yellow-50">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Trophy className="w-12 h-12 mx-auto mb-4 text-yellow-600" />
                    <div className="text-2xl font-bold mb-2">
                      {gameState.winner === 'me' && '🎉 You Won!'}
                      {gameState.winner === 'opponent' && '😅 Opponent Won!'}
                      {gameState.winner === 'tie' && '🤝 It\'s a Tie!'}
                    </div>
                    <div className="text-lg text-gray-600 mb-4">
                      You: {gameState.myRoll} | Opponent: {gameState.opponentRoll}
                    </div>
                    <Button onClick={resetGame} variant="outline">
                      Play Again
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App