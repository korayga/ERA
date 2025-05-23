import boto3
from decimal import Decimal
from boto3.dynamodb.conditions import Key


dynamodb = boto3.resource('dynamodb', region_name='us-east-1')

# kendi yazmış olduğum DB ile veri yazıp okumak için bir class
class DB:

    def __init__(self,pk,sk,tableName,limit) -> None:

        self.table = dynamodb.Table(tableName)
        self.pk = pk
        self.sk = sk
        self.limit = limit


    # verilen json datasını yazar
    # PK ve SK verilmeli
    def save(self,payload):
        self.table.put_item(Item=payload)
        return payload


    # pk sk göndererek belirli veriyi getirir
    def get(self,pk,sk):
        response = self.table.get_item(Key={self.pk: pk, self.sk : sk})
        return response.get('Item',None)
    
    #pk yi verip sk sı belirli bir kelime ile başlayan elemanları getirir
    # örnek bir database tasarlayalım PK = "İL" SK = "OLAY_TİPİ#ID" olsun
    # pk = "ADANA" sk : "BINA_YIKIM#1245"
    # pk = "ADANA" sk : "YARDIM_KIYAFET#125645"
    # pk = "ADANA" sk : "YİYECEK_YARDIM#125341"
    # mesela "ADANA" pk'sını vererek ardından sk nın başlangıcını "BINA_YIKIM" olarak verirsek adana içindeki yıkılan binaları verir
    def getBeginsWith(self,pk,sk):
        response = self.table.query(
            KeyConditionExpression=Key(self.pk).eq(pk) & Key(self.sk).begins_with(sk)
        )
        return response.get('Items', None)


    def update_item(self,key, updates):
        
        update_expression = "SET "
        expression_attribute_values = {}

        # Güncellenmesi gereken her alan için dinamik bir update oluştur
        for idx, (field, value) in enumerate(updates.items()):
            update_expression += f"{field} = :val{idx}, "
            expression_attribute_values[f":val{idx}"] = value
        
        # Sonunda fazlalık virgülü kaldır
        update_expression = update_expression.rstrip(", ")

        response = self.table.update_item(
            Key={
                self.pk: key["pk"],
                self.sk: key["sk"]
            },
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues="ALL_NEW"
        )

        return response['Attributes']


    #PK SK vererek belirli objeyi sil
    def delete(self,pk,sk):
        response = self.table.delete_item(Key = {self.pk : pk , self.sk : sk} , ReturnValues='ALL_OLD')
        return response['Attributes']

    #PK altındaki bütün veriyi getir
    def getItemsWithPK(self,pk,exclusiveStartKey: dict = None ) -> tuple[list,str]:
        if exclusiveStartKey:
            response = self.table.query(
            KeyConditionExpression=Key(self.pk).eq(pk) ,
            ExclusiveStartKey=exclusiveStartKey,
            Limit=self.limit
            )
        else:
            response = self.table.query(
            KeyConditionExpression=Key(self.pk).eq(pk),
            Limit=self.limit
            )
        return (response.get("Items",[]),response.get("LastEvaluatedKey",None))
            