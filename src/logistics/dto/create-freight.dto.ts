export class CreateFreightDto {
  originCoords: { lat: number; lng: number };
  destinationCoords: { lat: number; lng: number };
  totalWeight: number;
  budgetId?: string;
}
