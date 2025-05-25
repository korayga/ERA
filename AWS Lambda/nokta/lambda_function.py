
from datetime import datetime
from decimal import Decimal
from geo_encoder import encode_geohash
import json
from db import DB
from enum import Enum
import traceback

# PointType Enum
class PointType(str, Enum):
    GIDA = "gida"
    BARINMA = "barinma"
    TIBBI_YARDIM = "tibbi_yardim"
    YIKINTI = "yikinti"
    INSAN = "insan"
    DIGER = "diger"


    @classmethod
    def list(cls):
        return [e.value for e in cls]

    @classmethod
    def from_string(cls, s: str):
        s = s.strip().lower()
        for item in cls:
            if item.value == s:
                return item
        raise ExceptionWithStatusCode(
            f"Geçersiz 'type' değeri: '{s}'. Geçerli değerler: {', '.join(cls.list())}", 400
        )


## json datasına cevirmek için encoder
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            if obj % 1 == 0:
                return int(obj)
            else:
                return float(obj)
        return super(DecimalEncoder, self).default(obj)

# lamda fonksiyonu API GATEWAY ile haberleşirken belirli bir yapıda veri döndermeli bu fonksyion bunu hallediyor
def generate_respond(data: dict, message: str, statusCode: int = 200, success: bool = True):
    responseData = {
        "data": data,
        "success": success,
        "message": message,
    }
    
    return {
        'statusCode': statusCode,
        'body': json.dumps(responseData, cls=DecimalEncoder),
        'headers': {
            "Access-Control-Allow-Origin": "*",
            'Content-Type': 'application/json',
        },
    }
class ExceptionWithStatusCode(Exception):
    
    def __init__(self,sebeb : str,statusCode : int) -> None:
        super().__init__(sebeb)
        self.statusCode = statusCode
        
db = DB("pk","sk","deprem",100)

# Lambda Handler
def lambda_handler(event : dict, context):

    precision = 6
    method = event.get('httpMethod')
    try:
        user_id = event.get('requestContext',{}).get('authorizer',{}).get('claims',{}).get('sub')  #claim altındaki cogento usernama çekme

        if method == 'POST':
            body = event.get('body', '{}')
            print("body: ",body)
            try:
                body = json.loads(body)
            except Exception:
                pass

            

            lat, lng = Decimal(str(body['lat'])), Decimal(str(body['lng']))
            point_type = PointType.from_string(body.get('type'))
            description=body["description"]
            ts = int(datetime.now().timestamp())  # milisaniye cinsinden timestamp

            # Geohash hesapla ve prefix sakla
            geohash = encode_geohash(lat, lng,precision = 6)

            # Partition key: POINT
            pk = "POINT" # point tablosunda işlem yapıyoruz
            # Sort Key = GEOHASH#USERID
            sk = f"{geohash}#{user_id}"

            # örnek veri tipi GERÇEĞİ TEMSİL ETMEZ
            item = {
                'pk': pk,
                'sk': sk,
                'lat': Decimal(str(lat)),
                'lng': Decimal(str(lng)),
                'type': point_type,
                'description':description,
                'timestamp': ts
            }
            respond = db.save(item)
            return generate_respond(respond, "Saved successfully", 200)

        elif method == 'GET':
            params = event.get('queryStringParameters') or {}
            lat = float(params['lat'])
            lng = float(params['lng'])
            radius = int(params['radius']) # client'den istediğimiz yarı çap

            if radius >= 6:
                raise ExceptionWithStatusCode("radius 6'dan büyük veya eşit olamaz", 400)

            # Merkez hash ve prefix
            print(f"{lat} {lng} noktasından {radius} yarıçapında veri isteniyor")

            center_hash = encode_geohash(lat, lng, precision)
            print(f"verilen noktanın hashi '{center_hash}'")

            prefixLenght = (precision-radius)
            prefix = center_hash[:prefixLenght]


            result = db.getBeginsWith("POINT",prefix) # nokta 
                

            return generate_respond(result, "returned successfully", 200)
        else:
            return generate_respond({}, "invalid HTTP request", 400)
    
    except ExceptionWithStatusCode as e:
        print(traceback.format_exc())
        return generate_respond({}, str(e), e.statusCode, False)

    except Exception as e:
        print(traceback.format_exc())
        return generate_respond({}, "Sunucu hatası oluştu", 500, False)