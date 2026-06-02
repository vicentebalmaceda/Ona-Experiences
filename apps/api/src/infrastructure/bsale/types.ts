export interface BsaleProductType {
  id: number;
  name: string;
  state: number;
}

export interface BsaleProduct {
  id: number;
  name: string;
  description: string | null;
  classification: number;
  state: number;
}

export interface BsaleVariant {
  id: number;
  code: string;
  description: string;
  state: number;
}
