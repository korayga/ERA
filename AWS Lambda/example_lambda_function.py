import json
from decimal import Decimal 
import os
import uuid
import traceback

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
def respond(response : dict,statusCode : int = 200,err : Exception = None):

    return {
        'statusCode': '400' if err else '200',
        'body':  json.dumps({"error" : str(err)}) if err else json.dumps(response, cls =DecimalEncoder), 
        'headers': {
            "Access-Control-Allow-Origin" : "*",
            'Content-Type': 'application/json',
        },
    }
    
class ExceptionWithStatusCode(Exception):
    
    def __init__(self,sebeb : str,statusCode : int) -> None:
        super().__init__(sebeb)
        self.statusCode = statusCode

def lambda_handler(event, context):
    dynamo = DB("COMPANY_UUID#TABLE_UUID","ITEM_UUID#EPOCH","cageSuite",limit = int(os.environ.get('pagination_limit')))
    currentTime = event['requestContext']['requestTimeEpoch'] # GMT
    parse_float=Decimal
    body = json.loads(event["body"]) if event["body"] else None

    pathParameters = event.get("pathParameters",None)
    operation = event['httpMethod']
    path = event["resource"]
    apiRespond = None
    lastEvaulatedKey = 0

    error = None
    try:
        
        if path == "/{companyName}/calculation":
            if operation == "POST":

                a1_result, a2_result, a3_result = calculateCarbons(body['A1'], body['A2'], body['A3'])
                
                body['A1EF'] = a1_result
                body['A2EF'] = a2_result
                body['A3EF'] = a3_result
                body[dynamo.pk] = f"{pathParameters['companyName']}#RESULT"
                body[dynamo.sk] = f"{uuid.uuid4()}#{currentTime}"
                body['updatedTime'] = currentTime

                body = json.loads(json.dumps(body), parse_float=Decimal)

                apiRespond = dynamo.save(body)


        elif path == "/{companyName}/material":
            if operation == "POST":

                body = json.loads(json.dumps(body), parse_float=Decimal)

                body[dynamo.pk] = f"{pathParameters['companyName']}#MATERIAL"
                body[dynamo.sk] = f"{uuid.uuid4()}#{currentTime}"
                apiRespond = dynamo.save(body)
            elif operation == "GET":
                apiRespond,lastEvaulatedKey = dynamo.getItemsWithPK(f"{pathParameters["companyName"]}#MATERIAL")
            elif operation == "DELETE":
                apiRespond = dynamo.delete(f"{pathParameters["companyName"]}#MATERIAL",body["sk"])
        elif path == "/{companyName}/material/{id}":
            apiRespond = dynamo.getBeginsWith(f"{pathParameters["companyName"]}#MATERIAL",pathParameters['ITEM_UUID#EPOCH'])

        elif path == "/{companyName}/result":
            if operation == "GET":
                apiRespond, lastEvaulatedKey = dynamo.getItemsWithPK(f"{pathParameters["companyName"]}#RESULT")
            elif operation == "DELETE":
                apiRespond = dynamo.delete(f"{pathParameters["companyName"]}#RESULT", body["sk"])
            elif operation == "PATCH":
                    
                A1EF, A2EF, A3EF = calculateCarbons(body['A1'], body['A2'], body['A3'])
                body['A1EF'] = A1EF
                body['A2EF'] = A2EF
                body['A3EF'] = A3EF
                body['updatedTime'] = currentTime
                
                
                pk = f"{pathParameters['companyName']}#RESULT"
                sk = body['ITEM_UUID#EPOCH']
                del body['ITEM_UUID#EPOCH']
                del body['COMPANY_UUID#TABLE_UUID']
                body = json.loads(json.dumps(body), parse_float=Decimal)
                apiRespond = dynamo.update_item({"pk": pk, "sk": sk}, body)

        if apiRespond is None:
            raise ExceptionWithStatusCode("Unsupported Method", 400)
    
    except ExceptionWithStatusCode as e:
        traceback.print_exc()
        error = e
    except Exception as e:
        traceback.print_exc()
        error = ExceptionWithStatusCode(str(e), 500)
    finally:
        if error:
            traceback.print_exc()
            return respond(statusCode=error.statusCode if error else 200, response=None, err=error)
    
    if lastEvaulatedKey != 0:
        return respond({"data" : apiRespond, "lastEvaulatedKey" : lastEvaulatedKey})
    else:
        return respond({"data" : apiRespond})
          
    
    
    
def calculateCarbons(A1,A2,A3):
    usedMaterials = {item['material']['ITEM_UUID#EPOCH'] : item['material'] for item in A1}
    
    def calculateA1(data):
        material = data["material"]
        return material["ef"] * data["quantity"]

    def calculateA2(material_id, data_list):

        material = usedMaterials[material_id]

        print(data_list)
        total_ef = 0
        for data in data_list:
            usedTransportation = data["transportation"]
            distance = data["distance"]
            ef = material["ef"]
            if usedTransportation == "road":
                total_ef += ef * distance * 2.20462
            elif usedTransportation == "rail":
                total_ef += ef * distance * 0.5432
            elif usedTransportation == "sea":
                total_ef += ef * distance * 0.1344
            elif usedTransportation == "air":
                total_ef += ef * distance * 3.3255
        return total_ef

    def calculateA3(data):
        diesel = data["diesel"]
        renewable_ratio = data["electricityRenewableRatio"] / 100
        electricity_kWh = data["electricity"]
        natural_gas = data["naturalGas"]
        return diesel * 2.68 + electricity_kWh * (1 - renewable_ratio) * 0.233 + natural_gas * 2.05

    a1_result = sum(calculateA1(data) for data in A1)
    a2_result = sum(calculateA2(material_id, data_list) for material_id, data_list in A2.items())
    a3_result = calculateA3(A3)
    
    return a1_result, a2_result, a3_result