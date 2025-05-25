import json
import time
import boto3
import base64
from decimal import Decimal

import uuid
import traceback

# AWS clientlar
s3 = boto3.client('s3')

BUCKET_NAME = 'deprem-veri'

# Decimal encoder
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            if obj % 1 == 0:
                return int(obj)
            else:
                return float(obj)
        return super(DecimalEncoder, self).default(obj)

def generate_respond(data : dict,message : str,statusCode : int = 200,success : bool = True):
    respondData = {"data" : data,"success" : success,"message" : message}
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


def handler(event):

    method = event.get('httpMethod')
    if method != "POST":
        raise ExceptionWithStatusCode("Invalid HTTP method", 400)
    body = json.loads(event['body'])
    voice = body.get("voice", None)

    if not voice:
        raise ExceptionWithStatusCode("Invalid voice data", 400)

    # Ses verisini al base64’den decode et
    audio_data = base64.b64decode(voice)
    current_location = body.get("location",None)
    print(current_location)
    current_location["lat"] = Decimal(str(current_location["lat"]))
    current_location["lng"] = Decimal(str(current_location["lng"]))

    
    emergencyID = uuid.uuid4().hex
    location_str = json.dumps(current_location, cls=DecimalEncoder)
    
    s3.put_object(
        Bucket=BUCKET_NAME,
        Key=f"audios/{emergencyID}/location.json",
        Body=location_str,
        ContentType='application/json'
    )

    # S3 key oluştur
    filename = f"audios/{emergencyID}/{int(time.time())}.wav"
    s3.put_object(
        Bucket=BUCKET_NAME,
        Key=filename,
        Body=audio_data,
        ContentType='audio/wav'
    )
    print(f"Audio file uploaded to S3: {filename}")
    return generate_respond({"voice_path" : filename}, "Audio file uploaded successfully", 200)


def lambda_handler(event, context):
    try:
        return handler(event)
    except ExceptionWithStatusCode as e:
        return generate_respond({}, str(e), e.statusCode, success=False)
    except Exception as e:
        print(traceback.format_exc())
        return generate_respond({}, "Internal server error: "+str(e), 500, success=False)
