export interface Room {
  id: string;
  hotelId: string;
  roomTypeId: string;
  roomTypeName: string;
  roomNumber: string;
  floor: string;
  price: number;
  status: any;
  notes?: string;
}

export interface CreateRoomRequest {
  roomNumber: string;
  roomTypeName: string;
  price: number;
  floor: string;
  status: string;
  notes?: string;
}
