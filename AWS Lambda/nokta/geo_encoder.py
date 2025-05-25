# Basit Geohash Encode Fonksiyonu
_base32 = '0123456789bcdefghjkmnpqrstuvwxyz'

def encode_geohash(lat, lon, precision=32):
    lat_interval, lon_interval = [-90.0, 90.0], [-180.0, 180.0]
    geohash = []
    is_even, bit, ch = True, 0, 0
    while len(geohash) < precision:
        if is_even:
            mid = sum(lon_interval) / 2
            if lon > mid:
                ch |= 1 << (4 - bit)
                lon_interval[0] = mid
            else:
                lon_interval[1] = mid
        else:
            mid = sum(lat_interval) / 2
            if lat > mid:
                ch |= 1 << (4 - bit)
                lat_interval[0] = mid
            else:
                lat_interval[1] = mid
        is_even = not is_even
        if bit < 4:
            bit += 1
        else:
            geohash.append(_base32[ch])
            bit, ch = 0, 0
    return ''.join(geohash)
