/** Future extension point for unlockable cars and visual upgrades. */
export class Garage {
  constructor(storage) { this.storage = storage; }
  selectedCar() { return this.storage.get("selectedCar", "starter"); }
}
