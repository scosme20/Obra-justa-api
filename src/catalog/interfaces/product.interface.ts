export interface MasterProduct {
  name: string;
  category: string;
  unit: string;
  price: number;
  brand?: string;
  demandLevel?: string;
  active?: boolean;
  createdAt?: string;
}
