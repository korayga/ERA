from datetime import datetime
from decimal import Decimal
import json
import boto3
from geo_encoder import encode_geohash
from point_type import PointType
from db import DB

# AWS clientlar
s3 = boto3.client('s3')
bedrock_runtime = boto3.client(
    service_name='bedrock-runtime',
    region_name='eu-central-1'  # Claude'un mevcut olduğu region
)

db = DB("pk", "sk", "deprem", 100)

BUCKET_NAME = 'deprem-veri'

def call_claude(transcript_text):
    prompt = f"""
                Aşağıdaki ses kaydından alınan metni analiz et ve deprem sonrası yardım özeti üret:
                "{transcript_text}"

                bu verileri acil kurtarma ekipleri okuyacak, buna göre bir veri oluşturmaya özen göster

                Lütfen şu şekilde bir JSON döndür:
                {{
                    "aciklama": str, # genel durum açıklaması
                    "saglik_durum": ["iyi", "orta", "kötü", "acil"],
                    "konum_aciklama": str,
                    "kat": int?,
                }}
                """
    # Claude için request body hazırla
    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 500,
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ]
    }
    model_id = "anthropic.claude-3-sonnet-20240229-v1:0"
    # API çağrısı yap
    response = bedrock_runtime.invoke_model(
        body=json.dumps(body),
        modelId=model_id,
        accept='application/json',
        contentType='application/json'
    )
    
    # Response'u parse et
    response_body = json.loads(response.get('body').read())
    
    # Claude'un cevabını al
    claude_response = response_body['content'][0]['text']

    return claude_response

def get_transcript_from_s3(filename):
    response = s3.get_object(Bucket=BUCKET_NAME, Key=filename)
    transcript_text = response['Body'].read().decode('utf-8')
    transcript_json = json.loads(transcript_text)
    return transcript_json.get('results', {}).get('transcripts', [{}])[0].get('transcript', '')

def get_location_from_s3(filename):
    response = s3.get_object(Bucket=BUCKET_NAME, Key=filename)
    location_text = response['Body'].read().decode('utf-8')
    location_json = json.loads(location_text)
    return {"lat": Decimal(str(location_json.get('lat', 0))),
            "lng": Decimal(str(location_json.get('lng', 0)))}

def lambda_handler(event, context):
    precision = 6
    # yeni gelen transkript dosyasını S3'ten al
    bucket = event['Records'][0]['s3']['bucket']['name']
    transcript_path : str = event['Records'][0]['s3']['object']['key']
    transcript_text = get_transcript_from_s3(transcript_path)

    print("transkript ",transcript_text)
    # Yazıyı LLM'e gönder

    llm_result = call_claude(transcript_text)
    print(f"LLM response: {llm_result}")
    
    # JSON parsı, kullanıcıya temiz dönmek için
    try:
        llm_json = json.loads(llm_result)
    except:
        llm_json = {"raw": llm_result}  # parse edilemediyse ham text dön
    
    # kullanıcının son noktasını bulalım
    emergency_id = transcript_path.split("/")[1] # transcripts/hiddenoob/transcribe-job-1748115372.json example path
    print(transcript_path)
    print("emergency : ",emergency_id)
    lastLocation = get_location_from_s3(f"audios/{emergency_id}/location.json")
    print("last location: ", lastLocation)
    lat = lastLocation["lat"]
    lng = lastLocation["lng"]
    geohash = encode_geohash(lat, lng,precision)

    pk = "POINT"
    sk = f"{geohash}#{emergency_id}"

    item = {
        'pk': pk,
        'sk': sk,
        'lat': Decimal(str(lat)),
        'lng': Decimal(str(lng)),
        'type': "insan",
        'description': llm_json.get('aciklama', 'Açıklama bulunamadı'),
        'more_info': llm_json,  # LLM'den gelen tüm veriyi sakla
        'timestamp': int(datetime.now().timestamp()),
    }

    db.save(item)

    return item
    

