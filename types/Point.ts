import { Coordinate } from "./Coordinate";
import uuid from 'react-native-uuid'

export enum PointType {
  gida = 'gida',
  barinma = 'barinma',
  tibbi_yardim = 'tibbi_yardim',
  yikim = 'yikim',
  insan = 'insan',
  diger = 'diger',
}

export interface pointGETDTO{
    pk: string;
    sk: string;
    type: string;
    lat: number;
    lng: number;
    description?: string;
}

export interface pointPOSTDTO{
    lat: number;
    lng: number;
    type: string;
    description?: string;
}

export class Point {
  id: string;
  pk?: string;
  sk?: string;
  coordinate: Coordinate;
  description: string;
  type: PointType;

  constructor(
    id: string,
    coordinate: { latitude: number; longitude: number },
    description: string,
    type: PointType,
    pk?: string,
    sk?: string,
  ) {
    this.id = id;
    this.pk = pk;
    this.sk = sk;
    this.coordinate = coordinate;
    this.description = description;
    this.type = type;
  }

  toJSON() : pointPOSTDTO {
    return {
      lat: this.coordinate.latitude,
      lng: this.coordinate.longitude,
      description: this.description,
      type: this.type
    };
  }

  static jsonToPoint(json: pointGETDTO): Point {
    const typeKey = json.type.toLowerCase() || 'OTHER';
    const typeEnumValue = PointType[typeKey as keyof typeof PointType] || PointType.diger;
    console.log('typeEnumValue:', typeEnumValue);
    console.log('typeKey:', typeKey);
    return new Point(
      uuid.v4(),
      {
        latitude: json.lat,
        longitude: json.lng,
      },
      json.description || '',
      typeEnumValue,
      json.pk,
      json.sk,
    );
  }
}
