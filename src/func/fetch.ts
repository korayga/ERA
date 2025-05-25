import { Coordinate } from '../../types/Coordinate';
import { Point, PointType } from '../../types/Point';
import { TokenManager } from '../../types/TokenManager';

const API_BASE_URL = 'https://yqu8uvgelk.execute-api.eu-central-1.amazonaws.com/v1';
const TOKEN = TokenManager.getIdToken();

export const typeOptions = [
  { label: 'Yemek', value: PointType.gida },
  { label: 'Barınma', value: PointType.barinma },
  { label: 'Tıbbi', value: PointType.tibbi_yardim },
  { label: 'Yıkıntı', value: PointType.yikim },
  { label: 'İnsan', value: PointType.insan },
  { label: 'Diğer', value: PointType.diger },
];

export const awsTypeMap = {
  [PointType.gida]: "gida",
  [PointType.barinma]: "barinma",
  [PointType.tibbi_yardim]: "tibbi_yardim",
  [PointType.yikim]: "yikinti",
  [PointType.insan]: "insan",
  [PointType.diger]: "diger",
};

interface CreatePointData {
  coordinate: { latitude: number; longitude: number };
  type: PointType;
  description: string;
}

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `${ TOKEN || ''}`
};


export async function fetchPoints(center : Coordinate, radius: number): Promise<Point[]> {
  try {
    const url = `${API_BASE_URL}/point?lat=${center.latitude}&lng=${center.longitude}&radius=${radius}`;
    const res = await fetch(url, { method: 'GET', headers });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const response = await res.json();
    const points = [];
    for(const item of response.data) {
        console.log('Fetched point:', item);
        points.push(Point.jsonToPoint(item)); 
    }    
    return points;
  } catch (err) {
    console.error('Error fetching points:', err);
    throw err;
  }
}

export async function sendVoice(data: string, latitude: number, longitude: number): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/acil-ses`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        location: {
          lat: latitude,
          lng: longitude,
        },
        voice: data,
      }),
    });

    if (!response.ok) {
      console.error(await response.json());
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Ses gönderilirken hata oluştu:', error);
    throw error;
  }
}

export async function createPoint(data: CreatePointData): Promise<any> {
  try {
    const awsType = awsTypeMap[data.type] || "diger";
    console.log('Creating point with data:', data);
    const response = await fetch(`${API_BASE_URL}/point`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        lat: data.coordinate.latitude,
        lng: data.coordinate.longitude,
        type: awsType,
        description: data.description,
      }),
    });

    if (!response.ok) {
        console.error(await response.json());
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating point:', error);
    throw error;
  }
}

export function getPinColor(type: PointType): string {
  switch (type) {
    case PointType.gida:
      return 'purple';
    case PointType.barinma:
      return 'blue';
    case PointType.tibbi_yardim:
      return 'green';
    case PointType.yikim:
      return 'orange';
    case PointType.insan:
      return 'red';
    case PointType.diger:
      return 'grey';
    default:
      return 'grey';
  }
}