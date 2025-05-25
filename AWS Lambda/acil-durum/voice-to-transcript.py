import json
import time
import boto3
import base64
from decimal import Decimal

# AWS clientlar
s3 = boto3.client('s3')
transcribe = boto3.client('transcribe')

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

def transcribe_audio(audio_path,save_path):
    job_name = f"transcribe-job-{int(time.time())}"
    job_uri = f"s3://{BUCKET_NAME}/{audio_path}"
    
    transcribe.start_transcription_job(
        TranscriptionJobName=job_name,
        Media={'MediaFileUri': job_uri},
        MediaFormat='wav',  # ses formatın neyse onu yaz
        LanguageCode='tr-TR',
        OutputBucketName=BUCKET_NAME,
        OutputKey= f"{save_path}/{job_name}.json"  # transcribe çıktısını S3'e yaz
    )
    
    return job_name


def lambda_handler(event, context):
    print(event)
    # yeni gelen ses dosyasını S3'ten al
    bucket = event['Records'][0]['s3']['bucket']['name']
    audio_path : str = event['Records'][0]['s3']['object']['key']
    user_name = audio_path.split('/')[1] # audios/4b6eae20d8f44f54ba62221a36efafa4/1748090305.wav example data
    print(audio_path, user_name)
    job_name = transcribe_audio(audio_path,f"transcripts/{user_name}")
    
    return generate_respond(
        {"job_name": job_name},
        "Transcription job started successfully",
        200
    )

