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
	"strconv"
	"time"
)

var (
	secrets  = map[string]string{}
	counters = map[string]int64{}
)

const (
	digits    = 8
	algorithm = "SHA512"
	period    = 30
)

func main() {
	http.HandleFunc("/uri", func(writer http.ResponseWriter, request *http.Request) {
		defer request.Body.Close()
		email := request.URL.Query().Get("email")
		otpType := request.URL.Query().Get("type")
		secret := secrets[email]
		if secret == "" {
			secret = generateSecret()
			secrets[email] = secret
		}
		m := map[string]string{
			"url": buildURI(secret, email, otpType),
		}
		b, _ := json.Marshal(m)
		writer.WriteHeader(http.StatusOK)
		writer.Write(b)
	})
	http.HandleFunc("/verify", func(writer http.ResponseWriter, request *http.Request) {
		defer request.Body.Close()
		body := parseBody(request.Body)
		code := body["code"]
		email := body["email"]
		otpType := func() string {
			if body["type"] == "" {
				return "totp"
			}
			return body["type"]
		}()
		result := false
		if otpType == "totp" {
			result = verifyTOTP(secrets[email], code)
		} else {
			result = verifyHOTP(secrets[email], code)
		}
		if !result {
			writer.WriteHeader(http.StatusBadRequest)
			return
		}
		writer.WriteHeader(http.StatusOK)
	})
	http.ListenAndServe("0.0.0.0:8080", nil)
}

func parseBody(body io.ReadCloser) map[string]string {
	data, err := io.ReadAll(body)
	if err != nil {
		panic(err)
	}
	m := map[string]string{}
	json.Unmarshal(data, &m)
	return m
}

func genTOTP(secret string) string {
	return generatePassword(secret, time.Now().Unix()/period)
}

func genHOTP(secret string) string {
	return generatePassword(secret, counters[secret])
}

func verifyTOTP(secret, code string) bool {
	return genTOTP(secret) == code
}

func verifyHOTP(secret, code string) bool {
	result := genHOTP(secret) == code
	if result {
		counters[secret]++
	}
	return result
}

func generateSecret() string {
	key := make([]byte, 10)
	n, err := rand.Read(key)
	if err != nil {
		panic(err)
	}
	return base32.StdEncoding.EncodeToString(key[:n])
}

func ITob(integer int64) []byte {
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
	hash.Write(ITob(counter))
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

func buildURI(key, email, otpType string) string {
	if otpType == "" {
		otpType = "totp"
	}
	q := url.Values{}
	q.Set("secret", key)
	q.Set("algorithm", algorithm)
	q.Set("digits", strconv.Itoa(digits))
	q.Set("issuer", "PPG007")
	if otpType == "totp" {
		q.Set("period", strconv.Itoa(period))
	} else {
		q.Set("counter", fmt.Sprintf("%d", counters[key]))
	}
	u := url.URL{
		RawQuery: q.Encode(),
		Scheme:   "otpauth",
		Host:     otpType,
		Path:     url.PathEscape(email),
	}
	return u.String()
}
