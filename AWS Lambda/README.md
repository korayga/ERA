
## API ile haberleşecek fonksiyon

- Sistem Şu şekilde çalışır.

- `Frontend -> AWS API Gateway -> AWS Lambda -> DynamoDB(noSQL)`
  
- tabikide api'ya doğrudan istek atmayı engellemeliyiz bu yüzden doğrulama sistemi olarak [AWS Cognitodan](https://aws.amazon.com/tr/cognito/) aldığınız tokeni kullanarak API'ye istek atacaksınız 
