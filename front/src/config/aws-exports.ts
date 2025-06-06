// my-deprem-yardim-app/config/aws-exports.ts
const awsmobile = {
    "aws_project_region": "eu-central-1", // Kendi AWS bölgeniz
    "aws_cognito_region": "eu-central-1", // Kendi Cognito bölgeniz
    "aws_user_pools_id": "eu-central-1_VQNnzbDb2", 
    "aws_user_pools_web_client_id": "7pvee82vhs5dl1ch4d48jfcvhl", 
    "oauth": {
        "domain": "eu-central-1vqnnzbdb2.auth.eu-central-1.amazoncognito.com", // <-- Senin Cognito Hosted UI Domain'in (eğer kullanacaksan)
        "scope": [
            "phone",
            "email",
            "openid",
            "profile",
            "aws.cognito.signin.user.admin"
        ],
        // Expo Go için genellikle `exp://127.0.0.1:19000/--/auth` veya Expo CLI çıktısında görünen URL
        // Eğer `app.json`'da `scheme` belirlediyseniz: `your_app_scheme://auth` (Örn: `my_deprem_app://auth`)
        "redirectSignIn": "exp://127.0.0.1:19000/--/auth",
        "redirectSignOut": "exp://127.0.0.1:19000/--/logout",
        "responseType": "code" // Authorization Code Grant için "code"
    },
    "federationTarget": "COGNITO_USER_POOLS",
    "aws_cloud_logic_custom": [ // API Gateway endpoint'lerinizi buraya ekleyin
        {
            "name": "depremApi", // API Gateway'deki API'nızın adı (Lambda ile bağlı olan)
            "endpoint": "https://yqu8uvgelk.execute-api.eu-central-1.amazonaws.com/v1", // <-- Senin API Gateway endpoint'in
            "region": "eu-central-1"
        }
    ]
};

export default awsmobile;