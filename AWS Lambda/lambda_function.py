# Haversine Mesafe Hesaplama
from datetime import datetime
from decimal import Decimal
from geo_encoder import encode_geohash
import json
from db import DB


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
def generate_respond(data : dict,message : str,statusCode : int = 200,err : Exception = None):
    
    respondData = {"data" : data,"success" : not bool(err),"message" : message}
    
    if err:
        respondData["error"] = err.__str__()
        

    return {
        'statusCode': statusCode,
        'body':  json.dumps(respondData, cls =DecimalEncoder), 
        'headers': {
            "Access-Control-Allow-Origin" : "*",
            'Content-Type': 'application/json',
        },
    }
    
class ExceptionWithStatusCode(Exception):
    
    def __init__(self,sebeb : str,statusCode : int) -> None:
        super().__init__(sebeb)
        self.statusCode = statusCode
        
db = DB("pk","sk","deprem",100)

# Lambda Handler
def lambda_handler(event, context):

    precision = 12
    method = event.get('httpMethod')

    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        lat, lng = float(body['lat']), float(body['lng'])
        point_type, user_id = body['type'], body['userId'] # user id'yi cognitodan alıcaz şuanlık böyle kalıcak
        ts = int(datetime.utcnow().timestamp() * 1000)

        # Geohash hesapla ve prefix sakla
        geohash = encode_geohash(lat, lng)

        # Partition key: POINT
        pk = "POINT" # point tablosunda işlem yapıyoruz
        # Sort Key = GEOHASH#TIMESTAMP#USERID
        sk = f"{geohash}#{ts}#{user_id}"

        # örnek veri tipi GERÇEĞİ TEMSİL ETMEZ
        item = {
            'pk': pk,
            'sk': sk,
            'lat': Decimal(str(lat)),
            'lng': Decimal(str(lng)),
            'type': point_type,
        }
        respond = db.save(item)
        return generate_respond(respond, "Saved successfully", 200)

    elif method == 'GET':
        params = event.get('queryStringParameters') or {}
        lat = float(params['lat'])
        lng = float(params['lng'])
        radius = int(params['radius']) # client'den istediğimiz yarı çap

        # Merkez hash ve prefix
        print(f"{lat} {lng} noktasından {radius} yarıçapında veri isteniyor")

        center_hash = encode_geohash(lat, lng, precision)
        print(f"verilen noktanın hashi '{center_hash}'")

        prefixLenght = (precision-radius)
        prefix = center_hash[:prefixLenght]


        result = db.getBeginsWith("POINT",prefix) # nokta 
            

        return generate_respond(result, "returned successfully", 200)

    return generate_respond({}, "invalid HTTP request", 400)