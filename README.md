# WebRTC Dice Game

A two-player peer-to-peer dice rolling game built with React, TypeScript, and WebRTC. No backend server required!

## Features

- **Peer-to-peer communication** using WebRTC via simple-peer
- **Real-time dice rolling** with visual feedback
- **QR code sharing** for easy connection setup
- **Winner determination** based on dice rolls
- **Responsive design** with shadcn/ui components
- **No backend required** - everything runs client-side

## How to Play

### Setup
1. **Player A (Host)**: Click "Create Game Offer" to generate a connection offer
2. **Player A**: Share the offer with Player B via copy/paste or QR code
3. **Player B (Joiner)**: Paste the offer and click "Join Game" to generate an answer
4. **Player B**: Share the answer back to Player A
5. **Player A**: Paste the answer and click "Complete Connection"

### Gameplay
1. Once connected, both players can click "Roll Dice"
2. Each player rolls a virtual 6-sided die
3. The player with the higher number wins the round
4. Results are displayed instantly with winner announcement
5. Click "Play Again" to reset for another round

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **WebRTC**: Native WebRTC APIs (no external dependencies)
- **QR Codes**: qrcode library for connection sharing
- **Icons**: Lucide React

## Getting Started

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Development
Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Project Structure

```
src/
├── components/
│   └── ui/           # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── label.tsx
│       └── textarea.tsx
├── lib/
│   └── utils.ts      # Utility functions
├── App.tsx           # Main application component
├── main.tsx          # Application entry point
└── index.css         # Global styles
```

## WebRTC Connection Flow

1. **Offer Creation**: Player A creates a WebRTC offer containing connection parameters
2. **Offer Sharing**: The offer is shared via copy/paste or QR code
3. **Answer Generation**: Player B processes the offer and generates an answer
4. **Answer Sharing**: The answer is shared back to Player A
5. **Connection Completion**: Player A processes the answer to establish the connection
6. **Peer Communication**: Both players can now send messages directly

## Game Logic

- Each dice roll generates a random number between 1-6
- Rolls are communicated between peers in real-time
- Winner is determined when both players have rolled
- Game state is synchronized across both clients
- Players can reset and play multiple rounds

## Security Considerations

- All communication is peer-to-peer (no data passes through servers)
- WebRTC provides built-in encryption for data channels
- No personal information is collected or stored
- Connection offers/answers should be shared through secure channels

## Browser Compatibility

This application works in modern browsers that support:
- WebRTC DataChannel API
- ES2020+ JavaScript features
- CSS Grid and Flexbox

Tested browsers:
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## Contributing

Feel free to open issues or submit pull requests to improve the game!

## License

MIT License - feel free to use this code for your own projects.
