export interface GameEntity {
  id: string;
}

export interface NamedEntity extends GameEntity {
  name: string;
}

export interface Renderable {
  sprite: string;
}

export interface Attackable {
  health: number;
  maxHealth: number;
}
