export interface Customer {
  email: string;
  firstName: string;
  lastName: string;
  rut?: string;
  phone?: string;
  address?: string;
  city?: string;
  municipality?: string;
  activity?: string;
  companyOrPerson?: 0 | 1;
  isForeigner?: 0 | 1;
}
