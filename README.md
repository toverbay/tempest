# Tempest - A Roguelike Adventure Game

A browser-based roguelike adventure game built with Svelte. Explore a dark world, collect items, battle enemies, and survive! Written entirely using "vibe coding" in the cursor editor.

## Features

- **Dark Environment**: Navigate through a dark world where visibility is limited
- **Torch Mechanic**: Find and equip a torch to light up your surroundings
- **Inventory System**: Collect and manage items like health potions and strength potions
- **Equipment Management**: Equip items in your main hand and off hand
- **Battle System**: Engage in turn-based combat with enemies
- **Fog of War**: See only what's around you, creating an immersive exploration experience

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:

   ```shell
   git clone https://github.com/yourusername/tempest.git
   cd tempest
   ```

2. Install dependencies:

   ```shell
   npm install
   # or
   yarn install
   ```

3. Start the development server:

   ```shell
   npm run dev
   # or
   yarn dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Game Controls

- **Arrow Keys**: Move the player character
- **P**: Pick up items near you
- **Tab**: Open/close inventory
- **E**: Open/close equipment menu
- **A/D/I**: Battle actions (Attack/Defend/Use Item)
- **ESC**: Close menus or attempt to flee from battle

## Game Mechanics

### Visibility

The game starts in darkness. You need to find and equip a torch to see your surroundings. The torch will light up a small area around you.

### Items

- **Torch**: Lights up the area around you
- **Health Potion**: Restores 30 HP
- **Strength Potion**: Increases attack damage by 50% for 3 turns

### Equipment

You have two equipment slots:

- **Main Hand**: Primary equipment slot
- **Off Hand**: Secondary equipment slot

You can swap items between hands using the 'S' key in the equipment menu.

### Combat

When you encounter an enemy, you'll enter a battle where you can:

- **Attack**: Deal damage to the enemy
- **Defend**: Reduce incoming damage
- **Use Item**: Access your inventory to use items
- **Flee**: Attempt to escape the battle (50% success rate)

## Development

### Project Structure

- `src/lib/game/`: Contains the game logic and components
- `src/lib/game/WorldMap.svelte`: Main game component
- `src/lib/game/types/`: TypeScript type definitions

### Building for Production

```shell
npm run build
# or
yarn build
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by classic roguelike games
- Built with [Svelte](https://svelte.dev/)
