export interface BsaleProductType {
  id: number;
  name: string;
  state: number;
}

export interface BsaleProductRelation {
  href?: string;
  id?: number | string;
}

export interface BsaleProduct {
  id: number;
  name: string;
  description: string | null;
  classification: number;
  state: number;
  product_type?: BsaleProductRelation;
  productType?: BsaleProductRelation;
}

export interface BsaleVariant {
  id: number;
  code: string;
  description: string;
  state: number;
}
