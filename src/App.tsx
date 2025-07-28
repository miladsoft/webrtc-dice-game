import { useState, useRef, useEffect } from 'react'
import QRCode from 'qrcode'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Button } from './components/ui/button'
import { Label } from './components/ui/label'
import { Textarea } from './components/ui/textarea'
import { Input } from './components/ui/input'
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Copy, Users, Trophy, Send, MessageCircle, Link, QrCode } from 'lucide-react'

interface GameState {
  myRoll: number | null
  opponentRoll: number | null
  winner: 'me' | 'opponent' | 'tie' | null
  gameStarted: boolean
}

interface ChatMessage {
  id: string
  text: string
  sender: 'me' | 'opponent'
  timestamp: number
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
  const [gameUrl, setGameUrl] = useState('')
  const [roomId, setRoomId] = useState('')
  const [joinRoomId, setJoinRoomId] = useState('')
  const [connectionMode, setConnectionMode] = useState<'manual' | 'url' | null>(null)
  const [gameState, setGameState] = useState<GameState>({
    myRoll: null,
    opponentRoll: null,
    winner: null,
    gameStarted: false
  })
  const [isRolling, setIsRolling] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [showChat, setShowChat] = useState(false)
  
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const chatRef = useRef<HTMLDivElement>(null)

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [chatMessages])

  // Check URL parameters for auto-join
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const offerParam = urlParams.get('offer')
    if (offerParam) {
      try {
        const decodedOffer = decodeURIComponent(offerParam)
        setOffer(decodedOffer)
        setConnectionMode('url')
        // Auto-accept the offer
        setTimeout(() => acceptOffer(decodedOffer), 500)
      } catch (error) {
        console.error('Invalid offer in URL:', error)
      }
    }
  }, [])

  // Generate a simple room ID
  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

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
      
      // Generate room ID and game URL
      const newRoomId = generateRoomId()
      setRoomId(newRoomId)
      
      const gameUrl = `${window.location.origin}${window.location.pathname}?offer=${encodeURIComponent(offerString)}`
      setGameUrl(gameUrl)
      
      // Generate QR code for the game URL
      QRCode.toDataURL(gameUrl)
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
  const acceptOffer = async (offerData?: string) => {
    const offerToUse = offerData || offer
    if (!offerToUse.trim()) return
    
    try {
      const parsedOffer = JSON.parse(offerToUse)
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

      await newPc.setRemoteDescription(parsedOffer)
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

      const answerString = JSON.stringify(newPc.localDescription)
      setAnswer(answerString)
      setPc(newPc)
      pcRef.current = newPc
      
      // If this is auto-join via URL, try to send answer back automatically
      if (connectionMode === 'url' && offerData) {
        console.log('Auto-join detected, answer ready:', answerString)
        // In a real app, you'd send this through a signaling server
        // For now, show it to copy manually
      }
      
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
      
      // Wait a bit for the connection to establish
      setTimeout(() => {
        if (dataChannel && dataChannel.readyState === 'open') {
          console.log('Data channel is ready!')
        } else {
          console.log('Waiting for data channel to open...')
        }
      }, 1000)
      
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
    } else if (message.type === 'chat') {
      const newChatMessage: ChatMessage = {
        id: Date.now().toString(),
        text: message.text,
        sender: 'opponent',
        timestamp: Date.now()
      }
      setChatMessages(prev => [...prev, newChatMessage])
    }
  }

  const sendChatMessage = () => {
    if (!newMessage.trim() || !dataChannel || dataChannel.readyState !== 'open') return
    
    const message: ChatMessage = {
      id: Date.now().toString(),
      text: newMessage.trim(),
      sender: 'me',
      timestamp: Date.now()
    }
    
    // Add to local chat
    setChatMessages(prev => [...prev, message])
    
    // Send to opponent
    dataChannel.send(JSON.stringify({ type: 'chat', text: message.text }))
    
    setNewMessage('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendChatMessage()
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
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2 text-3xl">
              <Dice1 className="w-8 h-8" />
              WebRTC Dice Game
            </CardTitle>
            <CardDescription>
              Two-player peer-to-peer dice rolling game with chat
            </CardDescription>
          </CardHeader>
        </Card>

        {!connected && connectionMode !== 'url' && (
          <Card>
            <CardHeader>
              <CardTitle>Choose Connection Method</CardTitle>
              <CardDescription>Select how you want to connect to play</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Button 
                  onClick={() => setConnectionMode('url')}
                  className="h-20 flex-col gap-2"
                >
                  <Link className="w-6 h-6" />
                  <span>Easy URL Sharing</span>
                  <span className="text-xs opacity-75">Recommended</span>
                </Button>
                <Button 
                  onClick={() => setConnectionMode('manual')}
                  variant="outline"
                  className="h-20 flex-col gap-2"
                >
                  <Copy className="w-6 h-6" />
                  <span>Manual Copy/Paste</span>
                  <span className="text-xs opacity-75">Advanced</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!connected && connectionMode === 'url' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Host Game */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Host a Game
                </CardTitle>
                <CardDescription>
                  Create a game and share the link
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={createOffer} 
                  disabled={!!offer}
                  className="w-full h-12"
                >
                  Create Game Room
                </Button>
                
                {gameUrl && (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <Label className="text-green-800 font-semibold">Game Room Created! Room ID: {roomId}</Label>
                      <p className="text-green-600 text-sm mt-1">Share this link with your friend:</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="game-url">Game Link</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          id="game-url"
                          value={gameUrl}
                          readOnly
                          className="text-sm"
                        />
                        <Button
                          onClick={() => copyToClipboard(gameUrl)}
                          variant="outline"
                          size="sm"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {qrCodeUrl && (
                      <div className="text-center">
                        <Label className="flex items-center justify-center gap-2 mb-2">
                          <QrCode className="w-4 h-4" />
                          QR Code
                        </Label>
                        <div className="flex justify-center">
                          <img src={qrCodeUrl} alt="QR Code" className="border rounded max-w-48" />
                        </div>
                        <p className="text-xs text-gray-600 mt-2">Scan with phone to join</p>
                      </div>
                    )}

                    {isInitiator && (
                      <div>
                        <Label htmlFor="answer">Waiting for Player 2...</Label>
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-2">
                          <p className="text-blue-800 text-sm">
                            <strong>Next Steps:</strong>
                          </p>
                          <ol className="text-blue-700 text-sm mt-1 list-decimal list-inside space-y-1">
                            <li>Player 2 will join using your link</li>
                            <li>Their response will appear below</li>
                            <li>Click "Complete Connection" to start playing</li>
                          </ol>
                        </div>
                        <Textarea
                          id="answer"
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                          className="mt-2 h-32 text-xs"
                          placeholder="Player 2's response will appear here automatically, or paste manually..."
                        />
                        <Button
                          onClick={completeConnection}
                          disabled={!answer.trim()}
                          className="mt-2 w-full"
                        >
                          {answer.trim() ? 'Complete Connection' : 'Waiting for Player 2 Response...'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Join Game */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Join a Game
                </CardTitle>
                <CardDescription>
                  Enter a room ID or paste a game link
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="room-id">Room ID</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="room-id"
                      value={joinRoomId}
                      onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                      placeholder="Enter 6-character room ID"
                      maxLength={6}
                      className="text-center text-lg font-mono"
                    />
                    <Button
                      onClick={() => acceptOffer()}
                      disabled={!joinRoomId.trim() || joinRoomId.length !== 6}
                      className="px-6"
                    >
                      Join
                    </Button>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or paste game link</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="offer-input">Game Link or Offer</Label>
                  <Textarea
                    id="offer-input"
                    value={offer}
                    onChange={(e) => setOffer(e.target.value)}
                    className="mt-2 h-24 text-xs"
                    placeholder="Paste the game link or offer here..."
                  />
                </div>
                
                <Button
                  onClick={() => acceptOffer()}
                  disabled={!offer.trim() || !!answer}
                  className="w-full"
                >
                  Join Game
                </Button>

                {answer && (
                  <div>
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-2">
                      <p className="text-green-800 text-sm">
                        <strong>✅ Connected Successfully!</strong>
                      </p>
                      <p className="text-green-700 text-sm mt-1">
                        Send this response to the host to complete the connection:
                      </p>
                    </div>
                    <Label htmlFor="answer-output">Your Response (Send this to the host)</Label>
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
                      Copy Response
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {!connected && connectionMode === 'manual' && (
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
                  <Label htmlFor="offer-input-manual">Game Offer from Player A</Label>
                  <Textarea
                    id="offer-input-manual"
                    value={offer}
                    onChange={(e) => setOffer(e.target.value)}
                    className="mt-2 h-32 text-xs"
                    placeholder="Paste the offer from Player A here..."
                  />
                </div>
                
                <Button
                  onClick={() => acceptOffer()}
                  disabled={!offer.trim() || !!answer}
                  className="w-full"
                >
                  Join Game
                </Button>

                {answer && (
                  <div>
                    <Label htmlFor="answer-output-manual">Your Answer (Send this to Player A)</Label>
                    <Textarea
                      id="answer-output-manual"
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
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Game Area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Connection Status */}
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-green-600 font-semibold flex items-center justify-center gap-2">
                    🎮 Connected! Ready to play!
                    <Button
                      onClick={() => setShowChat(!showChat)}
                      variant="outline"
                      size="sm"
                      className="ml-4"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Chat {chatMessages.length > 0 && `(${chatMessages.length})`}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Game Dice Area */}
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

            {/* Chat Panel */}
            {showChat && (
              <div className="lg:col-span-1">
                <Card className="h-96">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5" />
                        Chat
                      </span>
                      <Button
                        onClick={() => setShowChat(false)}
                        variant="ghost"
                        size="sm"
                      >
                        ×
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 flex flex-col h-80">
                    {/* Messages */}
                    <div 
                      ref={chatRef}
                      className="flex-1 overflow-y-auto p-4 space-y-2"
                    >
                      {chatMessages.length === 0 ? (
                        <div className="text-center text-gray-500 text-sm py-8">
                          No messages yet. Start chatting!
                        </div>
                      ) : (
                        chatMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                                msg.sender === 'me'
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-200 text-gray-800'
                              }`}
                            >
                              {msg.text}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Message Input */}
                    <div className="p-4 border-t">
                      <div className="flex gap-2">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Type a message..."
                          className="flex-1"
                        />
                        <Button
                          onClick={sendChatMessage}
                          disabled={!newMessage.trim() || !dataChannel || dataChannel.readyState !== 'open'}
                          size="sm"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App