import { PLAYER_CARS, UPGRADE_COSTS } from "./config.js";

// Existing vehicles remain included. A future catalog entry may define a price.
export const vehiclePrice = (car) => Math.max(0, car.price || 0);
export const ownsCar = (save, car) => Boolean(car) && (vehiclePrice(car) === 0 || (save.ownedCars || []).includes(car.id));
export function buyVehicle(save, carId, catalog = PLAYER_CARS) {
  const car = catalog.find((item) => item.id === carId);
  if (!car || ownsCar(save, car) || save.credits < vehiclePrice(car)) return save;
  return { ...save, credits: save.credits - vehiclePrice(car), ownedCars: [...(save.ownedCars || []), carId] };
}
export function buyPreparation(save, expectedStage) {
  if (save.preparation !== expectedStage || expectedStage >= 3 || expectedStage < 1) return save;
  const cost = UPGRADE_COSTS[expectedStage];
  if (save.credits < cost) return save;
  return { ...save, credits: save.credits - cost, preparation: expectedStage + 1 };
}
export function createSelection(save) {
  return { mode: "solo", player: 0, previewId: save.carId };
}
export function selectedIds(save) { return [save.carId, save.playerTwoCarId]; }
export function selectVehicle(save, state, catalog = PLAYER_CARS) {
  const car = catalog.find((item) => item.id === state.previewId);
  if (!ownsCar(save, car)) return save;
  return { ...save, [state.player === 0 ? "carId" : "playerTwoCarId"]: car.id };
}
export function canStart(save, mode, catalog = PLAYER_CARS) {
  return selectedIds(save).slice(0, mode === "versus" ? 2 : 1).every((id) => ownsCar(save, catalog.find((car) => car.id === id)));
}
