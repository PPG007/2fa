package main

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha512"
	"encoding/base32"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"time"
)

var secrets = map[string]string{}

const digits = 7

func main() {
	http.HandleFunc("/uri", func(writer http.ResponseWriter, request *http.Request) {
		defer request.Body.Close()
		email := request.URL.Query().Get("email")
		secret := secrets[email]
		if secret == "" {
			secret = generateSecret()
			secrets[email] = secret
		}
		m := map[string]string{
			"uri": buildURI(secret, email),
		}
		b, _ := json.Marshal(m)
		writer.WriteHeader(http.StatusOK)
		writer.Write(b)
	})
	http.HandleFunc("/verify", func(writer http.ResponseWriter, request *http.Request) {
		defer request.Body.Close()
		data, err := io.ReadAll(request.Body)
		if err != nil {
			writer.WriteHeader(http.StatusBadRequest)
			return
		}
		m := map[string]string{}
		json.Unmarshal(data, &m)
		code := m["code"]
		email := m["email"]
		if !verify(secrets[email], code) {
			writer.WriteHeader(http.StatusBadRequest)
			return
		}
		writer.WriteHeader(http.StatusOK)
	})
	http.ListenAndServe("0.0.0.0:8080", nil)
}

func genTOTP(secret string) string {
	return generatePassword(secret, time.Now().Unix()/30)
}

func verify(secret, code string) bool {
	return genTOTP(secret) == code
}

func generateSecret() string {
	key := make([]byte, 10)
	n, err := rand.Read(key)
	if err != nil {
		panic(err)
	}
	return base32.StdEncoding.EncodeToString(key[:n])
}

func Itob(integer int64) []byte {
	byteArr := make([]byte, 8)
	for i := 7; i >= 0; i-- {
		byteArr[i] = byte(integer & 0xff)
		integer = integer >> 8
	}
	return byteArr
}

func generatePassword(key string, counter int64) string {
	rawKey, err := base32.StdEncoding.DecodeString(key)
	if err != nil {
		panic(err)
	}
	hash := hmac.New(sha512.New, rawKey)
	hash.Write(Itob(counter))
	result := hash.Sum(nil)
	// 0<= offset <= 15
	offset := int(result[len(result)-1]) & 0xf
	code := ((int(result[offset]) & 0x7f) << 24) |
		((int(result[offset+1] & 0xff)) << 16) |
		((int(result[offset+2] & 0xff)) << 8) |
		(int(result[offset+3]) & 0xff)
	code = code % int(math.Pow10(digits))
	return fmt.Sprintf(fmt.Sprintf("%%0%dd", digits), code)
}

func buildURI(key, email string) string {
	q := url.Values{}
	q.Set("secret", key)
	q.Set("algorithm", "SHA512")
	q.Set("digits", fmt.Sprintf("%d", digits))
	q.Set("period", "30")
	q.Set("issuer", "PPG007")
	u := url.URL{
		RawQuery: q.Encode(),
		Scheme:   "otpauth",
		Host:     "totp",
		Path:     url.PathEscape(email),
	}
	return u.String()
}
