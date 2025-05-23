# Tablo Şeması

## pk = "POINT"
### point tablosu için sk şeması
- `Sort Key = GEOHASH#TIMESTAMP#USERID` 
- geohash dynamodb için verimli bir fonksiyonu çalıştırmayı elverişli hale getirir
- dynamo dbde .startsWith diye bir fonksyion var geohash yakın noktalar için stringlerin başı aynı geliyor
- ## geohash imzası
- `def encode_geohash(latitude, longitude , precision=6):`
- latitude x koordinatı
- longitude y koordinatı denilebilir.
- precision ise koordinatları temsil etmek için gereken harf sayısı
- ben projemiz için 12 karakterin yeterli olduğuna karar verdim
- ## geohash için örnek veriler
- `print(encode_geohash(20,20,12)) = "s7w1z0gs3y0z"
    print(encode_geohash(20.5,20,12)) = "s7whx5gt1ubz"
    print(encode_geohash(21,20,12)) = "s7wprngtcg8z"
    print(encode_geohash(20,20.5,12)) = "s7w9f2zskw5z"
    print(encode_geohash(20,21,12)) = "s7wcvbgsrqnz"
    print(encode_geohash(25,20,12)) = "skqnpp5e9cbb"`
- hash çıktısını incelerseniz yakın noktalar için ilk iki karakter aynıdır
- ancak son çıktının ikinci harfi değişiklik göstermiştir
- bu hash fonksiyonu aslında dünyayı parçalara bölüyormuş gibi düşünülebilir
- precision ise parçanın büyüklüğü gibi düşünülebilir, ne kadar büyük precision o kadar küçük dünya parçaları
- böylece doğrudan dünyadaki bir bölgeden noktaları getirebiliriz